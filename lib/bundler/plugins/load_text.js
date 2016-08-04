'use strict';


const Promise = require('bluebird');


module.exports = function (context) {
  return Promise.resolve().then(() => {
    context.asset.source = context.bundler.readFile(context.asset.logicalPath, 'utf8');
  });
};
