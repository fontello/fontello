'use strict';


const path = require('path');


const map = {
  '.less': 'less',
  '.styl': 'stylus',
  '.jade': 'jade'
};


module.exports = function (context, callback) {
  let ext = path.extname(context.asset.logicalPath);

  if (!map[ext]) {
    callback();
    return;
  }

  context.bundler.__plugins__[map[ext]](context, callback);
};
