'use strict';


module.exports = async function (context) {
  const autoprefixer = require('autoprefixer');
  const postcss      = require('postcss');

  let ap = postcss([ autoprefixer() ]);

  /* eslint-disable no-undefined */
  let result = await ap.process(context.asset.source, {
    from: undefined,
    map: !context.bundler.sourceMaps ? false : {
      inline: false,
      sourcesContent: true,
      annotation: false,
      prev: context.asset.sourceMap ? JSON.stringify(context.asset.sourceMap) : false
    }
  });

  context.asset.source = result.css;

  if (context.bundler.sourceMaps) {
    context.asset.sourceMap = result.map.toJSON();
  }
};
