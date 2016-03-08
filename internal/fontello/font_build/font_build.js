// Build font
//
// In:
//
// - config - client config
//
// Out:
//
// - fontId
// - file
// - directory
//
'use strict';


const fontConfig = require('./_lib/config');
const fontWorker = require('./_lib/worker');
const crypto     = require('crypto');
const path       = require('path');
const os         = require('os');
const mz         = require('mz');


// Returns unique identifier for requested list of glyphs.
//
function getFontId(versionHash, config) {
  let hash = crypto.createHash('md5');

  hash.update('fontello' + versionHash);
  hash.update(JSON.stringify(config));

  return hash.digest('hex');
}


module.exports = function (N, apiPath) {
  // Started tasks
  //
  let tasks = {};
  let logger = N.logger.getLogger('font');


  N.wire.on(apiPath, function* build_font(data) {
    let builderConfig = fontConfig(data.config);

    if (!builderConfig || builderConfig.glyphs.length <= 0) {
      throw 'Invalid config.';
    }

    data.fontId = getFontId(N.version_hash, data.config);
    data.directory = path.join(N.mainApp.root, 'download');
    data.file = path.join(data.directory, data.fontId.substr(0, 2), data.fontId.substr(2, 2), `${data.fontId}.zip`);


    // If same task is already done (the result file exists) - use it.
    //
    let exists = yield mz.fs.exists(data.file);

    if (exists) return;


    // If task already exists - just return its promise.
    //
    // NOTE: We must do this *after* async `fs.exists` call to prevent creation
    // of multiple tasks for one font when user very quickly sends multiple
    // requests for same font. Multiple tasks for same font will cause an error.
    // (referencing already completed and deleted task)

    if (tasks[data.fontId]) return tasks[data.fontId].result;


    // Otherwise, create a new task.
    //
    let taskInfo = {
      fontId: data.fontId,
      clientConfig: data.config,
      builderConfig,
      cwdDir: N.mainApp.root,
      tmpDir: path.join(os.tmpDir(), 'fontello', `fontello-${data.fontId.substr(0, 8)}`),
      output: data.file,
      timestamp: Date.now(),
      result: null,
      logger
    };

    // Store promise in `taskInfo` structure
    taskInfo.result = fontWorker(taskInfo);
    // Add to tasks array
    tasks[data.fontId] = taskInfo;
    logger.info('New job created: %j', { font_id: data.fontId, queue_length: Object.keys(tasks).length });

    // Wait for task finished
    yield taskInfo.result;

    delete tasks[data.fontId];
  });
};
