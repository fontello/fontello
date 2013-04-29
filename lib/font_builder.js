'use strict';


var os         = require('os');
var path       = require('path');
var fs         = require('fs');
var fstools    = require('fs-tools');
var execFile   = require('child_process').execFile;
var async      = require('async');
var crypto     = require('crypto');
var fontConfig = require('./font_config');


// State control variables. Initialized at first use.
//
var builderInitialized = false;
var builderVersion     = null;
var builderLogger      = null;
var builderCwdDir      = null;
var builderTmpDir      = null;
var builderResultDir   = null;
var builderBinary      = null;
var builderQueue       = null;
var builderTasks       = null;


// Returns unique identifier for requested list of glyphs.
//
function getFontId(config) {
  var hash = crypto.createHash('md5');

  hash.update('fontello' + builderVersion);
  hash.update(JSON.stringify(config));

  return hash.digest('hex');
}


function getResultFilename(fontId) {
  var firstDir  = fontId.substr(0, 2)
    , secondDir = fontId.substr(2, 2);

  return path.join(firstDir, secondDir, ('fontello-' + fontId + '.zip'));
}



// Working procedure for the builder queue.
//
function handleTask(task, callback) {
  var logPrefix = '[font::' + task.fontId + ']'
    , timeStart = Date.now()
    , workplan  = [];

  builderLogger.info('%s Start generation: %j', logPrefix, task.config.session);

  //
  // Prepare the workplan.
  //
  workplan.push(async.apply(fstools.remove, task.tmpDir));
  workplan.push(async.apply(fstools.mkdir, task.tmpDir));
  workplan.push(async.apply(fs.writeFile,
                            path.join(task.tmpDir, 'config.json'),
                            JSON.stringify(task.config.session, null, '  '),
                            'utf8'));

  // Write full config immediately, to avoid app exec from shell script
  // `log4js` has races with locks on multiple copies run,
  workplan.push(async.apply(fs.writeFile,
                            path.join(task.tmpDir, 'generator-config.json'),
                            JSON.stringify(fontConfig(task.config.session), null, '  '),
                            'utf8'));

  workplan.push(async.apply(execFile,
                            builderBinary,
                            [ task.config.font.fontname, task.tmpDir, task.zipball ],
                            { cwd: builderCwdDir }));

  workplan.push(async.apply(fstools.remove, task.tmpDir));

  //
  // Execute the workplan.
  //
  async.series(workplan, function (err) {
    if (err) {
      builderLogger.error('%s %s', logPrefix, err.stack || err.message || err.toString());
      callback(err);
      return;
    }

    var timeEnd = Date.now();

    builderLogger.info('%s Generated in %dms (real: %dms)',
                       logPrefix,
                       (timeEnd - timeStart) / 1000,
                       (timeEnd - task.timestamp) / 1000);
    callback();
  });
}


function addTask(config, callback) {
  var task, fontId = getFontId(config);

  // If task already exists - just register a new callback on it.
  if (builderTasks.hasOwnProperty(fontId)) {
    builderLogger.info('Job is already in queue: %j', {
      font_id:      fontId
    , queue_length: Object.keys(builderTasks).length
    });

    task = builderTasks[fontId];

    if (callback) {
      task.callbacks.push(callback);
    }

    return task;
  }

  task = {
    fontId:    fontId
  , config:    config
  , tmpDir:    path.join(builderTmpDir, 'fontello-' + fontId)
  , zipball:   path.join(builderResultDir, getResultFilename(fontId))
  , timestamp: Date.now()
  , callbacks: []
  };

  fs.exists(task.zipball, function (exists) {
    if (exists) {
      return; // Already done - do nothing;
    }

    builderTasks[fontId] = task;

    builderQueue.push(task, function (err) {
      var task = builderTasks[fontId];

      delete builderTasks[fontId];

      task.callbacks.forEach(function (func) { func(err, task); });
    });

    builderLogger.info('New job created: %j', {
      font_id:      fontId
    , queue_length: Object.keys(builderTasks).length
    });
  });

  return task;
}


function getTask(fontId) {
  return builderTasks[fontId] || null;
}


function checkResult(fontId, callback) {
  var filename = getResultFilename(fontId)
    , filepath = path.join(builderResultDir, filename);

  fs.exists(filepath, function (exists) {
    if (exists) {
      callback(filename, builderResultDir);
    } else {
      callback(null);
    }
  });
}


function setup(N) {
  var builderConcurrency = N.config.options.builder_concurrency || os.cpus().length;

  builderVersion   = N.runtime.version;
  builderLogger    = N.logger.getLogger('font');
  builderTmpDir    = path.join(os.tmpDir(), 'fontello');
  builderCwdDir    = N.runtime.mainApp.root;
  builderResultDir = path.join(N.runtime.mainApp.root, 'public', 'download');
  builderBinary    = path.join(N.runtime.mainApp.root, 'bin', 'generate_font.sh');
  builderQueue     = async.queue(handleTask, builderConcurrency);
  builderTasks     = {};

  builderInitialized = true;
}


module.exports = function (N) {
  if (!builderInitialized) {
    setup(N);
  }

  return {
    addTask:     addTask
  , getTask:     getTask
  , checkResult: checkResult
  , resultDir:   builderResultDir
  };
};
