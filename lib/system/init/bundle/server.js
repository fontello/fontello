// Create server packages
//
'use strict';


module.exports = function (sandbox) {
  let N = sandbox.N;

  for (let lang of N.config.locales) {
    for (let pkg_name of Object.keys(sandbox.config.packages)) {
      const package_js = sandbox.bundler.createClass('concat', {
        logicalPath: 'server/package-' + pkg_name + '.' + lang + '.js',
        plugins: [ 'wrapper' ],
        wrapBefore: 'module.exports = function (N) {\n',
        wrapAfter: '};\n'
      });

      /* eslint-disable max-depth */
      for (let [ type, component ] of Object.entries(sandbox.component_server[pkg_name])) {
        if (type === 'i18n') {
          package_js.push(component[lang]);
          continue;
        }

        package_js.push(component);
      }
    }
  }
};
