'use strict';


module.exports = function (context, callback) {
  context.asset.buffer = context.bundler.readFile(context.asset.logicalPath);

  callback();
};
