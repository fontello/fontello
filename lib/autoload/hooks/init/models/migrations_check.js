// Verifies that there are no outstanding migrations.
//


'use strict';


var _        = require('lodash');
var path     = require('path');
var fstools  = require('fs-tools');
var Mongoose = require('mongoose');


////////////////////////////////////////////////////////////////////////////////

//
// Create model & methods
//

var Migration = new Mongoose.Schema({
  _id: { type: String, unique: true}, // app name
  steps: [String]                     // array of migration files for app
}, { strict: true });

// Mark migration as applyed. Each migration
// is identified by (application_name, migration_file_name)
//
Migration.statics.markPassed = function (app_name, step, callback) {
  var model = this;

  model.find({_id: app_name}, function (err, docs) {
    if (err) {
      callback(err);
      return;
    }

    if (docs.length > 0) {
      model.update({_id: app_name}, { $push: { steps: step }}, callback);
    } else {
      model.create({_id: app_name, steps: [step]}, callback);
    }
  });
};

// Returns hash of (application_name, [migration_file_names])
//
Migration.statics.getLastState = function (callback) {
  this.find({}, function (err, docs) {
    var last_state = {};
    if (!err) {
      for (var i = 0; i < docs.length; i++) {
        last_state[docs[i]._id] = docs[i].steps;
      }
    }
    callback(err, last_state);
  });
};

//  checkMigrations(currentMigrations) -> Array
//  - currentMigrations (Array): array of already used migrations
//    `{ <appName> : [ <step>, ... ], ... }`
//
//  Compare `currentMigrations` with available and returns an array of
//  outstanding migrations as an array of _migrations_.
//
//  ##### Migration
//
//  - **appName**:      module name
//  - **step**:         migration step name
//  - **up(callback)**: runs migration up
//
Migration.statics.checkMigrations = function (N, currentMigrations) {

  var MIGRATIONS_DIR = 'db/migrate';

  // returns list of migration files for an application
  //
  function findMigrations(app) {
    var
    dirname = path.join(app.root, MIGRATIONS_DIR),
    results = [];

    fstools.walkSync(dirname, /\d{14}_\w*\.js$/, function (file) {
      // skip:
      // - dirname in path starts with underscore, e.g. /foo/_bar/baz.js
      if (file.match(/(^|\/|\\)_/)) { return; }

      results.push(path.basename(file));
    });

    return results;
  }


  var pending = [];

  currentMigrations = currentMigrations || {};

  N.runtime.apps.forEach(function (app) {
    var appMigrations = currentMigrations[app.name] || [];

    findMigrations(app).forEach(function (step) {
      if (-1 === appMigrations.indexOf(step)) {
        pending.push({
          app   : app,
          step  : step,
          appName   : app.name,
          filename  : path.join(app.root, MIGRATIONS_DIR, step)
        });
      }
    });
  });

  // Sort the resulting list by base filenames.
  // That names start with a timestamp, so we'll get the right order.
  return _.sortBy(pending, 'step');
};


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.wire.after("init:models", { priority: 999 }, function migrations_init(N) {
    N.models.Migration = Mongoose.model('migrations', Migration);
  });

  N.wire.after("init:models", { priority: 999 }, function migrations_check(N, next) {

    N.models.Migration.getLastState(function (err, currentMigrations) {
      if (err) {
        next(err);
        return;
      }

      if (0 < N.models.Migration.checkMigrations(N, currentMigrations).length) {
        next("Can't start: database changed. Please, run `mirgate --all` command");
        return;
      }

      N.logger.info('Checked DB migrations');
      next();
    });
  });
};
