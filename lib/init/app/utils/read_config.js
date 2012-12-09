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

            // set main file if it wasn't set yet
            c.main = c.main || sectionConfig.main;

            // prepare lookup config
            lookup = _.pick(sectionConfig, 'include', 'exclude');

            // provide some calculated values
            lookup.root       = path.resolve(app.root, sectionConfig.root);
            lookup.appRoot    = app.root;
            lookup.apiPrefix  = app.name;

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

  return config;
};
