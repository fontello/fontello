//  Takes array of applications, each one should have `root` property,
//  and returns a config object with resolved and found pathnames:
//
//      packages:
//        forum:
//          styles:
//            main: ...
//            lookups:
//              - /home/ixti/Projects/nodeca/node_modules/nodeca.forum/client/forum
//              - /home/ixti/Projects/nodeca/node_modules/nodeca.users/client/forum
//            files:
//              - /home/ixti/Projects/nodeca/node_modules/nodeca.forum/client/forum/foo.styl
//              - /home/ixti/Projects/nodeca/node_modules/nodeca.users/client/forum/bar.styl
//              ...
//


'use strict';


/*global underscore*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _     = underscore;
var async = require('async');


// internal
var findPaths = require('./find_paths');
var Pathname  = require('./pathname');


////////////////////////////////////////////////////////////////////////////////


function prepareConfig(apps) {
  var config = { packages: {} };

  _.each(apps, function (app) {
    var
    app_config_file = path.join(app.root, 'bundle.yml'),
    app_config      = null;

    if (fs.existsSync(app_config_file)) {
      app_config = require(app_config_file);

      if (app_config.packages) {
        _.each(app_config.packages, function (pkgConfig, pkgName) {
          if (!config.packages[pkgName]) {
            config.packages[pkgName] = {};
          }

          _.each(pkgConfig, function (sectionConfig, sectionName) {
            var c, lookup;

            if (!config.packages[pkgName][sectionName]) {
              config.packages[pkgName][sectionName] = { lookup: [] };
            }

            // shortcut
            c = config.packages[pkgName][sectionName];

            // do not allow more than one main per package/section
            if (c.main && sectionConfig.main) {
              throw "Duplicate `main` file for " + sectionName +
                    " of " + pkgName + " package in " + app.name;
            }

            // prepare lookup config
            lookup = _.pick(sectionConfig, 'include', 'exclude');

            // provide some calculated values
            lookup.root       = path.resolve(app.root, sectionConfig.root);
            lookup.appRoot    = app.root;
            lookup.apiPrefix  = pkgName;

            // set main file if it wasn't set yet
            if (sectionConfig.main) {
              c.main = new Pathname(path.resolve(lookup.root, sectionConfig.main), {
                relative: sectionConfig.main
              });
            }

            // if apiPrefix was given - use it instead of package name based one
            if (sectionConfig.hasOwnProperty('apiPrefix')) {
              lookup.apiPrefix = sectionConfig.apiPrefix;
            }

            // push lookup config
            c.lookup.push(lookup);
          });
        });
      }
    }
  });

  // push main into each "lookup" path
  _.each(config.packages, function (pkg) {
    _.each(pkg, function (cfg) {
      if (cfg.main) {
        _.each(cfg.lookup, function (l) {
          l.main = cfg.main;
        });
      }
    });
  });

  return config;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (apps, callback) {
  var config = prepareConfig(apps);

  // for each package
  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    // for each section of a package
    async.forEachSeries(_.keys(config.packages[pkgName]), function (key, next) {
      findPaths(config.packages[pkgName][key].lookup, function (err, pathnames) {
        config.packages[pkgName][key].files = pathnames;
        next(err);
      });
    }, next);
  }, function (err) {
    callback(err, config);
  });
};
