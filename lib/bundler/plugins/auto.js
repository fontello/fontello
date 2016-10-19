'use strict';


const path    = require('path');
const Promise = require('bluebird');


const map = {
  '.less': 'less',
  '.styl': 'stylus',
  '.scss': 'sass',
  '.jade': 'jade',
  '.pug':  'pug'
};


module.exports = function (context) {

  return Promise.resolve().then(() => {
    let ext = path.extname(context.asset.logicalPath);

    if (!map[ext]) return;

    return context.bundler.__plugins__[map[ext]](context);
  });
};
