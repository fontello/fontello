'use strict';


const Promise  = require('bluebird');


module.exports = function (context) {
  return Promise.resolve().then(() => {
    const UglifyJS = require('uglify-js');

    let result = UglifyJS.minify(context.asset.source, {
      // prevent simplifying "browser-pack/prelude.js" when used in a macros
      compress: { expression: true }
    });

    if (result.error) throw result.error;

    // Special case for "browser-pack/prelude.js": if source will be empty after
    // compression - skip compression, because file may be included by macros.
    if (result.code !== '') {
      context.asset.source = result.code;
    }
  });
};
