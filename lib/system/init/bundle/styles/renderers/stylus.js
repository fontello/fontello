// Stylus Renderer that understands `@[<pkgName>]/filename` imports.
//


'use strict';


var _      = require('lodash');
var fs     = require('fs');
var path   = require('path');
var stylus = require('stylus');
var nib    = require('nib');


////////////////////////////////////////////////////////////////////////////////


// keep reference to original lookup function of stylus
var origLookup = stylus.utils.lookup;


// resolves `<node_module>/path/name` pathnames
function resolvePath(file) {
  file = String(file);

  if ('.' !== file[0]) {
    try {
      file = require.resolve(file);
    } catch (err) {
      // do nothing - stylus should report itself
    }
  }

  return file;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (filename, options) {
  var renderer,
      result,
      imports = [];

  renderer = stylus(fs.readFileSync(filename, 'utf8'), _.extend({}, options, {
    paths:    [ path.dirname(filename) ]
  , filename: filename
  , _imports: imports
  }));

  // allow `@import "nib"`
  renderer.use(nib());

  // monkey-patch lookup with resolver
  stylus.utils.lookup = function (lookupFile, lookupPaths, thisFilename) {
    return origLookup(resolvePath(lookupFile), lookupPaths, thisFilename);
  };

  // render stylus file and restore lookup function
  result = renderer.render();
  stylus.utils.lookup = origLookup;

  return {
    css: result,
    // array of imported file names, including current one
    imports: _.map(imports, function (entry) { return entry.filename; })
  };
};
