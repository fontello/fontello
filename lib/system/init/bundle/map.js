// Create assets distribution map that will be used by loader
//
// `sandbox.assets_map` -> <lang> -> <package name>:
//   - packagesQueue
//   - stylesQueue
//   - stylesheets
//   - javascripts
//
'use strict';


module.exports = function (sandbox) {
  let distribution = {};
  let pkg_bundle = {};


  // get bundles list
  //
  for (let [ bundle_name, bundle ] of Object.entries(sandbox.config.bundles)) {
    for (let pkg_name of bundle) {
      pkg_bundle[pkg_name] = pkg_bundle[pkg_name] || [];
      pkg_bundle[pkg_name].push(bundle_name);
    }
  }

  for (let lang of sandbox.N.config.locales) {
    distribution[lang] = {};

    for (let pkg_name of Object.keys(sandbox.config.packages)) {
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
    }
  }

  for (let locale_dist of Object.values(distribution)) {
    for (let [ pkg_name, pkg_dist ] of Object.entries(locale_dist)) {
      let packages_queue = [];
      let styles_queue = [];
      let already_loaded;

      // This function is used to recursively populate the loading queue.
      /* eslint-disable func-style */
      let process_package = process_pkg_name => {
        let process_pkg_config = sandbox.config.packages[process_pkg_name];

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
      };

      process_package(pkg_name);

      // Compose the styles queue.
      for (let dep_name of packages_queue.slice(0).reverse()) {
        let dep_dist = locale_dist[dep_name];

        /* eslint-disable max-depth */
        if (dep_dist?.stylesheets.length) {
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
      }

      // Expose the queues to the package distribution.
      pkg_dist.packagesQueue = packages_queue;
      pkg_dist.stylesQueue = styles_queue;
    }
  }

  sandbox.assets_map = distribution;
};
