// Read configs, init loggers, init apps, fills N object.


'use strict';


const cluster     = require('cluster');
const crypto      = require('crypto');
const fs          = require('fs');
const path        = require('path');
const Promise     = require('bluebird');

const _           = require('lodash');
const log4js      = require('log4js');
const validator   = require('is-my-json-valid');
const email_regex = require('email-regex');
const yaml        = require('js-yaml');
const wire        = require('event-wire');
const glob        = require('glob').sync;
const mkdirp      = require('mkdirp').sync;

const Application = require('./application');
const stopwatch   = require('../init/utils/stopwatch');


////////////////////////////////////////////////////////////////////////////////

// merge configs, respecting `~override: true` instructions
function mergeConfigs(dst, src) {
  _.forEach(src || {}, (value, key) => {

    // if destination exists & already has `~override` flag, keep it intact
    if (_.isObject(dst[key]) && dst[key]['~override']) return;

    // if source has `~override` flag - override whole value in destination
    if (value && value['~override']) {
      dst[key] = value;
      return;
    }

    // if both nodes are arrays, concatenate them
    if (_.isArray(value) && _.isArray(dst[key])) {
      value.forEach(v => { dst[key].push(v); });
      return;
    }

    // if both nodes are objects - merge recursively
    if (_.isObject(value) && _.isObject(dst[key])) {
      mergeConfigs(dst[key], value);
      return;
    }

    // destination node does not exist - create
    // or both nodes are of different types - override.
    dst[key] = value;
    return;
  });

  return dst;
}

// Remove `~override` flag recursively
function cleanupConfigs(cfg) {
  if (!_.isPlainObject(cfg)) return;
  if (cfg['~override']) delete cfg['~override'];

  _.forEach(cfg, cleanupConfigs);
}

// reads all *.yml files from `dir` and merge resulting objects into single one
function loadConfigs(root) {
  let config = {};

  glob('**/*.yml', {
    cwd: root
  })
  .sort() // files order can change, but we shuld return the same result always
  .map(file => path.join(root, file))
  .forEach(file => {
    mergeConfigs(config, yaml.safeLoad(fs.readFileSync(file, 'utf8'), { filename: file }));
  });

  cleanupConfigs(config);

  return config;
}


// Returns an object with keys:
//
//   `responderName` (string)
//   `splittedMethod` (array)
//
// Each one may be `null` which means 'any'.
//
//   'rpc@'             => { responderName: 'rpc',  splittedMethod: null }
//   'http@forum.index' => { responderName: 'http', splittedMethod: [ 'forum', 'index' ] }
//   'blogs'            => { responderName: null,   splittedMethod: [ 'blogs' ] }
//
function parseLoggerName(name) {
  let responderName, splittedMethod, parts = name.split('@');

  if (parts.length === 1) {
    responderName  = null;
    splittedMethod = name.split('.');

  } else if (parts.length === 2) {
    responderName  = parts[0];
    splittedMethod = parts[1].split('.');

  } else {
    // Bad name format. Only one @ symbol is allowed.
    return null;
  }

  if (_.compact(splittedMethod).length === 0) {
    splittedMethod = null;
  }

  return { responderName, splittedMethod };
}


// Application in list could be defined as plain object or string:
//
// - { "nodeca.site": "https://github.com/nodeca/nodeca.site" }
// - nodeca.users
//
// return `nodeca.users`, `nodeca.site`, etc.
//
function getAppName(app) {
  if (_.isPlainObject(app)) {
    let keys = Object.keys(app);

    if (keys.length === 1) {
      return keys[0];
    }

    throw new Error('Ill-formed list of applications.');
  }

  return String(app);
}


// Check list of applications, if application is
// missed - try to install it via npm.
//
async function installAppsIfMissed(N, apps) {
  let appName, appNpmPath,
      missed = [];

  for (let app of apps) {
    if (_.isPlainObject(app)) {
      appName = getAppName(app);
      appNpmPath = app[appName];
    } else {
      appName = appNpmPath = String(app);
    }

    try {
      require.resolve(appName);
    } catch (__) {
      missed.push(appNpmPath);
    }
  }

  if (missed.length) {
    /* eslint-disable no-console */
    console.log(`Missed apps: ${missed.join(', ')}. Installing...`);

    require('child_process').execSync(
      `yarn add ${missed.join(' ')} --production --non-interactive`,
      { stdio: 'inherit', cwd: N.mainApp.root }
    );
  }

  // in node 6 `require()` for new packages start work in nextTick only.
  let nextTick = require('util').promisify(process.nextTick);
  await nextTick();
}


