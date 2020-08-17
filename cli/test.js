// Run tests & exit
//

'use strict';


const _       = require('lodash');
const glob    = require('glob');
const Mocha   = require('mocha');
const path    = require('path');


////////////////////////////////////////////////////////////////////////////////


module.exports.parserParameters = {
  add_help: true,
  help: 'run test suites',
  description: 'Run all tests of enabled apps'
};


module.exports.commandLineArguments = [
  {
    args: [ 'app' ],
    options: {
      metavar: 'APP_NAME',
      help: 'Run tests of specific application only',
      nargs: '?',
      default: null
    }
  },

  {
    args:     [ '-m', '--mask' ],
    options: {
      dest:   'mask',
      help:   'Run only tests, containing MASK in name',
      type:   'string',
      default: []
    }
  }
];


////////////////////////////////////////////////////////////////////////////////

module.exports.run = async function (N, args) {

  if (!process.env.NODECA_ENV) {
    throw 'You must provide NODECA_ENV in order to run nodeca test';
  }

  // Expose N to globals for tests
  global.TEST = { N };

  await Promise.resolve()
    .then(() => N.wire.emit('init:models', N))
    .then(() => N.wire.emit('init:bundle', N))
    .then(() => N.wire.emit('init:services', N))
    .then(() => N.wire.emit('init:tests', N));

  let mocha        = new Mocha({ timeout: 60000 });
  let applications = N.apps;

  mocha.reporter('spec');
  // mocha.ui('bdd');

  // if app set, check that it's valid
  if (args.app) {
    if (!_.find(applications, app => app.name === args.app)) {
      let msg = `Invalid application name: ${args.app}\n` +
          'Valid apps are:  ' + _.map(applications, app => app.name).join(', ');

      throw msg;
    }
  }

  let testedApps = [];

  if (args.app) {
    // if app is defined, add it and all modules recursively
    applications.filter(app => args.app === app.name).forEach(function addApp(app) {
      testedApps.push(app);

      app.config.modules.forEach(m => {
        let modulePath = path.join(app.root, m);

        applications.filter(app => app.root === modulePath).forEach(addApp);
      });
    });
  } else {
    // otherwise test all applications
    testedApps = applications;
  }

  _.forEach(testedApps, app => {
    glob.sync('**', { cwd: app.root + '/test' })
      // skip files when
      // - filename starts with _, e.g.: /foo/bar/_baz.js
      // - dirname in path starts _, e.g. /foo/_bar/baz.js
      .filter(name => !/^[._]|\\[._]|\/[_.]/.test(name))
      .forEach(file => {
        // try to filter by pattern, if set
        if (args.mask && path.basename(file).indexOf(args.mask) === -1) {
          return;
        }

        if ((/\.js$/).test(file) && path.basename(file)[0] !== '.') {
          mocha.files.push(`${app.root}/test/${file}`);
        }
      });
  });

  await new Promise((resolve, reject) => {
    mocha.run(err => (err ? reject(err) : resolve()));
  });

  await N.wire.emit('exit.shutdown');
};
