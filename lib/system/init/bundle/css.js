// Create CSS assets
//
'use strict';


var _ = require('lodash');


module.exports = function (sandbox) {
  _.forEach(sandbox.config.bundles, function (bundle, bundle_name) {
    const bundle_css = sandbox.bundler.createClass('concat', {
      logicalPath: 'public/bundle-' + bundle_name + '.css',
      plugins: [ 'autoprefixer' ]
    });

    bundle.forEach(pkg_name => {
      const package_css = sandbox.bundler.createClass('concat', {
        logicalPath: 'internal/public/package-' + bundle_name + '-' + pkg_name + '.css',
        virtual: true
      });

      bundle_css.push(package_css);

      _.forEach(sandbox.config.packages[pkg_name].files.widget_css, file_info => {
        package_css.push(sandbox.bundler.createClass('file', {
          logicalPath: file_info.path,
          virtual: true,
          plugins: [ 'load_text', 'macros', 'auto' ].concat(sandbox.compression ? [ 'csswring' ] : [])
        }));
      });

      _.forEach(sandbox.config.packages[pkg_name].files.css, file_info => {
        sandbox.bundler.createClass('file', {
          logicalPath: file_info.path,
          plugins: [ 'load_text', 'macros', 'auto' ].concat(sandbox.compression ? [ 'csswring' ] : [])
        });
      });
    });
  });
};
