'use strict';


// stdlib
var crypto    = require('crypto');
var os        = require('os');
var fs        = require('fs');
var path      = require('path');
var execFile  = require('child_process').execFile;


// 3rd-party
var _       = require('lodash');
var async   = require('async');
var fstools = require('fs-tools');


// internal
var fontConfig      = require('../../lib/font_config');
var APP_ROOT        = require('./_common').APP_ROOT;
var DOWNLOAD_DIR    = require('./_common').DOWNLOAD_DIR;
var JOBS            = require('./_common').JOBS;
var getDownloadPath = require('./_common').getDownloadPath;


////////////////////////////////////////////////////////////////////////////////


// logger of font generator
var logger = N.logger.getLogger('font');


// some generator specific variables
var TMP_DIR             = '/tmp/fontello';
var CONFIG              = N.config.options;
var BUILDER_BIN         = path.join(APP_ROOT, 'bin/generate_font.sh');
var BUILDER_CONCURRENCY = CONFIG.builder_concurrency || os.cpus().length;


////////////////////////////////////////////////////////////////////////////////


// returns unique ID for requested list of glyphs
function getDownloadID(config) {
  var hash = crypto.createHash('md5');

  hash.update('fontello' + N.runtime.version);
  hash.update(JSON.stringify(config));

  return hash.digest('hex');
}


// Create worker queue with limited concurrency
var builderQueue = async.queue(function (config, callback) {

  var font_id = getDownloadID(config)
    , log_prefix = '[font::' + font_id + '] '
    , tmp_dir
    , zipball;

  tmp_dir = path.join(TMP_DIR, "fontello-" + font_id);
  zipball = path.join(DOWNLOAD_DIR, getDownloadPath(font_id));

  logger.info(log_prefix + 'Start generation: ' + JSON.stringify(config.session));

  var time_enqued = JOBS[font_id];
  var time_start  = Date.now();

  async.series([
    async.apply(fstools.remove, tmp_dir)
  , async.apply(fstools.mkdir, tmp_dir)
  , async.apply(fs.writeFile, path.join(tmp_dir, 'config.json'), JSON.stringify(config.session, null, '  '), 'utf8')
  // Write full config immediately, to avoid app exec from shell script
  // `log4js` has races with locks on multiple copies run,
  , async.apply(fs.writeFile, path.join(tmp_dir, 'generator-config.json'), JSON.stringify(fontConfig(config.session), null, '  '), 'utf8')
  , async.apply(execFile, BUILDER_BIN, [config.font.fontname, tmp_dir, zipball], {cwd: APP_ROOT})
  , async.apply(fstools.remove, tmp_dir)
  ], function (err) {
    if (err) {
      logger.error(log_prefix + (err.stack || err.message || err.toString()));
      callback();
      return;
    }

    // push final checkpoint
    var time_end = Date.now();

    // log some statistical info
    logger.info(log_prefix + "Generated in " +
                ((time_end - time_start) / 1000) + "ms " +
                "(real: " + ((time_end - time_enqued) / 1000) + "ms)");
    callback();
  });

}, BUILDER_CONCURRENCY);


////////////////////////////////////////////////////////////////////////////////


// request font generation
module.exports = function (N, apiPath) {
  N.validate(apiPath, {
    name: {
      type: "string"
    , required: false
    }
  , css_prefix_text: {
      type: "string"
    , required: true
    }
  , css_use_suffix: {
      type: "boolean"
    , required: true
    }
  , glyphs: {
      type: "array"
    , required: true
    }
  });

  N.wire.on(apiPath, function (env, callback) {
    var font = fontConfig(env.params), errmsg;

    if (!font || 0 >= font.glyphs.length) {
      callback("Invalid request");
      return;
    }

    if (CONFIG.max_glyphs && CONFIG.max_glyphs < font.glyphs.length) {
      errmsg = 'Too many icons requested: ' + font.glyphs.length +
               ' of ' + CONFIG.max_glyphs + ' allowed.';

      env.response.error = {
        code:     'MAX_GLYPHS_LIMIT'
      , message:  errmsg
      };

      logger.warn(errmsg);
      callback();
      return;
    }

    var font_id = getDownloadID(font);

    // Mini hack - reply is the same, for all sutiation.
    // Prepare it in advance, to avoid code duplication
    env.response.data.id = font_id;
    env.response.data.status = 'enqueued';

    // Check if task already enquered
    if (JOBS[font_id]) {
      logger.info("Job already in queue: " + JSON.stringify({
        font_id: font_id
      , queue_length: _.keys(JOBS).length
      }));

      callback();
      return;
    }

    // Check if task already done earlier (file exists)

    var zipball = path.join(DOWNLOAD_DIR, getDownloadPath(font_id));
    fs.exists(zipball, function (exists) {
      if (exists) {
        // then return fake success, without lock,
        // to make client go to status polling
        callback();
        return;
      }

      //
      // Now start rock'n'roll
      //  

      // create lock & push building task to queue
      JOBS[font_id] = Date.now();
      builderQueue.push(font, function() {
        // remove lock on finish
        delete JOBS[font_id];
      });

      logger.info("New job created: " + JSON.stringify({
        font_id: font_id
      , queue_length: builderQueue.length()
      }));

      callback();
    });
  });
};
