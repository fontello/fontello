// Create server packages
//
'use strict';


var _ = require('lodash');


module.exports = function (sandbox) {
  let N = sandbox.N;

  N.config.locales.forEach(lang => {
    Object.keys(sandbox.config.packages).forEach(function (pkg_name) {
      const package_js = sandbox.bundler.createClass('concat', {
        logicalPath: 'server/package-' + pkg_name + '.' + lang + '.js',
        plugins: [ 'wrapper' ],
        wrapBefore: 'module.exports = function (N) {\n',
        wrapAfter: '};\n'
      });

      _.forEach(sandbox.component_server[pkg_name], (component, type) => {
        if (type === 'i18n') {
          package_js.push(component[lang]);
          return;
        }

        package_js.push(component);
      });
    });
  });
};
