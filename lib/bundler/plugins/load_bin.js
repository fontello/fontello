'use strict';


module.exports = async function (context) {
  context.asset.buffer = context.bundler.readFile(context.asset.logicalPath);

  // all assets with source maps are loaded as `load_text`
  //context.asset.sourceMap = JSON.parse(context.bundler.readFile(context.asset.logicalPath + '.map', 'utf8'));
};
