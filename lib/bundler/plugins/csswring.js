'use strict';


module.exports = async function (context) {
  const csswring = require('csswring');
  const postcss  = require('postcss');

  let cw = postcss([ csswring() ]);

  /* eslint-disable no-undefined */
  context.asset.source = (await cw.process(context.asset.source, { from: undefined })).css;
};
