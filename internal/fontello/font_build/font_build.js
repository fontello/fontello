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
const Promise    = require('bluebird');
const exists     = Promise.promisify(require('level-exists'));


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


  N.wire.on(apiPath, async function build_font(data) {
    let builderConfig = fontConfig(data.config);

    if (!builderConfig || builderConfig.glyphs.length <= 0) {
      throw 'Invalid config.';
    }

    data.fontId = getFontId(N.version_hash, data.config);

    // If same task is already done (result exists) - use it.
    //
    if (await exists(N.downloads, data.fontId)) return;


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
    let zipData = await taskInfo.result;

    await N.downloads.put(
      taskInfo.fontId,
      zipData,
      { ttl: 5 * 60 * 1000, valueEncoding: 'binary' }
    );

    delete tasks[data.fontId];
  });
};
