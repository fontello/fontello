"use strict";


/*global nodeca, _*/


// stdlib
var fs      = require('fs');
var path    = require('path');
var crypto  = require('crypto');


// 3rd-party
var Mincer      = require('mincer');
var uglify      = require('uglify-js');
var Csso        = require('csso');
var FsTools     = require('nlib').Vendor.FsTools;


////////////////////////////////////////////////////////////////////////////////


var CACHE_DIR = path.join(nodeca.runtime.apps[0].root, 'public/assets/.cache');
var UGLIFY_CFG = {
  beautify:     ('development' === nodeca.runtime.env),
  indent_level: 2
};
var SALT = nodeca.runtime.env + JSON.stringify(require('../../../package.json'));


////////////////////////////////////////////////////////////////////////////////


function hash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}


function get_cache(key) {
  var base    = CACHE_DIR + '/' + key,
      cached  = {};

  if (path.existsSync(base + '.data')) {
    cached.data = fs.readFileSync(base + '.data', 'utf8');
  }

  if (path.existsSync(base + '.digest')) {
    cached.digest = fs.readFileSync(base + '.digest', 'utf8');
  }

  return cached;
}


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


function cachable(compressor) {
  return function (context, data, callback) {
    var key     = hash(context.logicalPath + context.contentType),
        digest  = hash(data + SALT),
        cached  = get_cache(key),
        compressed;

    if (cached.digest === digest) {
      callback(null, cached.data);
      return;
    }

    try {
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


function js_compressor(str) {
  return uglify(str, UGLIFY_CFG);
}


function css_compressor(str) {
  return Csso.justDoIt(str);
}


////////////////////////////////////////////////////////////////////////////////


module.exports.js   = cachable(js_compressor);
module.exports.css  = cachable(css_compressor);