////////////////////////////////////////////////////////////////////////////////


// Init `N.wire` with time tracking
//
// override:
//
// - on
// - off
//
function initWire(N) {
  N.wire  = wire({
    p:  Promise,
    co: (fn, params) => Promise.coroutine(fn)(params)
  });

  function findPuncher(params) {
    // Try find puncher
    return _.get(params, 'extras.puncher') ||
           _.get(params, 'env.extras.puncher');
  }

  N.wire.hook('eachBefore', function (handler, params) {
    let puncher = findPuncher(params);

    if (puncher) puncher.start(handler.name);
  });

  N.wire.hook('eachAfter', function (handler, params) {
    let puncher = findPuncher(params);

    if (puncher) puncher.stop();
  });
}


function initScope(N) {

  // provide some empty structures
  N.client  = {};
  N.views   = {};

  // Storage for validators (each key is a `apiPath`)
  let validateFn = {};

  // Additional format extentions
  let validateFormatExt = {
    mongo: /^[0-9a-f]{24}$/,
    email: email_regex({ exact: true })
  };

  /**
   *  N.validate(apiPath, schema) -> Void
   *  N.validate(schema) -> Void
   *  - apiPath (String): server api path relative to the current api node
   *  - schema (Object): validation schema (for proprties only)
   *
   *  Add validation schema for params of apiPath.
   *
   *  ##### Schema
   *
   *  You can provide full JSON-Schema compatible object:
   *
   *      {
   *        properties: {
   *          id: { type: 'integer', minimal: 1 }
   *        },
   *        additionalProperties: false
   *      }
   *
   *  But for convenience we provide a syntax sugar for this situation, so the
   *  above is long-hand syntax of:
   *
   *      {
   *        id: { type: 'integer', minimal: 1 }
   *      }
   **/
  N.validate = function (apiPath, schema) {
    if (!schema || !schema.properties) {
      schema = {
        properties: schema,
        additionalProperties: false
      };
    }

    validateFn[apiPath] = validator(schema, {
      formats: validateFormatExt,
      verbose: true
    });
  };


  /** internal
   *  N.validate.test(apiPath, params) -> Object|Null
   *
   *  Runs revalidate of apiPath for given params. Returns structure with
   *  `valid:Boolean` and `errors:Array` properties or `Null` if apiPath has no
   *  schema.
   **/
  N.validate.test = function (apiPath, params) {
    if (validateFn[apiPath]) {
      if (validateFn[apiPath](params)) return { valid: true, errors: [] };
      return { valid: false, errors: validateFn[apiPath].errors };
    }

    return null;
  };
}


function initConfig(N, mainConfig) {
  //
  // Create empty object that we'll fill in a second
  //

  N.config = {};

  //
  // Start reading configs:
  //
  // - Main app config stored into mainConfig
  // - Sub-apps configs got merged into N.config
  // - After all mainConfig got merged into N.config
  //

  // read configs of sub-applications
  if (mainConfig.applications && mainConfig.applications.length) {
    _.forEach(mainConfig.applications, app => {
      let root = path.join(path.dirname(require.resolve(getAppName(app))), '/config');

      mergeConfigs(N.config, loadConfigs(root));
    });
  }

  // merge in main config and resolve `per-environment` configs
  mergeConfigs(N.config, mainConfig);

  // set application environment
  N.environment = process.env.NODECA_ENV || N.config.env_default || 'development';

  // do global expansion first
  // merge `^all` branch
  if (N.config['^all']) {
    mergeConfigs(N.config, N.config['^all']);
    delete N.config['^all'];
  }

  // expand environment-dependent configs
  _.forEach(N.config, (val, key) => {
    if (key[0] === '^') {
      delete N.config[key];

      if (N.environment === key.substr(1)) {
        mergeConfigs(N.config, val);
      }
    }
  });

  //
  // Post-process config.
  //
  N.config.options = N.config.options || {};
}


