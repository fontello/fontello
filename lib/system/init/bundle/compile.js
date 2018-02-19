'use strict';


const _ = require('lodash');


module.exports = async function (sandbox) {
  function report_multi_bundled() {
    // module_path -> [ pkg_name ]
    let included_in = {};

    _.forEach(sandbox.included_modules, (module_paths, widget_path) => {
      let pkg_name = _.findKey(sandbox.config.packages,
        pkg => !!_.find(pkg.files.widget_js, { path: widget_path }));

      _.forEach(module_paths, path => {
        included_in[path] = included_in[path] || [];
        if (included_in[path].indexOf(pkg_name) === -1) {
          included_in[path].push(pkg_name);
        }
      });
    });

    _.forEach(included_in, (pkgs, path) => {
      if (pkgs.length > 1) {
        sandbox.N.logger.debug(`File ${path} included multiple packages: ${pkgs}`);
      }
    });
  }

  sandbox.files = await sandbox.bundler.compile();

  report_multi_bundled();
};
