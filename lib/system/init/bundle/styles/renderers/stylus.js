// Stylus Renderer that understands `@[<pkgName>]/filename` imports.
//


'use strict';


var _      = require('lodash');
var fs     = require('fs');
var path   = require('path');
var stylus = require('stylus');


////////////////////////////////////////////////////////////////////////////////


// keep reference to original lookup function of stylus
var origFind = stylus.utils.find;


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


module.exports = function (filename) {
  var renderer,
      result,
      imports = [];

  renderer = stylus(fs.readFileSync(filename, 'utf8'), {
    paths:    [ path.dirname(filename) ]
  , filename: filename
  , _imports: imports
  });

  // monkey-patch lookup with resolver
  stylus.utils.find = function (lookupFile, lookupPaths, thisFilename) {
    return origFind(resolvePath(lookupFile), lookupPaths, thisFilename);
  };

  // render stylus file and restore lookup function
  result = renderer.render();
  stylus.utils.find = origFind;

  return {
    css: result,
    // array of imported file names, including current one
    imports: _.map(imports, function (entry) { return entry.path; })
  };
};
