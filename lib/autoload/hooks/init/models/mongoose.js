// starts mongoose server and stores it as `N.runtime.mongoose`
//


"use strict";


var Mongoose = require('mongoose');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.wire.before("init:models", function mongoose_init(N, callback) {
    var config = (N.config.database || {}).mongo, uri = 'mongodb://';

    if (!config) {
      callback('No MongoDB configuration found');
      return;
    }

    N.logger.info('Connecting to MongoDB');

    // build mongodb connection uri
    if (config.user) {
      uri += config.user;

      if (config.pass) {
        uri += ':' + config.pass;
      }

      uri += '@';
    }

    uri += config.host;

    if (config.port) {
      uri += ':' + config.port;
    }

    uri += '/' + config.database;

    // connect to database
    N.runtime.mongoose = Mongoose;
    Mongoose.connect(uri, function (err) {
      if (err) {
        callback("MongoDB error: " + String(err.message || err));
        return;
      }

      N.logger.info('MongoDB connected');
      callback();
    });
  });
};
