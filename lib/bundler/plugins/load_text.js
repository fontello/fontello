'use strict';


module.exports = async function (context) {
  context.asset.source = context.bundler.readFile(context.asset.logicalPath, 'utf8');
  context.asset.sourceMap = JSON.parse(context.bundler.readFile(context.asset.logicalPath + '.map', 'utf8'));
};
