'use strict';


const less = require('less');
const path = require('path');


module.exports = function (context, callback) {
  let node_modules_abs_path = path.join(path.dirname(require.resolve('less')), '../');

  less.render(context.asset.source, {
    paths: [ path.dirname(context.asset.logicalPath), node_modules_abs_path ],
    optimization: 1,
    filename: context.asset.logicalPath
  }, function (err, data) {
    if (err) {
      callback(err);
      return;
    }

    context.asset.source = data.css;

    data.imports.forEach(file_path => {
      context.asset.dependOnFile(file_path);
    });

    callback();
  });
};
