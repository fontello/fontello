'use strict';


var _          = require('lodash');
var os         = require('os');
var path       = require('path');
var fs         = require('fs');
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


// (internal) Push new font building task into queue and return
// `fontId`. Make sure, that task is not duplicated. If we can
// return result immediately - do it.
// 
function createTask(clientConfig, afterRegistered, afterComplete) {
  var builderConfig = fontConfig(clientConfig)
    , fontId        = getFontId(clientConfig)
    , outputName    = getOutputName(fontId)
    , outputFile    = path.join(builderOutputDir, outputName)
    , taskInfo      = null;

  if (!builderConfig || 0 >= builderConfig.glyphs.length) {
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
        afterComplete(null, { fontId: fontId, file: outputFile, directory: builderOutputDir });
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
        font_id:      fontId
      , queue_length: Object.keys(builderTasks).length
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
      fontId:        fontId
    , clientConfig:  clientConfig
    , builderConfig: builderConfig
    , cwdDir:        builderCwdDir
    , tmpDir:        path.join(builderTmpDir, 'fontello-' + fontId.substr(0, 8))
    , output:        outputFile
    , timestamp:     Date.now()
    , callbacks:     []
    , logger:        builderLogger
    };

    if (afterComplete) {
      taskInfo.callbacks.push(afterComplete);
    }

    builderTasks[fontId] = taskInfo;
    builderQueue.push(taskInfo, function (err) {
      var callbacks = builderTasks[fontId].callbacks;

      delete builderTasks[fontId];

      callbacks.forEach(function (func) {
        func(err, { fontId: fontId, file: outputFile, directory: builderOutputDir });
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


// Push new build task (config) to queue
// and return `fontId` immediately (via callback)
//
function pushFont(clientConfig, callback) {
  createTask(clientConfig, callback, null);
}


// Push new build task (config) to queue
// and return `fontId` when compleete (via callback)
//
function buildFont(clientConfig, callback) {
  createTask(clientConfig, null, callback);
}


// Check if font generation complete. Returns
//
// {
//   pending,   // true if still in queue
//   file,      // file path from download root
//   directory  // dowload root
// }
//
function checkFont(fontId, callback) {

  // Check task pool first, to avoid fs kick
  // & make sure that file not partially written
  // 
  if (_.has(builderTasks, fontId)) {
    callback(null, { pending: true });
    return;
  }

  // Ok, we have chance. Check if result exists on disk
  var filename = getOutputName(fontId)
    , filepath = path.join(builderOutputDir, filename);

  fs.exists(filepath, function (exists) {
    if (exists) {
      callback(null, { pending: false, file: filename, directory: builderOutputDir });
    } else {
      callback(null, null);
    }
  });
}


module.exports = _.once(function (N) {
  // Init internals at first call.
  builderVersion   = N.runtime.version;
  builderLogger    = N.logger.getLogger('font');
  builderTmpDir    = path.join(os.tmpDir(), 'fontello');
  builderCwdDir    = N.runtime.mainApp.root;
  builderOutputDir = path.join(N.runtime.mainApp.root, 'public', 'download');
  builderBinary    = path.join(N.runtime.mainApp.root, 'bin', 'generate_font.sh');
  builderQueue     = async.queue(fontWorker, BUILDER_CONCURRENCY);
  builderTasks     = {};

  // Exports.
  return {
    pushFont:  pushFont
  , buildFont: buildFont
  , checkFont: checkFont
  };
});
