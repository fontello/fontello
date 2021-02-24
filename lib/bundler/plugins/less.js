'use strict';


const path    = require('path');


module.exports = async function (context) {
  let node_modules_abs_path = path.join(path.dirname(require.resolve('less')), '../');

  const less = require('less');

  let data = await less.render(context.asset.source, {
    paths: [ path.dirname(context.asset.logicalPath), node_modules_abs_path ],
    optimization: 1,
    filename: context.asset.logicalPath
  });

  context.asset.source = data.css;

  data.imports.forEach(file_path => {
    context.asset.dependOnFile(file_path);
  });
};
