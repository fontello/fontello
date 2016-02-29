// Init mongoose connection


'use strict';


var mongoose = require('mongoose');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.wire.before('init:models', function mongoose_init(N) {
    var config = (N.config.database || {}).mongo;

    if (!config) throw 'No MongoDB configuration found';

    N.logger.info('Connecting to MongoDB');

    var options = {
      server  : {
        socketOptions: { keepAlive: 1 }
      },
      replset : {
        socketOptions: { keepAlive: 1 }
      }
    };

    return mongoose.connect(config, options)
      .then(function () {
        N.logger.info('MongoDB connected');
      });
  });
};
