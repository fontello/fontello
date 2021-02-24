'use strict';


const path    = require('path');


const map = {
  '.less': 'less',
  '.styl': 'stylus',
  '.scss': 'sass',
  '.jade': 'jade',
  '.pug':  'pug',
  '.hbs':  'handlebars',
  '.ejs':  'ejs'
};


module.exports = async function (context) {
  let ext = path.extname(context.asset.logicalPath);

  if (!map[ext]) return;

  return context.bundler.__plugins__[map[ext]](context);
};
