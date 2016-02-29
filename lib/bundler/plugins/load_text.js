'use strict';


module.exports = function (context, callback) {
  context.asset.source = context.bundler.readFile(context.asset.logicalPath, 'utf8');

  callback();
};
