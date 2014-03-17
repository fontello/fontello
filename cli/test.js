// Run tests & exit
//

'use strict';


// stdlib
var path      = require('path');


// 3rd-party
var _         = require('lodash');
var Mocha     = require('mocha');
var fstools   = require('fs-tools');



////////////////////////////////////////////////////////////////////////////////


module.exports.parserParameters = {
  addHelp: true,
  help: 'run test suites',
  description: 'Run all tests of enabled apps'
};


module.exports.commandLineArguments = [
  {
    args: ['app'],
    options: {
      metavar: 'APP_NAME',
      help: 'Run tests of specific application only',
      nargs: '?',
      defaultValue: null
    }
  }
];


////////////////////////////////////////////////////////////////////////////////


module.exports.run = function (N, args, callback) {
  if (!process.env.NODECA_ENV) {
    callback('You must provide NODECA_ENV in order to run nodeca test');
    return;
  }

  N.wire.emit([
      'init:models',
      'init:bundle',
      'init:server'
    ], N,

    function (err) {
      if (err) {
        callback(err);
        return;
      }

      var mocha = new Mocha();
      var applications = N.runtime.apps;

      mocha.reporter('spec');
      mocha.ui('bdd');

      // if app set, chack that it's valid
      if (args.app) {
        if (!_.find(applications, function (app) { return app.name === args.app; })) {
          console.log('Invalid application name: ' + args.app);
          console.log(
            'Valid apps are:  ',
             _.map(applications, function (app) { return app.name; }).join(', ')
          );
          process.exit(1);
        }
      }

      _.each(applications, function (app) {
        if (!args.app || args.app === app.name) {
          fstools.walkSync(app.root + '/test', function (file) {
            // skip files when
            // - filename starts with _, e.g.: /foo/bar/_baz.js
            // - dirname in path starts _, e.g. /foo/_bar/baz.js
            if (file.match(/(^|\/|\\)_/)) { return; }

            if ((/\.js$/).test(file) && '.' !== path.basename(file)[0]) {
              mocha.files.push(file);
            }
          });
        }
      });

      // Expose N to globals for tests
      global.TEST_N = N;

      mocha.run(function (err) {
        if (err) {
          callback(err);
          return;
        }

        process.exit(0);
      });
    }
  );
};
