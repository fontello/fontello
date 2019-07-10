'use strict';


module.exports = async function (context) {
  const autoprefixer = require('autoprefixer');
  const postcss      = require('postcss');

  let ap = postcss([ autoprefixer() ]);

  /* eslint-disable no-undefined */
  context.asset.source = (await ap.process(context.asset.source, { from: undefined })).css;
};
