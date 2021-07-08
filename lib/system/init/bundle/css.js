// Create CSS assets
//
'use strict';


module.exports = function (sandbox) {
  for (let [ bundle_name, bundle ] of Object.entries(sandbox.config.bundles)) {
    const bundle_css = sandbox.bundler.createClass('concat', {
      logicalPath: 'public/bundle-' + bundle_name + '.css',
      plugins: [ 'autoprefixer' ]
    });

    for (let pkg_name of bundle) {
      const package_css = sandbox.bundler.createClass('concat', {
        logicalPath: 'internal/public/package-' + bundle_name + '-' + pkg_name + '.css',
        virtual: true
      });

      bundle_css.push(package_css);

      for (let file_info of sandbox.config.packages[pkg_name].files.widget_css || []) {
        package_css.push(sandbox.bundler.createClass('file', {
          logicalPath: file_info.path,
          virtual: true,
          plugins: [ 'load_text', 'macros', 'auto' ].concat(sandbox.compression ? [ 'clean-css' ] : [])
        }));
      }

      for (let file_info of sandbox.config.packages[pkg_name].files.css || []) {
        sandbox.bundler.createClass('file', {
          logicalPath: file_info.path,
          plugins: [ 'load_text', 'macros', 'auto' ].concat(sandbox.compression ? [ 'clean-css' ] : [])
        });
      }
    }
  }
};
