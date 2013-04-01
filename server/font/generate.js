'use strict';


// stdlib
var crypto    = require('crypto');
var os        = require('os');
var fs        = require('fs');
var path      = require('path');
var execFile  = require('child_process').execFile;


// 3rd-party
var _       = require('lodash');
var neuron  = require('neuron');
var async   = require('async');
var fstools = require('fs-tools');


// internal
var fontConfig      = require('../../lib/font_config');
var stats           = require('./_build_stats');
var APP_ROOT        = require('./_common').APP_ROOT;
var DOWNLOAD_DIR    = require('./_common').DOWNLOAD_DIR;
var JOBS            = require('./_common').JOBS;
var getDownloadPath = require('./_common').getDownloadPath;


////////////////////////////////////////////////////////////////////////////////


// logger of font generator
var logger = N.logger.getLogger('server.font');


// some generator specific variables
var TMP_DIR             = '/tmp/fontello';
var GENERATOR_BIN       = path.join(APP_ROOT, 'bin/generate_font.sh');
var CONFIG              = N.config.options;


////////////////////////////////////////////////////////////////////////////////


// returns unique ID for requested list of glyphs
function getDownloadID(config) {
  var hash = crypto.createHash('md5');

  hash.update('fontello' + N.runtime.version);
  hash.update(JSON.stringify({
    fontname: config.font.fontname,
    glyphs:   config.glyphs
  }));

  return hash.digest('hex');
}


// define neuron queue
var jobMgr = new (neuron.JobManager)();


// define neuron job
jobMgr.addJob('generate-font', {
  dirname: '/tmp',
  concurrency: (CONFIG.builder_concurrency || os.cpus().length),
  work: function (font_id, config) {
    var self = this
      , log_prefix = '[font::' + font_id + '] '
      , tmp_dir
      , zipball
      , times;

    try {
      tmp_dir = path.join(TMP_DIR, "fontello-" + font_id);
      zipball = path.join(DOWNLOAD_DIR, getDownloadPath(font_id));
      times   = [JOBS[font_id]];

      logger.info(log_prefix + 'Start generation: ' + JSON.stringify(config.session));

      if (fs.existsSync(zipball)) {
        logger.info(log_prefix + "File already exists. Doing nothing.");
        this.finished = true;
        return;
      }

      // push timer checkpoint
      times.push(Date.now());

      async.series([
        async.apply(fstools.remove, tmp_dir)
      , async.apply(fstools.mkdir, tmp_dir)
      , async.apply(fs.writeFile, path.join(tmp_dir, 'config.json'), JSON.stringify(config.session, null, '  '), 'utf8')
      , async.apply(execFile, GENERATOR_BIN, [config.font.fontname, tmp_dir, zipball], {cwd: APP_ROOT})
      , async.apply(fstools.remove, tmp_dir)
      ], function (err) {
        if (err) {
          logger.error(log_prefix + (err.stack || err.message || err.toString()));
        }

        // push final checkpoint
        times.push(Date.now());

        // log some statistical info
        logger.info(log_prefix + "Generated in " +
                    ((times[2] - times[0]) / 1000) + "ms " +
                    "(real: " + ((times[1] - times[0]) / 1000) + "ms)");

        stats.push({
          glyphs: config.glyphs.length
        , time:   (times[2] - times[0]) / 1000
        });

        self.finished = true;
      });
    } catch (err) {
      logger.error(log_prefix + 'Unexpected error happened: ' +
                   (err.stack || err.message || err.toString()));

      this.finished = true;
    }
  }
});


// action after job was finished
jobMgr.on('finish', function (job, worker) {
  if ('generate-font' === job.name) {
    delete JOBS[worker.args[0]];
  }
});


////////////////////////////////////////////////////////////////////////////////


// request font generation
module.exports = function (N, apiPath) {
  N.validate(apiPath, {
    name: {
      type: "string"
    , required: false
    }
  , glyphs: {
      type: "array"
    , required: true
    }
  });

  N.wire.on(apiPath, function (env, callback) {
    var font = fontConfig(env.params), font_id, errmsg;

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

    font_id = getDownloadID(font);

    if (JOBS[font_id]) {
      logger.info("Job already in queue: " + JSON.stringify({
        font_id: font_id
      , queue_length: _.keys(JOBS).length
      }));
    } else {
      // enqueue new unique job
      JOBS[font_id] = Date.now();
      jobMgr.enqueue('generate-font', font_id, font);

      logger.info("New job created: " + JSON.stringify({
        font_id: font_id
      , queue_length: _.keys(JOBS).length
      }));
    }

    env.response.data.id = font_id;
    env.response.data.status = 'enqueued';
    callback();
  });
};
