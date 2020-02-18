'use strict';


module.exports = async function (context) {
  const CleanCSS = require('clean-css');

  let result = await (
    new CleanCSS({ returnPromise: true })
          .minify(context.asset.source)
  );

  context.asset.source = result.styles;
};
