// Populates N.models tree
//


'use strict';


const path  = require('path');
const glob  = require('glob').sync;
const _     = require('lodash');
const apify = require('./utils/apify');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.models = {};

  N.apps.forEach(app => {
    let rootDir = path.join(app.root, 'models');

    glob('**/*.js', {
      cwd: rootDir
    })
    .filter(name => !/^[._]|\\[._]|\/[_.]/.test(name))
    .forEach(name => require(path.join(rootDir, name))(N, apify(name)));
  });


  // Beautify API tree
  //
  N.wire.after('init:models', function models_init_done(N) {
    // Denormalizes and expands flat tree
    _.forEach(N.models, (model, p) => {
      delete N.models[p];
      _.set(N.models, p, model);
    });

    N.logger.info('Models init done');
  });
};
