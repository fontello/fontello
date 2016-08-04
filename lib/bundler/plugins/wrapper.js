// Wrapper plugin, wrap asset source using `.wrapBefore` and `.wrapAfter`
//
'use strict';


const Promise = require('bluebird');


module.exports = function (context) {
  return Promise.resolve().then(() => {
    // Empty assets don't need wrapper.
    if (context.asset.source) {
      context.asset.source = [
        context.asset.wrapBefore,
        context.asset.source,
        context.asset.wrapAfter
      ].join('');
    }
  });
};