function initLogger(N) {
  let mainRoot     = N.mainApp.root,
      config       = _.assign({}, N.config.logger),
      options      = _.assign({ file: { logSize: 10, backups: 5 } }, config.options),
      // common logging level (minimal threshold)
      baseLevel    = log4js.levels.getLevel(options.level, log4js.levels.ALL),
      // should it log everything to console or not
      logToConsole = (N.environment !== 'production' || process.stdout && process.stdout.isTTY),
      // real loggers created for each entry in the config
      loggers      = [],
      // cache of met channels, maps full channel names to corresponding loggers
      channels     = {};


  // Layout for file loggers
  //
  //  %d - date
  //  %p - log level
  //  %z - pid
  //  %c - category
  //  %m - message
  //
  let plainLayout = {
    type: 'pattern',
    pattern: '[%d] [%p] %z %c - %m'
  };

  // Layout for console loggers
  //
  // only difference is `%[`..`%]` - defines highlighted (coloured) part
  //
  let colouredLayout = {
    type: 'pattern',
    pattern: '%[[%d] [%p] %z %c -%] %m'
  };

  //
  // define system (general) logger
  //

  N.logger = log4js.getLogger('system');

  //
  // provide a wrapper to set global log level
  //

  N.logger.setLevel = function (level) {
    level = log4js.levels[level.toUpperCase()];
    N.logger.level = level;
    for (let logger of loggers) logger.level = level;
  };


  //
  // provide shutdown wrapper
  //
  N.logger.shutdown = function (cb) {
    log4js.shutdown(cb);
  };


  //
  // provide getLogger wrapper
  //

  N.logger.getLogger = function (name) {
    if (channels[name]) return channels[name];

    let inputInfo = parseLoggerName(name);

    if (!inputInfo) {
      N.logger.error('Unacceptable logger channel name <%s>. Using <system>.', name);
      return N.logger;
    }

    // Loggers match rules:
    //
    // Example loggers: `rpc@foo.bar`, `foo.bar`, `rpc@`
    //
    // 1. `rpc@foo.bar.baz` -> use logger `rpc@foo.bar`
    // 2. `rpc@example` -> use logger `rpc@`
    // 3. `foo.bar` -> use logger `foo.bar`
    // 4. `foo.bar.baz` -> use logger `foo.bar`
    // 5. `example` -> use system logger
    //
    // Note: loggers already sorted from most specific to most
    // general (e.g. 'http@forum.index' comes earlier than 'http@forum').
    //
    let chosenLogger = _.find(loggers, logger => {
      let loggerInfo = parseLoggerName(logger.category);

      // Transport (responder) name should be equal (even if null)
      if (loggerInfo.responderName !== inputInfo.responderName) return false;

      // Reached the end (`rpc@`, `http@`) -> suitable
      if (!loggerInfo.splittedMethod) return true;

      // API path of logger should be equal with start parts of input API path
      if (loggerInfo.splittedMethod && inputInfo.splittedMethod &&
          loggerInfo.splittedMethod.length <= inputInfo.splittedMethod.length) {

        for (let i = 0; i < loggerInfo.splittedMethod.length; i++) {
          if (loggerInfo.splittedMethod[i] !== inputInfo.splittedMethod[i]) return false;
        }

        return true;
      }

      return false;
    });

    if (!chosenLogger) {
      N.logger.warn('Logger <%s> not found. Using <system>.', name);
      chosenLogger = N.logger;
    }

    channels[name] = chosenLogger; // cache
    return chosenLogger;
  };

  //
  // Configure log4js
  //
  let log4js_options = {
    appenders: {
      console: { type: 'console', layout: colouredLayout }
    },
    categories: {}
  };

  //
  // leave only loggers (with appenders) configs, removing keywords
  //

  delete config.options;

  //
  // configure logger categories and appenders
  //
  let thresholdAppenderId = 0;

  _.forEach(config, (loggerConfig, name) => {
    let appendersInGroup = [];
    let groupLevel = log4js.levels.FATAL;

    _.forEach(loggerConfig, appenderConfig => {
      // add custom prefix "file:" to avoid collisions with console appenders and such
      if (!log4js_options.appenders['file:' + appenderConfig.file] && cluster.isMaster) {
        let filename = path.resolve(mainRoot, appenderConfig.file);

        // make sure destination directory for log file exists
        mkdirp(path.dirname(filename));

        log4js_options.appenders['file:' + appenderConfig.file] = {
          type:       'file',
          filename,
          layout:     plainLayout,
          maxLogSize: options.file.logSize * 1024 * 1024,
          backups:    options.file.backups
        };
      }

      let myLevel = baseLevel;

      if (appenderConfig.level) {
        myLevel = log4js.levels.getLevel(appenderConfig.level, baseLevel);

        // get upper threshold
        myLevel = myLevel.isGreaterThanOrEqualTo(baseLevel) ? myLevel : baseLevel;
      }

      // return thresholded appender
      let key = 'threshold:' + thresholdAppenderId++;

      log4js_options.appenders[key] = {
        type: 'logLevelFilter',
        appender: 'file:' + appenderConfig.file,
        level: myLevel.levelStr
      };

      appendersInGroup.push(key);

      groupLevel = groupLevel.isGreaterThanOrEqualTo(myLevel) ? myLevel : groupLevel;
    });

    if (name !== 'system') {
      let resultLogger = log4js.getLogger(name);

      resultLogger.getLogger = N.logger.getLogger;
      // register logger in the internal cache
      loggers.push(resultLogger);
    }

    if (appendersInGroup.length) {
      appendersInGroup.forEach(appender => {
        if (!log4js_options.categories[name]) {
          log4js_options.categories[name] = { appenders: [], level: 'ALL' };

          if (logToConsole) {
            log4js_options.categories[name].appenders.push('console');
          }
        }

        log4js_options.categories[name].appenders.push(appender);
      });
    }
  });

  // alias "default" to "system", log4js requires category named "default"
  // to be present
  if (!log4js_options.categories.default) {
    log4js_options.categories.default = _.cloneDeep(
      log4js_options.categories.system
    );
  }

  log4js.configure(log4js_options);

  //
  // Ensure loggers are placed in order from most specific to most general.
  // e.g. 'http@forum.index' comes earlier than 'http@forum'.
  //

  loggers.sort(function (a, b) {
    a = parseLoggerName(a.category);
    b = parseLoggerName(b.category);

    if (a.splittedMethod && b.splittedMethod) {
      // Both loggers have a specified splittedMethod.

      if (a.splittedMethod.length < b.splittedMethod.length) {
        return 1;

      } else if (a.splittedMethod.length > b.splittedMethod.length) {

        return -1;
      }

      // Both loggers have the same splittedMethod length.

      if (a.responderName && b.responderName) {
        // Both loggers have a specified responderName.
        return 0;
      }
      // Logger which has a responderName is more specific.
      return a.responderName ? -1 : 1;
    }

    // Logger which has a splittedMethod is more specific.
    return a.splittedMethod ? -1 : 1;
  });
}


