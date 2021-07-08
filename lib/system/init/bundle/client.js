// Create client bundles
//
'use strict';


module.exports = function (sandbox) {
  let N = sandbox.N;

  for (let bundle_name of Object.keys(sandbox.config.bundles)) {
    for (let lang of N.config.locales) {
      const bundle_js = sandbox.bundler.createClass('concat', {
        logicalPath: 'public/bundle-' + bundle_name + '.' + lang + '.js'
      });

      for (let pkg_name of sandbox.config.bundles[bundle_name]) {
        const package_js = sandbox.bundler.createClass('concat', {
          logicalPath: 'internal/public/package-' + bundle_name + '-' + pkg_name + '.' + lang + '.js',
          virtual: true
        });

        bundle_js.push(package_js);

        /* eslint-disable max-depth */
        for (let [ type, component ] of Object.entries(sandbox.component_client[pkg_name])) {
          if (type === 'i18n') {
            package_js.push(component[lang]);
            continue;
          }

          package_js.push(component);
        }
      }
    }
  }
};
