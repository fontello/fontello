/*global nodeca, _*/


"use strict";


// stdlib
var crypto    = require('crypto');
var os        = require('os');
var fs        = require('fs');
var path      = require('path');
var execFile  = require('child_process').execFile;


// 3rd-party
var connect = require('connect');
var neuron  = require('neuron');
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;


// internal
var stats   = require('../../lib/stats');


////////////////////////////////////////////////////////////////////////////////


var TMP_DIR             = '/tmp/fontello';
var APP_ROOT            = _.first(nodeca.runtime.apps).root;
var DOWNLOAD_DIR        = path.join(APP_ROOT, 'public/download/');
var DOWNLOAD_URL_PREFIX = "/download/";
var GENERATOR_BIN       = path.join(APP_ROOT, 'bin/generate_font.sh');
var CONFIG              = nodeca.config.fontomas;


////////////////////////////////////////////////////////////////////////////////


// return font configuration
var font_configs = null;
function get_embedded_font(name) {
  if (null === font_configs) {
    font_configs = {};
    nodeca.shared.fontomas.embedded_fonts.forEach(function (config) {
      font_configs[config.font.fontname] = config;
    });
  }

  return name ? font_configs[name] : font_configs;
}


var source_fonts;
function get_source_fonts() {
  var fonts_dir;

  if (!source_fonts) {
    source_fonts  = {};
    fonts_dir     = path.join(APP_ROOT, 'assets/embedded_fonts');

    _.each(get_embedded_font(), function (config, name) {
      source_fonts[name] = path.join(fonts_dir, name + '.ttf');
    });
  }

  return source_fonts;
}


function get_used_fonts(glyphs) {
  var fonts = {};

  _.each(glyphs, function (g) {
    if (fonts[g.src]) {
      return;
    }

    fonts[g.src] = get_embedded_font(g.src);
  });

  return _.values(fonts);
}


// return valid glyphs configuration
function get_glyphs_config(params) {
  var glyphs = [];

  if (!_.isArray(params.glyphs)) {
    return glyphs;
  }

  _.each(params.glyphs, function (g) {
    var font = get_embedded_font(g.src), glyph;

    if (!font) {
      // unknown glyph source font
      return;
    }

    glyph = _.find(font.glyphs, function (config) {
      if (!!config.uid) {
        return config.uid === g.uid;
      }

      return config.code === g.orig_code;
    });

    if (!glyph) {
      // unknown glyph code
      return;
    }

    glyphs.push({
      src:  g.src,
      uid:  g.uid,
      css:  g.css || glyph.css,
      from: glyph.code,
      code: g.code || glyph.code
    });
  });

  if (0 === glyphs.length) {
    // at least one glyph is required
    return null;
  }

  // return glyphs config sorted by original codes
  return _.sortBy(glyphs, function (g) { return g.from; });
}


function filter_fontname(str) {
  str = _.isString(str) ? str : '';
  return str.replace(/[^a-z0-9\-_]+/g, '-');
}


function get_font_config(params) {
  var glyphs_config, fontname;

  if (!_.isObject(params)) {
    return null;
  }

  glyphs_config = get_glyphs_config(params);
  fontname      = filter_fontname(params.name) || 'fontello';

  return {
    font: {
      fontname:   fontname,
      fullname:   fontname,
      familyname: 'fontello',
      copyright:  'Copyright (C) 2012 by original authors @ fontello.com',
      ascent:     800,
      descent:    200,
      weight:     'Medium'
    },
    meta: {
      columns: 4,
      css_prefix: 'icon-',
    },
    glyphs:     glyphs_config,
    src_fonts:  get_source_fonts(),
    used_fonts: get_used_fonts(glyphs_config),
    session:    params
  };
}


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
      times   = [jobs[font_id].start];

      nodeca.logger.info(log_prefix + 'Start generation: ' + JSON.stringify(config));

      if (fs.existsSync(zipball)) {
        nodeca.logger.info(log_prefix + "File already exists. Doing nothing.");
        delete jobs[font_id];
        this.finished = true;
        return;
      }

      // push timer checkpoint
      times.push(Date.now());

      async.series([
        async.apply(fstools.remove, tmp_dir),
        async.apply(fstools.mkdir, tmp_dir),
        async.apply(fs.writeFile, path.join(tmp_dir, 'config.json'), JSON.stringify(config.session), 'utf8'),
        async.apply(fs.writeFile, path.join(tmp_dir, 'generator-config.json'), JSON.stringify(config), 'utf8'),
        async.apply(execFile, GENERATOR_BIN, [config.font.fontname, tmp_dir, zipball], {cwd: APP_ROOT}),
        async.apply(fstools.remove, tmp_dir)
      ], function (err) {
        if (err) {
          nodeca.logger.error(log_prefix + (err.stack || err.message || err.toString()));
        }

        // push final checkpoint
        times.push(Date.now());

        // log some statistical info
        nodeca.logger.info(log_prefix + "Generated in " +
                          ((times[2] - times[0]) / 1000) + "ms " +
                          "(real: " + ((times[1] - times[0]) / 1000) + "ms)");

        stats.push({
          glyphs: config.glyphs.length,
          time:   (times[2] - times[0]) / 1000,
        });

        delete jobs[font_id];
        self.finished = true;
      });
    } catch (err) {
      nodeca.logger.error(log_prefix + 'Unexpected error happened: ' +
                          (err.stack || err.message || err.toString()));

      delete jobs[font_id];
      this.finished = true;
    }
  }
});


// request font generation status
module.exports.status = function (params, callback) {
  var response  = this.response,
      file      = path.join(DOWNLOAD_DIR, get_download_path(params.id));

  if (jobs[params.id]) {
    response.data = {status: 'processing'};
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


// request font generation
module.exports.generate = function (params, callback) {
  var self = this, font = get_font_config(params), font_id, errmsg;

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

    nodeca.logger.warn(errmsg);
    callback();
    return;
  }

  font_id = get_download_id(font);

  if (jobs[font_id]) {
    nodeca.logger.info("Job already in queue: " + JSON.stringify({
      font_id     : font_id,
      queue_length: _.keys(jobs).length
    }));
  } else {
    // enqueue new unique job
    jobs[font_id] = {
      start:      Date.now(),
      status:     'enqueued',
      worker_id:  job_mgr.enqueue('generate-font', font_id, font)
    };

    nodeca.logger.info("New job created: " + JSON.stringify({
      font_id     : font_id,
      queue_length: _.keys(jobs).length
    }));
  }

  self.response.data = {id: font_id, status: 'enqueued'};
  callback();
};


// font downloader middleware
var download_options  = {root: DOWNLOAD_DIR};
var FINGERPRINT_RE    = /-([0-9a-f]{32,40})\.[^.]+$/;
module.exports.download = function (params, callback) {
  var match = FINGERPRINT_RE.exec(params.file),
      http  = this.origin.http,
      filename;

  if (!http) {
    callback("HTTP requests only");
    return;
  }

  console.log('downloads', params);

  download_options.path    = params.file;
  download_options.getOnly = true;

  if (match) {
    // beautify zipball name
    filename = 'filename=fontello-' + match[1].substr(0, 8) + '.zip';
    http.res.setHeader('Content-Disposition', 'attachment; ' + filename);
  }

  connect.static.send(http.req, http.res, function (err) {
    var prefix = '[server.fontomas.font.download] ',
        suffix = ' (' + http.req.url + ')';

    if (err) {
      callback(prefix + (err.message || err) + suffix +
               (err.stack ? ('\n' + err.stack) : ''));
      return;
    }

    callback(prefix + 'File not found' + suffix);
  }, download_options);
};
