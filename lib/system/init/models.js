// Populates N.models tree
//


'use strict';


// stdlib
var path = require('path');


// 3rd-party
var _       = require('lodash');
var fstools = require('fs-tools');


// internal
var apify = require('./utils/apify');


////////////////////////////////////////////////////////////////////////////////


// Denormalizes and expands flat tree:
//
//    var o = { 'foo.bar': 1, boo: 2 };
//
//    expandTree(o); // -> { foo: { bar: 1 }, 'foo.bar': 1, boo: 2 };
//
//    o.foo.bar === o['foo.bar'];
//
function expandTree(obj) {
  _(obj).keys().sort().filter(function (key) {
    return 0 <= key.indexOf('.');
  }).each(function (key) {
    var tmp = obj, parts = key.split('.'), k;

    while (1 < parts.length) {
      k   = parts.shift();
      tmp = (tmp[k] = tmp[k] || {});
    }

    tmp[parts.pop()] = obj[key];
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.models = {};

  // Load models, and leave them for lazy-init
  //
  _.each(N.runtime.apps, function (app) {
    var modelsRoot = path.join(app.root, 'models');

    fstools.walkSync(modelsRoot, /\.js$/, function (file) {
      var collectionName;

      // skip "hidden" files (name/dir starts with underscore)
      if (file.match(/(^|\/|\\)_/)) { return; }

      collectionName  = apify(file, modelsRoot, /\.js$/);

      // It can throw excepthin, that will be catchen in runner
      require(file)(N, collectionName);
    });
  });


  // Beautify API tree
  //
  N.wire.after('init:models', function models_init_done(N) {
    expandTree(N.models);
    N.logger.info('Models init done');
  });
};
