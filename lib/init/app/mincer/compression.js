"use strict";


/*global N*/


// stdlib
var fs      = require('fs');
var path    = require('path');
var crypto  = require('crypto');


// 3rd-party
var uglify      = require('uglify-js');
var Csso        = require('csso');
var FsTools     = require('fs-tools');


////////////////////////////////////////////////////////////////////////////////

var MAIN_ROOT = N.runtime.mainApp.root;
var CACHE_DIR = path.join(MAIN_ROOT, 'public/assets/.cache');
var UGLIFY_CFG = {
  gen_options: {
    beautify:     ('development' === N.runtime.env),
    indent_level: 2
  }
};
var SALT = N.runtime.env + JSON.stringify(require(MAIN_ROOT + '/package'));


////////////////////////////////////////////////////////////////////////////////


var debug = function () {};


if (/(?:^|,)all|assets-compression(?:,|$)/.test(process.env.NODECA_DEBUG)) {
  debug = function debug(result, file, mime) {
    console.log('[NODECA DEBUG] [ASSETS COMPRESSION] *** (%s) *** %s / %s',
                result, file, mime);
  };
}


// dummy helper to generate md5 hash of a `str`
//
function hash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}


// returns digest and data for the given key
//
function get_cache(key) {
  var base    = CACHE_DIR + '/' + key,
      cached  = {};

  if (fs.existsSync(base + '.data')) {
    // if data exists, then digest should exist as well
    cached.data   = fs.readFileSync(base + '.data', 'utf8');
    cached.digest = fs.readFileSync(base + '.digest', 'utf8');
  }

  return cached;
}


// sets digest and data for the given key
//
function set_cache(key, digest, data, callback) {
  var base = CACHE_DIR + '/' + key;

  FsTools.mkdir(CACHE_DIR, function (err) {
    if (err) {
      callback(err);
      return;
    }

    try {
      fs.writeFileSync(base + '.data', data, 'utf8');
      fs.writeFileSync(base + '.digest', digest, 'utf8');
    } catch (err) {
      callback(err);
      return;
    }

    callback();
  });
}


// returns function that runs `compressor(data)` only in case if data changed
// since it was last time cached
//
function cachable(compressor) {
  return function (context, data, callback) {
    var key     = hash(context.logicalPath + context.contentType),
        digest  = hash(data + SALT),
        cached  = get_cache(key),
        compressed;

    if (cached.digest === digest) {
      debug('CACHE HIT', context.logicalPath, context.contentType);
      callback(null, cached.data);
      return;
    }

    try {
      debug('CACHE MISS', context.logicalPath, context.contentType);
      compressed = compressor(data);
    } catch (err) {
      callback(err);
      return;
    }

    set_cache(key, digest, compressed, function (err) {
      callback(err, compressed);
    });
  };
}


// JavaScript compressor
function js_compressor(str) {
  return uglify(str, UGLIFY_CFG);
}


// CSS compressor
function css_compressor(str) {
  return Csso.justDoIt(str);
}


////////////////////////////////////////////////////////////////////////////////


module.exports.js   = cachable(js_compressor);
module.exports.css  = cachable(css_compressor);
