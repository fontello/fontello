// Wrapper plugin, wrap asset source using `.wrapBefore` and `.wrapAfter`
//
'use strict';

const concat_sources = require('../utils/concat_sources');


module.exports = async function (context) {
  // empty assets don't need wrapper
  if (!context.asset.source) return;

  let before = context.asset.wrapBefore, after = context.asset.wrapAfter;

  // no wrappers set
  if (!before && !after) return;

  let { source, map } = concat_sources([
    { source: before },
    {
      source: context.asset.source,
      map: context.asset.sourceMap,
      filename: context.asset.sourceMapPath
    },
    { source: after }
  ], !!context.bundler.sourceMaps);

  context.asset.source = source;
  context.asset.sourceMap = map;
};
