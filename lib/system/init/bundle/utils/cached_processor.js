// Process files with iterator, trying to use cached result.
// Cache will be used in this case:
//
// - mtime not changed or md5 not changes
// - the same for dependencies
//
'use strict';


var fs      = require('fs');
var path    = require('path');
var crypto  = require('crypto');
var assert  = require('assert');


var _       = require('lodash');
var fstools = require('fs-tools');
var fscached   = require('./fs_cached');


// Cache structure:
//
// {
//   <file_path>: {
//     data: ...
//     deps: {
//       <dep_file_path>: {
//         mtime: ...
//         md5: ...
//       }
//     }
//   }
// }
//
// NOTE: Dependencies include processed file itself


// calculate file digest (md5), cached
//
var fileDigest = _.memoize(function (file) {
  var content = '';
  try { content = fs.readFileSync(file); } catch(e) {}
  return crypto.createHash('md5').update(content).digest('hex');
});


/**
 * new CachedProcessor
 * - options (Object):
 *
 * options:
 *
 * - cache - path to cache file
 * - self (true) - add self to dependencies. Set `false` to skip.
 * - compact (true) - set `false` to keep records without hits on save
 * - autosave (500) - delay in ms to autosave cache state. set `false` or 0 to disable.
 **/
function CachedProcessor(options) {
  assert.ok(options, 'You must define cached processor options');

  this.cachePath = options.cache;
  this.compact = options.compact === false ? false : true;

  assert.ok(this.cachePath, 'You must define cache path');

  // Cache
  this.cache = {};
  try {
    this.cache = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
  } catch (__) {}

  // Cache hits, used to remove old entries
  this.hits = {};

  this.addSelf = (options.self === false) ? false : true;

  this.autosave = 0;
  if (options.autosave !== false && options.autosave !== 0) {
    this.autosave = options.autosave || 500;
  }

  var self = this;
  this.__save = _.debounce(function () {
    self.save();
  }, this.autosave);
}


CachedProcessor.prototype.process = function (/*path*/) {
  throw new Error('Transformer not defined');
};


// Set dependencies for given file. Cache become invalid
// if dependencies change.
//
CachedProcessor.prototype.addDependencies = function (path, list) {
  assert.ok(this.cache[path], 'Object "' + path + '" not found.');
  if (list.length === 0) { return; }

  var self = this;

  list.forEach(function (file) {
    var stat = fscached.statSync(file);
    var deps = self.cache[path].deps;

    deps[file] = {};
    deps[file].mtime = stat.mtime.getTime();
    deps[file].md5   = crypto
                          .createHash('md5')
                          .update(fs.readFileSync(file))
                          .digest('hex');
  });

  if (this.autosave) { this.__save(); }
};


// Save all cached data to disk
//
CachedProcessor.prototype.save = function () {
  var to_save = {};

  if (this.compact) {
    // remove cache entries without hits
    _.forOwn(this.hits, function (val, key) {
      if (val) { to_save[key] = this.cache[key]; }
    }, this);
  } else {
    to_save = this.cache;
  }

  // Avoid clashes in "multithread" enviroment -
  // write to temporary file, then rename.
  var dirname = path.dirname(this.cachePath);
  var tmp = path.join(dirname, crypto.randomBytes(8).toString('hex'));

  fstools.mkdirSync(dirname);
  fs.writeFileSync(tmp, JSON.stringify(to_save, null, 2));

  try {
    fs.unlinkSync(this.cachePath);
  } catch (__) {}
  try {
    fs.renameSync(tmp, this.cachePath);
  } catch (__) {
    fs.unlinkSync(tmp);
  }
};


// Get processed data or build if not exists
//
CachedProcessor.prototype.get = function (file) {
  var cacheValid = false;

  // If cache exists, try to validate
  if (this.cache[file]) {
    cacheValid = true;

    _.forOwn(this.cache[file].deps, function (dep, name) {
      var stat;
      try {
        stat = fscached.statSync(name);
      } catch (__) {
        // file not exists
        cacheValid = false;
        return false; // terminate
      }

      // check mtime first, that's faster
      if (dep.mtime === stat.mtime.getTime()) { return; }
      // check md5
      if (dep.md5 === fileDigest(name)) {
        // update mtime value for next time
        dep.mtime = stat.mtime.getTime();
        if (this.autosave) { this.__save(); }
        return;
      }

      cacheValid = false;
      return false; // terminate
    }, this);
  }

  if (cacheValid) {
    // can be undefined (on load from cache)
    this.hits[file] = (this.hits[file] || 0) + 1;
    return this.cache[file].data;
  }

  // Create cache entry
  // Do it before `process` call, to allow add
  // dependencies from iterator
  this.cache[file] = { data: '', deps: {} };
  this.hits[file] = 1;
  if (this.addSelf) {
    this.addDependencies(file, [file]); // add self
  }


  this.cache[file].data = this.process(file);

  if (this.autosave) { this.__save(); }

  return this.cache[file].data;
};


// Make sure that files from list exists in item dependencies.
// Or reset cache if not.
//
CachedProcessor.prototype.checkDepList = function (item, list) {
  if (!this.cache[item]) { return; }

  // compare sorted arrays as strings
  if (Object.keys(this.cache[item].deps).sort().join('::') !== list.sort().join('::')) {
    delete this.cache[item];
  }
};


module.exports = CachedProcessor;