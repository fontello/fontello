// Create assets distribution map that will be used by loader
//
// `sandbox.assets_map` -> <lang> -> <package name>:
//   - packagesQueue
//   - stylesQueue
//   - stylesheets
//   - javascripts
//
'use strict';


var _ = require('lodash');


module.exports = function (sandbox) {
  let distribution = {};
  let pkg_bundle = {};


  // get bundles list
  //
  _.forEach(sandbox.config.bundles, (bundle, bundle_name) => {
    bundle.forEach(pkg_name => {
      pkg_bundle[pkg_name] = pkg_bundle[pkg_name] || [];
      pkg_bundle[pkg_name].push(bundle_name);
    });
  });

  sandbox.N.config.locales.forEach(lang => {
    distribution[lang] = {};

    _.forEach(sandbox.config.packages, (__, pkg_name) => {
      let stylesheets;
      let javascripts;

      stylesheets = pkg_bundle[pkg_name].map(bundle_name => {
        let asset = sandbox.bundler.findAsset('public/bundle-' + bundle_name + '.css');

        if (!asset || !asset.source.length) return false;

        return asset.logicalPath;
      }).filter(Boolean);

      javascripts = pkg_bundle[pkg_name].map(bundle_name => {
        let asset = sandbox.bundler.findAsset('public/bundle-' + bundle_name + '.' + lang + '.js');

        if (!asset || !asset.source.length) return false;

        return asset.logicalPath;
      }).filter(Boolean);

      distribution[lang][pkg_name] = {
        packagesQueue: null,
        stylesQueue:   null,
        stylesheets,
        javascripts
      };
    });
  });

  _.forEach(distribution, locale_dist => {
    _.forEach(locale_dist, (pkg_dist, pkg_name) => {
      let packages_queue = [];
      let styles_queue = [];
      let already_loaded;

      // This function is used to recursively populate the loading queue.
      function process_package(process_pkg_name) {
        var process_pkg_config = sandbox.config.packages[process_pkg_name];

        // Yield dependences of the current package first.
        if (process_pkg_config.depends) {
          process_pkg_config.depends.forEach(function (dependency) {
            if (packages_queue.indexOf(dependency) === -1) {
              process_package(dependency);
            }
          });
        }

        // Yield the current package itself at the last.
        packages_queue.push(process_pkg_name);
      }

      process_package(pkg_name);

      // Compose the styles queue.
      packages_queue.slice(0).reverse().forEach(dep_name => {
        let dep_dist = locale_dist[dep_name];

        if (dep_dist && dep_dist.stylesheets.length) {
          // We have a dependency which might be included in multiple files;
          //
          // Look if we already have one file it might be included in,
          // and if we don't, add one.
          //
          already_loaded = dep_dist.stylesheets.reduce(function (acc, possible_path) {
            return acc || styles_queue.indexOf(possible_path) !== -1;
          }, false);

          if (!already_loaded) {
            styles_queue.unshift(dep_dist.stylesheets[0]);
          }
        }
      });

      // Expose the queues to the package distribution.
      pkg_dist.packagesQueue = packages_queue;
      pkg_dist.stylesQueue = styles_queue;
    });
  });

  sandbox.assets_map = distribution;
};
