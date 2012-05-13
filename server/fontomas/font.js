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


// internal
var stats   = require('../../lib/stats');


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
      css:  g.css || glyph.css,
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
  return crypto.createHash('md5').update('fontello').update(JSON.stringify(glyphs)).digest('hex');
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

    delete jobs[font_id]; // make sure finished tasks are not in the cache
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
  work: function (font_id, glyphs, user) {
    var self        = this,
        fontname    = "fontello-" + font_id.substr(0, 8),
        tmp_dir     = path.join(TMP_DIR, "fontello-" + font_id),
        zipball     = path.join(DOWNLOAD_DIR, get_download_path(font_id)),
        times       = [jobs[font_id].start],
        config;

    // FIXME: after server restart this might become "undefined"
    //
    //        I'm still unsure WHAT might cause such behavior, as after restart
    //        manager should have empty stack.
    //
    //        Possible reason is that job removed by get_job_data().
    if (!jobs[font_id]) {
      jobs[font_id] = {start: Date.now(), status: 'enqueued'};
      times         = [jobs[font_id].start];

      nodeca.logger.error("Unexpected absence of job.\n" + JSON.stringify({
        font_id:  font_id,
        glyphs:   glyphs,
        user:     user
      }));
    }

    // push timer checkpoint
    times.push(Date.now());

    // generate font config
    config = JSON.stringify({
      font: {
        version:    "1.0-" + font_id,
        fontname:   fontname,
        fullname:   "Fontello " + font_id.substr(0, 8),
        familyname: "Fontello",
        copyright:  "Copyright (C) 2012 by original authors @ fontello.com",
        ascent:     800,
        descent:    200,
        weight:     "Medium"
      },
      meta: {
        columns: 4,
        css_prefix: 'icon-',
      },
      glyphs: glyphs,
      src_fonts: get_source_fonts()
    });

    async.series([
      async.apply(fstools.remove, tmp_dir),
      async.apply(fstools.mkdir, tmp_dir),
      async.apply(fs.writeFile, path.join(tmp_dir, 'config.json'), config, 'utf8'),
      async.apply(execFile, GENERATOR_BIN, [fontname, tmp_dir, zipball], {cwd: APP_ROOT}),
      async.apply(fstools.remove, tmp_dir)
    ], function (err) {
      if (err) {
        nodeca.logger.error(err.stack || err.message || err.toString());

        jobs[font_id].status  = 'error';
        jobs[font_id].error   = (err.message || err.toString());
      } else {
        // remove job from the cache as we check filesystem
        // to decide whenever job is done or not
        delete jobs[font_id];
      }

      // push final checkpoint
      times.push(Date.now());

      // log some statistical info
      nodeca.logger.info("Generated font '" + font_id + "' in " +
                         ((times[2] - times[0]) / 1000) + "ms " +
                         "(real: " + ((times[1] - times[0]) / 1000) + "ms)");

      stats.push({
        glyphs: glyphs.length,
        time:   (times[2] - times[0]) / 1000,
        user:   user
      });

      self.finished = true;
    });
  }
});



function get_job_data(id, job) {
  var data = {id: id, status: job.status};

  if ('error' === job.status) {
    data.error = job.error;
    // as long as user got info about error
    // remove the job from the cache
    delete jobs[id];
  }

  if ('enqueued' === job.status) {
    data.position = job_mgr.getPosition('generate-font', job.worker_id);

    if (-1 === data.position) {
      data.status = 'processing';
      delete data.position;
    }
  }

  if ('finished' === job.status) {
    data.url = job.url;
  }

  return data;
}


// request font generation status
module.exports.status = function (params, callback) {
  var self = this;

  get_job(params.id, function (job) {
    if (!job) {
      callback("Unknown job id.");
      return;
    }

    self.response.data = get_job_data(params.id, job);
    callback();
  });
};


// request font generation
module.exports.generate = function (params, callback) {
  var self = this, glyphs = get_glyphs_config(params), font_id, user, errmsg;

  if (!glyphs || 0 >= glyphs.length) {
    callback("Invalid request");
    return;
  }

  if (nodeca.config.fontomas.max_glyphs < glyphs.length) {
    errmsg = 'Too many icons requested: ' + glyphs.length +
             ' of ' + nodeca.config.fontomas.max_glyphs + ' allowed.';

    this.response.error = {
      code:     'MAX_GLYPHS_LIMIT',
      message:  errmsg
    };

    nodeca.logger.warn(errmsg);
    callback();
    return;
  }

  font_id = get_download_id(glyphs);
  user    = this.__raw__.socket.handshake.address.address;

  get_job(font_id, function (job) {
    // enqueue new unique job
    if (!job) {
      job = jobs[font_id] = {
        start:      Date.now(),
        status:     'enqueued',
        worker_id:  job_mgr.enqueue('generate-font', font_id, glyphs, user)
      };
    }

    self.response.data = get_job_data(font_id, job);
    callback();
  });
};
