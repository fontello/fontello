'use strict';


module.exports = async function (context) {
  const CleanCSS = require('clean-css');

  let result = await (
    new CleanCSS({ returnPromise: true, sourceMap: !!context.bundler.sourceMaps, sourceMapInlineSources: true })
          .minify({
            [context.asset.sourceMapPath]: {
              styles: context.asset.source,
              sourceMap: context.asset.sourceMap
            }
          })
  );

  context.asset.source = result.styles;

  if (context.bundler.sourceMaps) {
    context.asset.sourceMap = result.sourceMap.toJSON();
  }
};
