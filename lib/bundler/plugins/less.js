'use strict';


const less    = require('less');
const path    = require('path');
const Promise = require('bluebird');


module.exports = function (context) {
  let node_modules_abs_path = path.join(path.dirname(require.resolve('less')), '../');

  return Promise.fromCallback(cb => {
    less.render(context.asset.source, {
      paths: [ path.dirname(context.asset.logicalPath), node_modules_abs_path ],
      optimization: 1,
      filename: context.asset.logicalPath
    }, cb);
  })
  .then(data => {
    context.asset.source = data.css;

    data.imports.forEach(file_path => {
      context.asset.dependOnFile(file_path);
    });
  });
};
