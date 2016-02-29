// Cached fs functions

'use strict';


const fs     = require('fs');
const _      = require('lodash');
const yaml = require('js-yaml');


var stat_cache = {};

function stat(pathname) {
  if (!_.has(stat_cache, pathname)) {
    try {
      stat_cache[pathname] = fs.statSync(pathname);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      stat_cache[pathname] = null;
    }
  }

  return stat_cache[pathname];
}


var dir_cache = {};

function dir(dirname) {
  if (!_.has(dir_cache, dirname)) {
    try {
      dir_cache[dirname] = fs.readdirSync(dirname);
    } catch (__) {
      dir_cache[dirname] = null;
    }
  }

  return dir_cache[dirname];
}


var file_cache = {};

function file(filename, encoding) {
  encoding = encoding || null;

  if (!file_cache[encoding]) {
    file_cache[encoding] = {};
  }

  if (!_.has(file_cache[encoding], filename)) {
    try {
      file_cache[encoding][filename] = fs.readFileSync(filename, encoding);
    } catch (__) {
      file_cache[encoding][filename] = null;
    }
  }

  return file_cache[encoding][filename];
}


function reset() {
  stat_cache = {};
  dir_cache  = {};
  file_cache = {};
}


module.exports.stat  = stat;
module.exports.dir   = dir;
module.exports.file  = file;
module.exports.reset = reset;


module.exports.yaml = function (filename) {
  let content = file(filename, 'utf8');

  if (content === null) throw new Error(`Can't find file ${filename}`);

  return yaml.safeLoad(content, { filename });
};
