'use strict';


module.exports = async function (context) {
  const autoprefixer = require('autoprefixer');
  const postcss      = require('postcss');

  // Defaults + Opera 12.1 (still > 1% in Russia)
  let requirements = '> 1%, last 2 versions, Firefox ESR, Opera 12.1';

  let ap = postcss([ autoprefixer({ browsers: requirements }) ]);

  /* eslint-disable no-undefined */
  context.asset.source = (await ap.process(context.asset.source, { from: undefined })).css;
};
