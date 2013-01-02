// Read configs, init loggers, init apps, fills N object.


"use strict";


/*global underscore, N*/


// stdlib
var path  = require("path");


// 3rd-party
var _           = underscore;
var async       = require("async");
var fstools     = require("fs-tools");
var log4js      = require("log4js");
var revalidator = require("revalidator");
var yaml        = require("js-yaml");


// internal
var Application = require("./application");
var Hooker      = require('../support/hooker');

////////////////////////////////////////////////////////////////////////////////


// provide custom `!clean` tag constructor to JsYAML
// constructs mapping object with `!! => clean` pair
// that is used to decide whenever keys should be
// merged or overriden
yaml.addConstructor('!clean', function (node) {
  var result = this.constructMapping(node);
  result['!!'] = 'clean';
  return result;
});


// merge to configs respecting `!! => clean` instructions
function mergeConfigs(dst, src) {
  _.each(src || {}, function (v, k) {
    if (v && 'clean' === v['!!']) {
      delete v['!!'];
      dst[k] = v;
      return;
    }

    if ((!_.isObject(v) && !_.isArray(v)) || (!_.isObject(dst[k]) && !_.isArray(dst[k]))) {
      dst[k] = v;
      return;
    }

    // both dst and src are obj or arr - merge recursively
    mergeConfigs(dst[k], v);
  });

  return dst;
}


// reads all *.yml files from `dir` and merge resulting objects into single one
function loadConfigs(root, callback) {
  var config = {};

  fstools.findSorted(root, /[.]yml$/, function (err, files) {
    var lastErr;

    if (err) {
      callback(err);
      return;
    }

    _.each(files, function (file) {
      var obj;

      try {
        obj = require(file);
      } catch (err) {
        lastErr = "Failed parse YAML file '" + file + "':\n" + String(err);
        return;
      }

      mergeConfigs(config, obj);
    });

    callback(lastErr, config);
  });
}


////////////////////////////////////////////////////////////////////////////////


function initScope() {
  N.filters = new Hooker();

  // provide app version
  N.runtime.version = N.runtime.mainApp.version;

  // provide some empty structures
  N.server  = {};
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
   *      N.validate('forum.thread.show', {
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
  Object.defineProperty(N.runtime, 'env', {
    writable: true,
    value: process.env['NODECA_ENV'] || 'development'
  });
}


function initConfig(callback) {
  var
  mainRoot    = N.runtime.mainApp.root,
  mainConfig  = {};

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

  async.series([
    // load main app cnfig
    function (next) {
      loadConfigs(mainRoot + '/config', function (err, config) {
        mainConfig = config || {};
        next(err);
      });
    },
    // read configs of sub-applications
    function (next) {
      if (!mainConfig.applications || !mainConfig.applications.length) {
        next();
        return;
      }

      async.forEachSeries(mainConfig.applications, function (appName, nextApp) {
        var root;

        try {
          root = path.dirname(require.resolve(appName)) + '/config';
        } catch (err) {
          nextApp(err);
          return;
        }

        loadConfigs(root, function (err, config) {
          mergeConfigs(N.config, config);
          nextApp(err);
        });
      }, next);
    },
    // merge in main config and resolve `per-environment` configs
    function (next) {
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

      next();
    },
    // post-process config
    function (next) {
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

      next();
    }
  ], callback);
}


function initLogger(callback) {
  var
  mainRoot  = N.runtime.mainApp.root,
  config    = _.extend({}, N.config.logger),
  options   = _.extend({file: {logSize: 10, backups: 5}}, config.options),
  // global logging level (minimal threshold)
  baseLevel = log4js.levels.toLevel(options.level, log4js.levels.ALL),
  // cache of initialized appenders
  appenders = {},
  // initialized logger (see getLogger below)
  loggers   = {};

  //
  // define system (general) logger
  //

  Object.defineProperty(N, 'logger', { value: log4js.getLogger('system') });

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
        N.logger.warn('Logger <' + name + '> not found. Using <system>.');
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

  callback();
}


// post-init validations
function validate(callback) {
  if (!N.config.configured) {
    callback("No main configuration file (usually: config/application.yml)");
    return;
  }

  callback();
}


function initApps(callback) {
  N.runtime.apps = [N.runtime.mainApp];

  try {
    // Try load each enabled application and push to the array of loaded apps
    _.each(N.config.applications, function (name) {
      N.runtime.apps.push(new Application(require(name)));
    });

    // Call init on each application
    _.each(N.runtime.apps, function (app) {
      app.init();
    });
  } catch (err) {
    callback(err);
    return;
  }

  callback();
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (callback) {
  initScope();

  async.series([initConfig, initLogger, validate, initApps], callback);
};
