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
var TMP_DIR             = '/tmp/fontomas';
var APP_ROOT            = _.first(nodeca.runtime.apps).root;
var DOWNLOAD_DIR        = path.join(APP_ROOT, 'public/download/');
var DOWNLOAD_URL_PREFIX = "http://www.fontello.com/download/";

var ZIP_BIN             = '/usr/bin/zip';
var FONT_MERGE_BIN      = path.join(APP_ROOT, 'support/font-builder/bin/font_merge.py');
var FONT_CONVERT_BIN    = path.join(APP_ROOT, 'support/font-builder/bin/fontconvert.py');
var FONT_CONFIG_BIN     = path.join(APP_ROOT, 'support/font-builder/bin/font_mkconfig.py');
var FONT_DEMO_BIN       = path.join(APP_ROOT, 'support/font-builder/bin/fontdemo.py');


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

  return [a, b, font_id].join("/") + ".zip";
}


function get_download_url(font_id) {
  return DOWNLOAD_URL_PREFIX + get_download_path(font_id);
}


// status of jobs by their ids
var jobs = {};


// returns instance of job (searches on FS if needed)
function get_job(font_id, callback) {
  var job = jobs[font_id], file;

  if (job) {
    callback(job);
    return;
  }

  file = path.join(DOWNLOAD_DIR, get_download_path(font_id));
  path.exists(file, function (result) {
    if (!result) {
      callback(/* undefined - job not found */);
      return;
    }

    callback({status: 'ready', url: get_download_url(font_id)});
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
        tmp         = path.join(TMP_DIR, fontname),
        zipball     = path.join(DOWNLOAD_DIR, get_download_path(font_id));

    async.series([
      async.apply(fstools.mkdir, tmp),
      // write config
      async.apply(fs.writeFile, path.join(tmp, 'config.yml'), JSON.stringify({
        font: {
          version:    "1.0-" + font_id.substr(0, 8),
          fontname:   fontname,
          fullname:   "Fontello " + font_id,
          familyname: "Fontello",
          copyright:  "Copyright (C) 2012 by fontello.com",
          ascent:     800,
          descent:    200,
          weight:     "Normal"
        },
        glyphs:     glyphs,
        src_fonts:  get_source_fonts()
      }), 'utf8'),
      // merge font
      async.apply(execFile, FONT_MERGE_BIN, [
        '--config',   path.join(tmp, 'config.yml'),
        '--dst_font', path.join(tmp, fontname + '.ttf')
      ]),
      // convert font
      async.apply(execFile, FONT_CONVERT_BIN, [
        '--src_font',   path.join(tmp, fontname + '.ttf'),
        '--fonts_dir',  tmp
      ]),
      // make font config
      async.apply(execFile, FONT_CONFIG_BIN, [
        '--src_font',   path.join(tmp, fontname + '.ttf'),
        '--config',   path.join(tmp, 'config.yml')
      ]),
      // build font demo
      //async.apply(execFile, FONT_DEMO_BIN, [
      //  '--config',   path.join(tmp, 'config.yml')
      //])
      // prepare destination folder
      async.apply(fstools.mkdir, path.dirname(zipball)),
      // prepare zipball
      async.apply(execFile, ZIP_BIN, ['-r', tmp, zipball]),
      // cleanup tmp dir
      async.apply(fstools.remove, tmp)
    ], function (err) {
      if (err) {
        jobs[font_id].status  = 'error';
        jobs[font_id].error   = err;
      } else {
        jobs[font_id].status  = 'finished';
        jobs[font_id].url     = get_download_url(font_id);

        // untight worker id
        delete jobs[font_id].worker_id;
      }

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

    if ('ready' === job.status) {
      data.url = job.url;
    }

    callback(job.error);
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
      status:     'enqueued',
      worker_id:  job_mgr.enqueue('generate-font', font_id, glyphs)
    };

    this.response.data = {id: font_id, status: 'enqueued'};
    callback();
    return;
  }

  // otherwise forward request to status getter
  module.exports.status.call(this, {id:  font_id}, callback);
};
