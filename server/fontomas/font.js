/*global nodeca, _*/


"use strict";


// stdlib
var crypto    = require('crypto');
var fs        = require('fs');
var path      = require('path');
var execFile  = require('child_process').execFile;


// 3rd-party
var neuron  = require('neuron');
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;


// directory where to put results
var TMP_DIR             = '/tmp/fontello';
var APP_ROOT            = _.first(nodeca.runtime.apps).root;
var DOWNLOAD_DIR        = path.join(APP_ROOT, 'public/download/');
var DOWNLOAD_URL_PREFIX = "/download/";
var GENERATOR_BIN       = path.join(APP_ROOT, 'bin/generate_font.sh');


// internal cache used by get_font()
var font_configs;


// return font configuration
function get_font(name) {
  if (!font_configs) {
    font_configs = {};
    nodeca.shared.fontomas.embedded_fonts.forEach(function (config) {
      font_configs[config.font.fontname] = config;
    });
  }

  return name ? font_configs[name] : font_configs;
}


// return valid glyphs configuration
function get_glyphs_config(params) {
  var glyphs = [];

  if (!_.isObject(params) || !_.isArray(params.glyphs)) {
    return null;
  }

  _.each(params.glyphs, function (g) {
    var font = get_font(g.src), glyph;

    if (!font) {
      // unknown glyph source font
      return;
    }

    glyph = _.find(font.glyphs, function (config) {
      return config.code === g.from;
    });

    if (!glyph) {
      // unknown glyph code
      return;
    }

    glyphs.push({
      css:  glyph.css,
      src:  g.src,
      from: g.from,
      code: g.code || g.from
    });
  });

  if (0 === glyphs.length) {
    // at least one glyph is required
    return null;
  }

  // return glyphs config sorted by original codes
  return _.sortBy(glyphs, function (g) { return g.from; });
}


// returns unique ID for requested list of glyphs
function get_download_id(glyphs) {
  return crypto.createHash('sha1').update(JSON.stringify(glyphs)).digest('hex');
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


// returns instance of job (searches on FS if needed)
function get_job(font_id, callback) {
  var job = jobs[font_id], file;

  // return not-finished jobs as they are
  if (job && 'finished' !== job.status) {
    callback(job);
    return;
  }

  file = path.join(DOWNLOAD_DIR, get_download_path(font_id));
  path.exists(file, function (result) {
    if (!result) {
      // remove cached status if any to avoid memory bloat
      delete jobs[font_id];
      callback(/* undefined - job not found */);
      return;
    }

    callback({status: 'finished', url: get_download_url(font_id)});
  });
}


var source_fonts;
function get_source_fonts() {
  var fonts_dir;

  if (!source_fonts) {
    source_fonts  = {};
    fonts_dir     = path.join(APP_ROOT, 'assets/embedded_fonts');

    _.each(get_font(), function (config, name) {
      source_fonts[name] = path.join(fonts_dir, name + '.ttf');
    });
  }

  return source_fonts;
}


// define queue and jobs
var job_mgr = new (neuron.JobManager)();
job_mgr.addJob('generate-font', {
  dirname: '/tmp',
  concurrency: 4,
  work: function (font_id, glyphs) {
    var self        = this,
        fontname    = "fontello-" + font_id,
        zipball     = path.join(DOWNLOAD_DIR, get_download_path(font_id));

    // push timer checkpoint
    jobs[font_id].timer.push(Date.now());

    async.series([
      async.apply(execFile, GENERATOR_BIN, ['', '', zipball])
    ], function (err) {
      var timer = jobs[font_id].timer;

      if (err) {
        jobs[font_id].status  = 'error';
        jobs[font_id].error   = err;
      } else {
        jobs[font_id].status  = 'finished';
        jobs[font_id].url     = get_download_url(font_id);

        // untight worker id
        delete jobs[font_id].worker_id;
      }

      // push final checkpoint
      timer.push(Date.now());

      nodeca.logger.notice("Generated font '" + font_id + "' in " +
                           ((timer[2] - timer[0]) / 1000) + "ms " +
                           "(real: " + ((timer[1] - timer[0]) / 1000) + "ms)");

      self.finished = true;
    });
  }
});


// request font generation status
module.exports.status = function (params, callback) {
  var data = this.response.data;

  get_job(params.id, function (job) {
    if (!job) {
      callback("Unknown job id.");
      return;
    }

    data.id     = params.id;
    data.status = job.status;

    if ('enqueued' === job.status) {
      data.position = job_mgr.getPosition('generate-font', job.worker_id);
    }

    if ('finished' === job.status) {
      data.url = job.url;
    }

    if ('error' === job.status) {
      data.error = job.error;
    }

    callback();
  });
};


// request font generation
module.exports.generate = function (params, callback) {
  var glyphs = get_glyphs_config(params), font_id;

  if (!glyphs) {
    callback("Invalid request");
    return;
  }

  font_id = get_download_id(glyphs);

  // enqueue new unique job
  if (!jobs[font_id]) {
    jobs[font_id] = {
      timer:      [Date.now()], // [enqueued_at, started_at, finished_at]
      status:     'enqueued',
      worker_id:  job_mgr.enqueue('generate-font', font_id, glyphs)
    };
  }

  // forward request to status getter
  module.exports.status.call(this, {id:  font_id}, callback);
};
