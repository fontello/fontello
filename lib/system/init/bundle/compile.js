'use strict';


module.exports = async function (sandbox) {
  function report_multi_bundled() {
    // module_path -> [ pkg_name ]
    let included_in = {};

    for (let [ widget_path, module_paths ] of Object.entries(sandbox.included_modules)) {
      let pkg_name;

      for (let [ name, pkg ] of Object.entries(sandbox.config.packages)) {
        if ((pkg.files.widget_js || []).some(x => x.path === widget_path)) {
          pkg_name = name;
          break;
        }
      }

      for (let path of module_paths) {
        included_in[path] = included_in[path] || [];
        if (included_in[path].indexOf(pkg_name) === -1) {
          included_in[path].push(pkg_name);
        }
      }
    }

    for (let [ path, pkgs ] of Object.entries(included_in)) {
      if (pkgs.length > 1) {
        sandbox.N.logger.debug(`File ${path} included multiple packages: ${pkgs}`);
      }
    }
  }

  sandbox.files = await sandbox.bundler.compile();

  report_multi_bundled();
};
