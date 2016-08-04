'use strict';


const stylus  = require('stylus');
const path    = require('path');
const _       = require('lodash');
const Promise = require('bluebird');


function resolvePath(file) {
  file = String(file);

  if (file[0] !== '.') {
    try {
      file = require.resolve(file);
    } catch (err) {
      // do nothing - stylus should report itself
    }
  }

  return file;
}


let origFind = stylus.utils.find;


module.exports = function (context) {
  return Promise.resolve().then(() => {
    // monkey-patch lookup with resolver
    stylus.utils.find = function (lookupFile, lookupPaths, thisFilename) {
      return origFind(resolvePath(lookupFile), lookupPaths, thisFilename);
    };

    let style = stylus(context.asset.source, {
      paths: [ path.dirname(context.asset.logicalPath) ],
      filename: context.asset.logicalPath,
      _imports: [],
      'include css': true,
      sourcemap: !context.bundler.sourceMaps ? false : {
        comment: false
      }
    });

    return Promise.fromCallback(cb => style.render(cb)).then(css => {
      // add Stylus `@import`s as dependencies of current asset
      _.forEach(style.options._imports, imported => {
        context.asset.dependOnFile(imported.path);
      });

      context.asset.source = css;
    });
  });
};
