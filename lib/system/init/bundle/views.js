'use strict';


const _ = require('lodash');


const before = _.template("N.views['<%= apiPath %>'] = ");
const after = ';';


module.exports = function (sandbox) {
  _.forEach(sandbox.config.packages, (pkg, pkg_name) => {
    _.forEach(pkg.files.widget_view, file_info => {
      let asset = sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        virtual: true,
        plugins: [ 'load_text', 'macros', 'auto', 'wrapper' ].concat(sandbox.compression ? [ 'uglifyjs' ] : []),
        wrapBefore: before({ apiPath: file_info.api_path }),
        wrapAfter: after
      });

      if (file_info.public) {
        sandbox.component_client[pkg_name].views.push(asset);
      }

      sandbox.component_server[pkg_name].views.push(asset);
    });
  });
};
