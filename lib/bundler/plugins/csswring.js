'use strict';


const Promise = require('bluebird');


module.exports = function (context) {

  return Promise.resolve().then(() => {
    const csswring = require('csswring');
    const postcss  = require('postcss');

    let cw = postcss([ csswring() ]);

    context.asset.source = cw.process(context.asset.source).css;
  });
};
