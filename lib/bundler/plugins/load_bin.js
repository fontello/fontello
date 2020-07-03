'use strict';


module.exports = function (context) {
  return Promise.resolve().then(() => {
    context.asset.buffer = context.bundler.readFile(context.asset.logicalPath);
  });
};
