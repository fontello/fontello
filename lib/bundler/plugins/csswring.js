'use strict';


const csswring = require('csswring');
const postcss  = require('postcss');


module.exports = function (context, callback) {
  let cw = postcss([ csswring() ]);

  context.asset.source = cw.process(context.asset.source).css;
  callback();
};
