// Create client bundles
//
'use strict';


var _ = require('lodash');


module.exports = function (sandbox) {
  let N = sandbox.N;

  Object.keys(sandbox.config.bundles).forEach(function (bundle_name) {
    N.config.locales.forEach(lang => {
      const bundle_js = sandbox.bundler.createClass('concat', {
        logicalPath: 'public/bundle-' + bundle_name + '.' + lang + '.js'
      });

      sandbox.config.bundles[bundle_name].forEach(function (pkg_name) {
        const package_js = sandbox.bundler.createClass('concat', {
          logicalPath: 'internal/public/package-' + bundle_name + '-' + pkg_name + '.' + lang + '.js',
          virtual: true
        });

        bundle_js.push(package_js);

        _.forEach(sandbox.component_client[pkg_name], (component, type) => {
          if (type === 'i18n') {
            package_js.push(component[lang]);
            return;
          }

          package_js.push(component);
        });
      });
    });
  });
};
