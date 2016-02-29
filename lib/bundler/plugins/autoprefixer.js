'use strict';


const autoprefixer = require('autoprefixer');
const postcss      = require('postcss');


module.exports = function (context, callback) {
  let requirements = [
    'android >= 2.2',
    'bb >= 7',
    'chrome >= 26',
    'ff >= 24',
    'ie >= 9',
    'ios >= 5',
    'opera >= 12',
    'safari >= 5'
  ];
  let ap = postcss([ autoprefixer({ browsers: requirements }) ]);

  context.asset.source = ap.process(context.asset.source).css;
  callback();
};
