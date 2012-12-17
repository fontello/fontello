//  Takes array of applications, each one should have `root` property,
//  and returns unified config in the form:
//
//      {
//        packages: {
//          forum: {
//            styles: {
//              main: {
//                file:     'forum.styl',
//                root:     '/home/ixti/Projects/nodeca/node_modules/nodeca.forum/client/forum',
//                appRoot:  '/home/ixti/Projects/nodeca/node_modules/nodeca.forum'
//              },
//              lookup: [
//                {
//                  include:    '*.jade',
//                  exclude:    /(^|\/)_.*/,
//                  root:       '/home/ixti/Projects/nodeca/node_modules/nodeca.forum/client/forum',
//                  appRoot:    '/home/ixti/Projects/nodeca/node_modules/nodeca.forum',
//                  apiPrefix:  'forum'
//                },
//                {
//                  include:    '*.jade',
//                  exclude:    /(^|\/)_.*/,
//                  root:       '/home/ixti/Projects/nodeca/node_modules/nodeca.users/client/forum',
//                  appRoot:    '/home/ixti/Projects/nodeca/node_modules/nodeca.users',
//                  apiPrefix:  'forum'
//                },
//                ...
//              ]
//            }
//          }
//        }
//      }
//


'use strict';


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _ = require('underscore');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (apps) {
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
              c.main = {
                file: sectionConfig.main,
                root: lookup.root,
                appRoot: lookup.appRoot
              };
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
};
