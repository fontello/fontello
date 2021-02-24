'use strict';


module.exports = async function (context) {
  const ejs = require('ejs');

  context.asset.source = ejs.compile(context.asset.source, {
    client: true,
    _with: false // disable `with` for better speed
  }).toString();
};
