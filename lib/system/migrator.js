// Internal methods to run migrations used by migrate CLI script and migration
// validation filter


'use strict';


// stdlib
var path = require('path');


// 3rd-party
var fstools = require('fs-tools');


////////////////////////////////////////////////////////////////////////////////


var MIGRATIONS_DIR = 'db/migrate';


////////////////////////////////////////////////////////////////////////////////


// returns list of migration files for an application
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


// Single migration representation
function Migration(app, step) {
  this.app  = app;
  this.step = step;

  this.appName  = this.app.name;
  this.filename = path.join(this.app.root, MIGRATIONS_DIR, this.step);
}


////////////////////////////////////////////////////////////////////////////////


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
exports.checkMigrations = function checkMigrations(N, currentMigrations) {
  var delta = [];

  currentMigrations = currentMigrations || {};

  N.runtime.apps.forEach(function (app) {
    var appMigrations = currentMigrations[app.name] || [];

    findMigrations(app).forEach(function (step) {
      if (-1 === appMigrations.indexOf(step)) {
        delta.push(new Migration(app, step));
      }
    });
  });

  return delta;
};
