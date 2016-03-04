'use strict';


var _          = require('lodash');
var os         = require('os');
var path       = require('path');
var fs         = require('fs');
var mz         = require('mz');
var async      = require('async');
var crypto     = require('crypto');
var fontConfig = require('./config');
var fontWorker = require('./worker');


var BUILDER_CONCURRENCY = 1; // Number of concurrenly builded fonts.


// State control variables. Initialized at first use.
//
var builderVersion     = null;
var builderLogger      = null;
var builderCwdDir      = null;
var builderTmpDir      = null;
var builderOutputDir   = null;
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
  var firstDir  = fontId.substr(0, 2),
      secondDir = fontId.substr(2, 2);

  return path.join(firstDir, secondDir, (fontId + '.zip'));
}


// (internal) Push new font building task into queue and return
// `fontId`. Make sure, that task is not duplicated. If we can
// return result immediately - do it.
//
function createTask(clientConfig, afterRegistered, afterComplete) {
  var builderConfig = fontConfig(clientConfig),
      fontId        = getFontId(clientConfig),
      outputName    = getOutputName(fontId),
      outputFile    = path.join(builderOutputDir, outputName),
      taskInfo      = null;

  if (!builderConfig || builderConfig.glyphs.length <= 0) {
    if (afterRegistered) {
      afterRegistered('Invalid config.');
    }
    if (afterComplete) {
      afterComplete('Invalid config.');
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
        afterComplete(null, { fontId, file: outputFile, directory: builderOutputDir });
      }
      return;
    }

    //
    // If task already exists - just register a new callback on it.
    //
    // NOTE: We must do this *after* async `fs.exists` call to prevent creation
    // of multiple tasks for one font when user very quickly sends multiple
    // requests for same font. Multiple tasks for same font will cause an error
    // in `completeCallback`. (referencing already completed and deleted task)
    //
    if (_.has(builderTasks, fontId)) {
      builderLogger.info('Job is already in queue: %j', {
        font_id:      fontId,
        queue_length: Object.keys(builderTasks).length
      });

      taskInfo = builderTasks[fontId];

      if (afterRegistered) {
        afterRegistered(null, fontId);
      }
      if (afterComplete) {
        taskInfo.callbacks.push(afterComplete);
      }
      return;
    }

    //
    // Otherwise, create a new task.
    //
    taskInfo = {
      fontId,
      clientConfig,
      builderConfig,
      cwdDir:        builderCwdDir,
      tmpDir:        path.join(builderTmpDir, 'fontello-' + fontId.substr(0, 8)),
      output:        outputFile,
      timestamp:     Date.now(),
      callbacks:     [],
      logger:        builderLogger
    };

    if (afterComplete) {
      taskInfo.callbacks.push(afterComplete);
    }

    builderTasks[fontId] = taskInfo;
    builderQueue.push(taskInfo, function (err) {
      var callbacks = builderTasks[fontId].callbacks;

      delete builderTasks[fontId];

      callbacks.forEach(function (func) {
        func(err, { fontId, file: outputFile, directory: builderOutputDir });
      });
    });

    builderLogger.info('New job created: %j', {
      font_id:      fontId,
      queue_length: Object.keys(builderTasks).length
    });

    if (afterRegistered) {
      afterRegistered(null, fontId);
    }
  });
}


// Push new build task (config) to queue
// and return `fontId` immediately
//
function pushFont(clientConfig) {
  return new Promise((resolve, reject) => {
    createTask(clientConfig, (err, fontId) => {
      if (err) reject(err);
      else resolve(fontId);
    }, null);
  });
}


// Push new build task (config) to queue
// and return `fontId` when compleete
//
function buildFont(clientConfig) {
  return new Promise((resolve, reject) => {
    createTask(clientConfig, null, (err, info) => {
      if (err) reject(err);
      else resolve(info);
    });
  });
}


// Check if font generation complete. Returns
//
// {
//   pending,   // true if still in queue
//   file,      // file path from download root
//   directory  // dowload root
// }
//
function checkFont(fontId) {

  // Check task pool first, to avoid fs kick
  // & make sure that file not partially written
  //
  if (_.has(builderTasks, fontId)) return Promise.resolve({ pending: true });

  // Ok, we have chance. Check if result exists on disk
  let filename = getOutputName(fontId);
  let filepath = path.join(builderOutputDir, filename);

  return mz.fs.exists(filepath)
    .then(exists => {
      if (exists) return { pending: false, file: filename, directory: builderOutputDir };
      return null;
    });
}


module.exports = _.once(function (N) {
  // Init internals at first call.
  builderVersion   = N.version_hash;
  builderLogger    = N.logger.getLogger('font');
  builderTmpDir    = path.join(os.tmpDir(), 'fontello');
  builderCwdDir    = N.mainApp.root;
  builderOutputDir = path.join(N.mainApp.root, 'download');
  builderQueue     = async.queue(fontWorker, BUILDER_CONCURRENCY);
  builderTasks     = {};

  // Exports.
  return { pushFont, buildFont, checkFont };
});