// Just check, that you did not forgot to create config file
// Valid config MUST contain "configured: true" string
//
function checkConfig(N) {
  if (!N.config.configured) {
    throw new Error('No main configuration file (usually: config/application.yml)');
  }
}


// Run `init()` method for all registered apps.
// Usually, hooks loading is placed there
//
function initApps(N) {
  N.apps = [ N.mainApp ];

  // Try load each enabled application and push to the array of loaded apps
  _.forEach(N.config.applications, app => {
    N.apps.push(new Application(require(getAppName(app))));
  });

  // Call init on each application
  _.forEach(N.apps, app => app.init(N));
}


////////////////////////////////////////////////////////////////////////////////


module.exports = async function (N) {
  initScope(N);
  initWire(N);

  // Load main app config
  let mainConfig = loadConfigs(path.join(N.mainApp.root, '/config')) || {};

  if (cluster.isMaster) {
    // Ensure all required apps installed before read configs
    await installAppsIfMissed(N, mainConfig.applications || []);
  }

  initConfig(N, mainConfig);
  initLogger(N);

  N.logger.info('Loaded config files', N.__startupTimer.elapsed);
  let timer = stopwatch();

  checkConfig(N);
  initApps(N);

  //
  // Create `N.version_hash` - unique value, that tracks packages
  // and configs change. That helps to rebuild cache.
  //
  // - main dependencies are:
  //   - routes
  //   - environment
  //   - `package.json` for all apps
  //   - `bundle.yml` for all apps
  // - almost all is located in config. So, track all at once via config change.
  //
  let hasher = crypto.createHash('md5');

  hasher.update(JSON.stringify(_.omit(N.config, [ 'logger' ])));

  N.apps.forEach(app => {
    hasher.update(fs.readFileSync(path.join(app.root, 'package.json'), 'utf-8'));

    // `bundle.yml` is not mandatory
    try {
      hasher.update(fs.readFileSync(path.join(app.root, 'bundle.yml'), 'utf-8'));
    } catch (__) {}
  });

  N.version_hash = hasher.digest('hex');

  N.logger.info('Applications intialized', timer.elapsed);
};
