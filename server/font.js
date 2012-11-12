/*global nodeca, _*/


"use strict";


// stdlib
var crypto    = require('crypto');
var os        = require('os');
var fs        = require('fs');
var path      = require('path');
var http      = require('http');
var execFile  = require('child_process').execFile;


// 3rd-party
var send    = require('send');
var neuron  = require('neuron');
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;


// internal
var stats       = require('../lib/stats');
var logger      = nodeca.logger.getLogger('server.font');
var dl_logger   = nodeca.logger.getLogger('server.font.download');
var fontConfig  = require('../lib/font_config');


////////////////////////////////////////////////////////////////////////////////


var TMP_DIR             = '/tmp/fontello';
var APP_ROOT            = _.first(nodeca.runtime.apps).root;
var DOWNLOAD_DIR        = path.join(APP_ROOT, 'public/download/');
var DOWNLOAD_URL_PREFIX = "/download/";
var GENERATOR_BIN       = path.join(APP_ROOT, 'bin/generate_font.sh');
var CONFIG              = nodeca.config.app;


////////////////////////////////////////////////////////////////////////////////


// returns unique ID for requested list of glyphs
function get_download_id(config) {
  var hash = crypto.createHash('md5');

  hash.update('fontello' + nodeca.runtime.version);
  hash.update(JSON.stringify({
    fontname: config.font.fontname,
    glyphs:   config.glyphs
  }));

  return hash.digest('hex');
}


function get_download_path(font_id) {
  var a, b;

  a = font_id.substr(0, 2);
  b = font_id.substr(2, 2);

  return [a, b, 'fontello-' + font_id].join("/") + ".zip";
}


function get_download_url(font_id) {
  return DOWNLOAD_URL_PREFIX + get_download_path(font_id);
}


// status of jobs by their ids
var jobs = {};


// define queue and jobs
var job_mgr = new (neuron.JobManager)();
job_mgr.addJob('generate-font', {
  dirname: '/tmp',
  concurrency: (CONFIG.builder_concurrency || os.cpus().length),
  work: function (font_id, config) {
    var self        = this,
        log_prefix  = '[font::' + font_id + '] ',
        tmp_dir, zipball, times;

    try {
      tmp_dir = path.join(TMP_DIR, "fontello-" + font_id);
      zipball = path.join(DOWNLOAD_DIR, get_download_path(font_id));
      times   = [jobs[font_id]];

      logger.info(log_prefix + 'Start generation: ' + JSON.stringify(config.session));

      if (fs.existsSync(zipball)) {
        logger.info(log_prefix + "File already exists. Doing nothing.");
        this.finished = true;
        return;
      }

      // push timer checkpoint
      times.push(Date.now());

      async.series([
        async.apply(fstools.remove, tmp_dir),
        async.apply(fstools.mkdir, tmp_dir),
        async.apply(fs.writeFile, path.join(tmp_dir, 'config.json'), JSON.stringify(config.session, null, '  '), 'utf8'),
        async.apply(execFile, GENERATOR_BIN, [config.font.fontname, tmp_dir, zipball], {cwd: APP_ROOT}),
        async.apply(fstools.remove, tmp_dir)
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
          glyphs: config.glyphs.length,
          time:   (times[2] - times[0]) / 1000
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


job_mgr.on('finish', function (job, worker) {
  if ('generate-font' === job.name) {
    delete jobs[worker.args[0]];
  }
});


// Validate input parameters
nodeca.validate('status', {
  id: {
    type: "string",
    required: true
  }
});


// request font generation status
module.exports.status = function (params, callback) {
  var response  = this.response,
      file      = path.join(DOWNLOAD_DIR, get_download_path(params.id));

  if (jobs[params.id]) {
    response.data = {status: 'enqueued'};
    callback();
    return;
  }

  path.exists(file, function (exists) {
    if (!exists) {
      // job not found
      response.data   = {status: 'error'};
      response.error  = 'Unknown font id (probably task crashed, try again).';
      callback();
      return;
    }

    // job done
    response.data = {status: 'finished', url: get_download_url(params.id)};
    callback();
  });
};


// Validate input parameters
nodeca.validate('generate', {
  name: {
    type: "string",
    required: false
  },
  glyphs: {
    type: "array",
    required: true
  }
});


// request font generation
module.exports.generate = function (params, callback) {
  var self = this, font = fontConfig(params), font_id, errmsg;

  if (!font || 0 >= font.glyphs.length) {
    callback("Invalid request");
    return;
  }

  if (CONFIG.max_glyphs && CONFIG.max_glyphs < font.glyphs.length) {
    errmsg = 'Too many icons requested: ' + font.glyphs.length +
             ' of ' + CONFIG.max_glyphs + ' allowed.';

    this.response.error = {
      code:     'MAX_GLYPHS_LIMIT',
      message:  errmsg
    };

    logger.warn(errmsg);
    callback();
    return;
  }

  font_id = get_download_id(font);

  if (jobs[font_id]) {
    logger.info("Job already in queue: " + JSON.stringify({
      font_id     : font_id,
      queue_length: _.keys(jobs).length
    }));
  } else {
    // enqueue new unique job
    jobs[font_id] = Date.now();
    job_mgr.enqueue('generate-font', font_id, font);

    logger.info("New job created: " + JSON.stringify({
      font_id     : font_id,
      queue_length: _.keys(jobs).length
    }));
  }

  self.response.data = {id: font_id, status: 'enqueued'};
  callback();
};


// font downloader middleware
var FINGERPRINT_RE = /-([0-9a-f]{32,40})\.[^.]+$/;


// Validate input parameters
nodeca.validate('download', {
  file: {
    type: "string",
    required: true
  }
});


// Send dowloaded file
//
module.exports.download = function (params, callback) {
  var match, req, res, filename;

  if (!this.origin.http) {
    callback({statusCode: 400, body: "HTTP ONLY"});
    return;
  }

  req = this.origin.http.req;
  res = this.origin.http.res;

  if ('GET' !== req.method && 'HEAD' !== req.method) {
    callback({statusCode: 400});
    return;
  }

  match = FINGERPRINT_RE.exec(params.file);

  if (match) {
    // beautify zipball name
    filename = 'filename=fontello-' + match[1].substr(0, 8) + '.zip';
    res.setHeader('Content-Disposition', 'attachment; ' + filename);
  }

  send(req, params.file)
    .root(DOWNLOAD_DIR)
    .on('error', function (err) {
      if (404 === err.status) {
        callback({statusCode: 404});
        return;
      }

      callback(err);
    })
    .on('directory', function () {
      callback({statusCode: 400});
    })
    .on('end', function () {
      dl_logger.info('%s - "%s %s HTTP/%s" %d "%s" - %s',
                     req.connection.remoteAddress,
                     req.method,
                     req.url,
                     req.httpVersion,
                     res.statusCode,
                     req.headers['user-agent'],
                     http.STATUS_CODES[res.statusCode]);
    })
    .pipe(res);
};
