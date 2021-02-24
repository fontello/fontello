'use strict';


module.exports = async function (context) {
  const handlebars = require('handlebars');

  context.asset.source = handlebars.precompile(context.asset.source);
};
