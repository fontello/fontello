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
var builderOutputDir   = null;
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


function getOutputName(fontId) {
  var firstDir  = fontId.substr(0, 2)
    , secondDir = fontId.substr(2, 2);

  return path.join(firstDir, secondDir, (fontId + '.zip'));
}



// Working procedure for the builder queue.
//
function handleTask(taskInfo, callback) {
  var logPrefix = '[font::' + taskInfo.fontId + ']'
    , timeStart = Date.now()
    , workplan  = [];

  builderLogger.info('%s Start generation: %j', logPrefix, taskInfo.clientConfig);

  //
  // Prepare the workplan.
  //
  workplan.push(async.apply(fstools.remove, taskInfo.tmpDir));
  workplan.push(async.apply(fstools.mkdir, taskInfo.tmpDir));
  workplan.push(async.apply(fs.writeFile,
                            path.join(taskInfo.tmpDir, 'config.json'),
                            JSON.stringify(taskInfo.clientConfig, null, '  '),
                            'utf8'));

  // Write full config immediately, to avoid app exec from shell script
  // `log4js` has races with locks on multiple copies run,
  workplan.push(async.apply(fs.writeFile,
                            path.join(taskInfo.tmpDir, 'generator-config.json'),
                            JSON.stringify(taskInfo.builderConfig, null, '  '),
                            'utf8'));

  workplan.push(async.apply(execFile,
                            builderBinary,
                            [ taskInfo.builderConfig.font.fontname, taskInfo.tmpDir, taskInfo.output ],
                            { cwd: builderCwdDir }));

  workplan.push(async.apply(fstools.remove, taskInfo.tmpDir));

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
                       (timeEnd - taskInfo.timestamp) / 1000);
    callback();
  });
}


// Ensures font described by `clientConfig` is added to processing queue or
// already built.
// 
function createTask(clientConfig, afterRegistered, afterComplete) {
  var builderConfig = fontConfig(clientConfig)
    , fontId        = getFontId(builderConfig)
    , outputName    = getOutputName(fontId)
    , outputFile    = path.join(builderOutputDir, outputName)
    , taskInfo      = null;

  if (!builderConfig || 0 >= builderConfig.glyphs.length) {
    if (afterRegistered) {
      afterRegistered('Invalid config.', null);
    }
    if (afterComplete) {
      afterComplete('Invalid config.', null, null);
    }
    return;
  }

  //
  // If task already exists - just register a new callback on it.
  //
  if (builderTasks.hasOwnProperty(fontId)) {
    builderLogger.info('Job is already in queue: %j', {
      font_id:      fontId
    , queue_length: Object.keys(builderTasks).length
    });

    taskInfo = builderTasks[fontId];

    if (afterComplete) {
      taskInfo.callbacks.push(afterComplete);
    }
    if (afterRegistered) {
      afterRegistered(null, fontId);
    }
    return;
  }

  //
  // If same task is already done (the result file exists) - use it.
  //
  fs.exists(outputFile, function (exists) {
    if (exists) {
      if (afterRegistered) {
        afterRegistered(null, fontId);
      }
      if (afterComplete) {
        afterComplete(null, outputName, builderOutputDir);
      }
      return;
    }

    //
    // Otherwise, create a new task.
    //
    taskInfo = {
      fontId:        fontId
    , clientConfig:  clientConfig
    , builderConfig: builderConfig
    , tmpDir:        path.join(builderTmpDir, 'fontello-' + fontId)
    , output:        outputFile
    , timestamp:     Date.now()
    , callbacks:     []
    };

    if (afterComplete) {
      taskInfo.callbacks.push(afterComplete);
    }

    builderTasks[fontId] = taskInfo;
    builderQueue.push(taskInfo, function (err) {
      var callbacks = builderTasks[fontId].callbacks;

      delete builderTasks[fontId];

      callbacks.forEach(function (func) {
        func(err, outputName, builderOutputDir);
      });
    });

    builderLogger.info('New job created: %j', {
      font_id:      fontId
    , queue_length: Object.keys(builderTasks).length
    });

    if (afterRegistered) {
      afterRegistered(null, fontId);
    }
  });
}


function pushFont(clientConfig, callback) {
  createTask(clientConfig, callback, null);
}


function buildFont(clientConfig, callback) {
  createTask(clientConfig, null, callback);
}


function findTask(fontId, callback) {
  if (builderTasks.hasOwnProperty(fontId)) {
    callback(null, builderTasks[fontId]);
  } else {
    callback(null, null);
  }
}


function checkResult(fontId, callback) {
  var filename = getOutputName(fontId)
    , filepath = path.join(builderOutputDir, filename);

  fs.exists(filepath, function (exists) {
    if (exists) {
      callback(filename, builderOutputDir);
    } else {
      callback(null, null);
    }
  });
}


function setup(N) {
  var builderConcurrency = N.config.options.builder_concurrency || os.cpus().length;

  builderVersion   = N.runtime.version;
  builderLogger    = N.logger.getLogger('font');
  builderTmpDir    = path.join(os.tmpDir(), 'fontello');
  builderCwdDir    = N.runtime.mainApp.root;
  builderOutputDir = path.join(N.runtime.mainApp.root, 'public', 'download');
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
    pushFont:    pushFont
  , buildFont:   buildFont
  , findTask:    findTask
  , checkResult: checkResult
  , outputDir:   builderOutputDir
  };
};
