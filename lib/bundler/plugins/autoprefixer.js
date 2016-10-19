'use strict';


const Promise = require('bluebird');


module.exports = function (context) {

  return Promise.resolve().then(() => {
    const autoprefixer = require('autoprefixer');
    const postcss      = require('postcss');

    // Defaults + Opera 12.1 (still > 1% in Russia)
    let requirements = '> 1%, last 2 versions, Firefox ESR, Opera 12.1';

    let ap = postcss([ autoprefixer({ browsers: requirements }) ]);

    context.asset.source = ap.process(context.asset.source).css;
  });
};
