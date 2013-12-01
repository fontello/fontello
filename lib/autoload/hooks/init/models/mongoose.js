// starts mongoose server and stores it as `N.runtime.mongoose`
//


'use strict';


var Mongoose = require('mongoose');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.wire.before('init:models', function mongoose_init(N, callback) {
    var config = (N.config.database || {}).mongo, uri = 'mongodb://';

    if (!config) {
      callback('No MongoDB configuration found');
      return;
    }

    N.logger.info('Connecting to MongoDB');

    // build mongodb connection uri
    if (config.user) {
      uri += config.user + (config.pass ? ':'+config.pass : '') + '@';
    }

    uri += config.host + (config.port ? ':'+config.port : '');

    uri += '/' + config.database;

    // connect to database
    N.runtime.mongoose = Mongoose;

    var options = {
      server  : {
        socketOptions: { keepAlive: 1 }
      },
      replset : {
        socketOptions: { keepAlive: 1 }
      }
    };

    Mongoose.connect(uri, options, function (err) {
      if (err) {
        callback('MongoDB error: ' + String(err.message || err));
        return;
      }

      N.logger.info('MongoDB connected');
      callback();
    });
  });
};
