'use strict';


const path    = require('path');


function resolvePath(file) {
  file = String(file);

  if (file[0] !== '.') {
    try {
      file = require.resolve(file);
    } catch (err) {
      // do nothing - stylus should report itself
    }
  }

  return file;
}


module.exports = async function (context) {
  const stylus   = require('stylus');
  const origFind = stylus.utils.find;

  // monkey-patch lookup with resolver
  stylus.utils.find = function (lookupFile, lookupPaths, thisFilename) {
    return origFind(resolvePath(lookupFile), lookupPaths, thisFilename);
  };

  let source = context.asset.source;

  let style = stylus(source, {
    paths: [ path.dirname(context.asset.logicalPath) ],
    filename: context.asset.logicalPath,
    _imports: [],
    'include css': true,
    sourcemap: !context.bundler.sourceMaps ? false : {
      comment: false
    }
  });

  context.asset.source = style.render();

  if (context.asset.source.includes('\n/*# sourceMappingURL=')) {
    // bundler shouldn't have inline sitemaps at this point,
    // but we need to remove sitemaps from 3rd party sheets (namely, ekko-lightbox.css)
    context.asset.source = context.asset.source.replace(/\n\/\*# sourceMappingURL=.*?\*\//g, '');
  }

  if (context.bundler.sourceMaps) {
    let map = style.sourcemap;

    map.sourcesContent = map.sources.map(src => {
      if (src === context.asset.logicalPath) return source;
      return context.bundler.readFile(context.asset.logicalPath).toString('utf8');
    });

    context.asset.sourceMap = style.sourcemap;
  }

  // add Stylus `@import`s as dependencies of current asset
  for (let imported of style.options._imports) {
    context.asset.dependOnFile(imported.path);
  }
};
