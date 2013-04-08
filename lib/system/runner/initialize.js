// Read configs, init loggers, init apps, fills N object.


"use strict";


// stdlib
var path  = require("path");


// 3rd-party
var _           = require('lodash');
var fstools     = require("fs-tools");
var log4js      = require("log4js");
var revalidator = require("revalidator");

// reguster YAML loader for require()
require("js-yaml");


// internal
var Application = require("./application");
var Wire        = require("../wire");

////////////////////////////////////////////////////////////////////////////////


// merge configs, respecting `~override: true` instructions
function mergeConfigs(dst, src) {
  _.each(src || {}, function (value, key) {

    // if destination exists & already has `~override` flag, keep it intact
    if (_.isObject(dst[key]) && dst[key]['~override']) {
      return;
    }

    // if source has `~override` flag - override whole value in destination
    if (value && value['~override']) {
      dst[key] = value;
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


// reads all *.yml files from `dir` and merge resulting objects into single one
function loadConfigs(root) {
  var config = {}
    , files = [];

  fstools.walkSync(root, /[.]yml$/, function (file, stat) {
    if (stat.isFile()) {
      files.push(file);
    }
  });

  // files order can change, but we shuld return the same result always
  files = files.sort();

  _.each(files, function (file) {
    var obj;

    try {
      obj = require(file);
    } catch (err) {
      throw new Error("Failed parse YAML file '" + file + "':\n" + String(err));
    }

    mergeConfigs(config, obj);
  });

  return config;
}


////////////////////////////////////////////////////////////////////////////////


function initScope(N) {

  // provide app version
  N.runtime.version = N.runtime.mainApp.version;

  // provide some empty structures
  N.wire  = new Wire();
  N.client  = {};
  N.views   = {};

  // Storage for validation schemas
  // Each key is a `apiPath`, each value is a Schema object
  var validationSchemas = {};

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
   *  But for convenience we provide a syntax suger for this situation, so the
   *  above is long-hand syntax of:
   *
   *      {
   *        id: { type: 'integer', minimal: 1 }
   *      }
   *
   *
   *  ##### Example
   *
   *      // file: server/forum/thread.js
   *
   *      N.validate('server:forum.thread.show', {
   *        properties: {
   *          id: { type: 'integer', minimal: 1 }
   *        },
   *        additionalProperties: false
   *      });
   *
   *      module.exports.show = function (params, callback) {
   *        // ...
   *      };
   **/
  N.validate = function (apiPath, schema) {
    if (!schema || !schema.properties) {
      schema = {
        properties: schema,
        additionalProperties: false
      };
    }

    validationSchemas[apiPath] = schema;
  };


  /** internal
   *  N.validate.test(apiPath, params) -> Object|Null
   *
   *  Runs revalidate of apiPath for given params. Returns structure with
   *  `valid:Boolean` and `errors:Array` properties or `Null` if apiPath has no
   *  schema.
   **/
  N.validate.test = function (apiPath, params) {
    if (validationSchemas[apiPath]) {
      return revalidator.validate(params, validationSchemas[apiPath], {
        cast: true
      });
    }

    return null;
  };


  /**
   *  N.runtime.env -> String
   *
   *  Proxy to process.env['NODECA_ENV']
   **/
  N.runtime.env = process.env['NODECA_ENV'] || 'development';
}


function initConfig(N) {
  var mainRoot = N.runtime.mainApp.root
    , mainConfig  = {};

  //
  // Create empty object that we'll fill in a second
  //

  N.config = { options: {} };

  //
  // Start reading configs:
  // - Main app config stored into mainConfig
  // - Sub-apps configs got merged into N.config
  // - After all mainConfig got merged into N.config
  //

  // load main app cnfig
  mainConfig = loadConfigs(mainRoot + '/config') || {};

  // read configs of sub-applications
  if (mainConfig.applications && mainConfig.applications.length) {
    _.each(mainConfig.applications, function (appName) {
      var root;

      root = path.dirname(require.resolve(appName)) + '/config';

      mergeConfigs(N.config, loadConfigs(root));
    });
  }

  // merge in main config and resolve `per-environment` configs
  mergeConfigs(N.config, mainConfig);

  // expand environment-dependent configs
  _.each(N.config, function (val, key) {
    if ('^' === key[0]) {
      delete N.config[key];

      if (N.runtime.env === key.substr(1)) {
        mergeConfigs(N.config, val);
      }
    }
  });

  // post-process config
  /*
  if (!N.config.themes) {
    N.config.themes = {};
  }

  if (!N.config.themes.schemas) {
    N.config.themes.schemas = {};
  }

  // check whenever theme is enabled or not
  function isEnabled(id) {
    // when whitelist speciefied:
    // enable only those specified in whitelist
    if (N.config.themes.enabled) {
      return 0 <= N.config.themes.enabled.indexOf(id);
    }

    // when blacklist is given and there's no whitelist
    // enable only those, not specified in the blacklist
    if (N.config.themes.disabled) {
      return -1 === N.config.themes.disabled.indexOf(id);
    }

    // else, when no white/black lists are given
    // enable by default
    return true;
  }

  _.each(N.config.themes.schemas, function (opts, id) {
    opts.enabled = isEnabled(id);
  });
  */
}


function initLogger(N) {
  var mainRoot  = N.runtime.mainApp.root
    , config    = _.extend({}, N.config.logger)
    , options   = _.extend({file: {logSize: 10, backups: 5}}, config.options)
      // common logging level (minimal threshold)
    , baseLevel = log4js.levels.toLevel(options.level, log4js.levels.ALL)
      // cache of initialized appenders
    , appenders = {}
      // initialized logger (see getLogger below)
    , loggers   = {};

  //
  // define system (general) logger
  //

  N.logger = log4js.getLogger('system');

  //
  // provide a wrapper to set global log level
  //

  N.logger.setLevel = function (level) {
    level = log4js.levels[level.toUpperCase()];
    log4js.setGlobalLogLevel(level);
  };

  //
  // provide getLogger wrapper
  //

  N.logger.getLogger = function (name) {
    var parts, logger;

    if (!loggers[name]) {
      parts = name.split('.');

      while (parts.length && !logger) {
        parts.pop();
        logger = loggers[parts.join('.')];
      }

      if (!logger) {
        N.logger.warn('Logger <%s> not found. Using <system>.', name);
        logger = N.logger;
      }

      loggers[name] = logger;
    }

    return loggers[name] || log4js.getLogger(name);
  };

  //
  // Load supported appenders
  //

  log4js.loadAppender('file');
  log4js.loadAppender('console');
  log4js.loadAppender('logLevelFilter');

  //
  // Helper that returns thresholded appender
  // Resulting appender will log event with level => given `threshold` only
  //

  function thresholdedAppender(threshold, appender) {
    var level = baseLevel;

    if (threshold) {
      level = log4js.levels.toLevel(threshold, baseLevel);

      // get upper threshold
      level = level.isGreaterThanOrEqualTo(baseLevel) ? level : baseLevel;
    }

    // return thresholded appender
    return log4js.appenders.logLevelFilter(level, appender);
  }

  //
  // clear default loggers
  //

  log4js.clearAppenders();

  //
  // configure console logger for non-production environment only
  //

  if ('production' !== N.runtime.env) {
    log4js.addAppender(log4js.appenders.console());
  }

  //
  // leave only loggers (with appenders) configs, removing keywords
  //

  delete config.options;

  //
  // configure logger categories and appenders
  //

  _.each(config, function (loggerConfig, name) {
    _.each(loggerConfig, function (appenderConfig) {
      var filename, appender;

      if (!appenders[appenderConfig.file]) {
        filename = path.resolve(mainRoot, appenderConfig.file);

        // make sure destination directory for log file exists
        fstools.mkdirSync(path.dirname(filename));

        appenders[appenderConfig.file] = log4js.appenders.file(
          filename,                             // filename
          null,                                 // layout
          options.file.logSize * 1024 * 1024,   // logSize
          options.file.backups                  // numBackups
        );
      }

      // prepare thresholded appender
      appender  = thresholdedAppender(
        appenderConfig.level, appenders[appenderConfig.file]);

      log4js.addAppender(appender, name);
    });

    // register logger in the internal cache
    loggers[name] = log4js.getLogger(name);
    loggers[name].getLogger = N.logger.getLogger;
  });
}


// Just check, that you did not forgot to create config file
// Valid config MUST contain "configured: true" string
//
function checkConfig(N) {
  if (!N.config.configured) {
    throw new Error("No main configuration file (usually: config/application.yml)");
  }
}


// Run `init()` method for all registered apps.
// Usually, hooks loading is placed there
//
function initApps(N) {
  N.runtime.apps = [N.runtime.mainApp];

  // Try load each enabled application and push to the array of loaded apps
  _.each(N.config.applications, function (name) {
    N.runtime.apps.push(new Application(require(name)));
  });

  // Call init on each application
  _.each(N.runtime.apps, function (app) {
    app.init(N);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {
  initScope(N);
  initConfig(N);
  initLogger(N);
  checkConfig(N);
  initApps(N);
};
