'use strict';


const babel     = require('@babel/core');
const _         = require('lodash');
const path      = require('path');


const before = _.template("(function () { N.views['<%= apiPath %>'] = ");
const after  = '})();';

// Injections with helpers for template functions
const beforeWithRuntime = {
  '.jade': _.template("(function () { var jade = require('jade/lib/runtime'); N.views['<%= apiPath %>'] = "),
  '.pug':  _.template("(function () { var pug = require('pug-runtime'); N.views['<%= apiPath %>'] = ")
};


function babelify_plugin(context) {
  return Promise.resolve().then(() => {
    let options = {
      presets: [ '@babel/preset-env' ]
    };

    // Source maps are disabled here for performance reasons
    // + old babel source-map version may not support our indexed maps yet
    /*if (context.bundler.sourceMaps) {
      options.inputSourceMap = context.asset.sourceMap || undefined;
      options.sourceFileName = context.asset.sourceMapPath;
      options.sourceMaps = true;
    }*/

    let result = babel.transformSync(context.asset.source, options);

    context.asset.source = result.code;
    context.asset.sourceMap = result.map;
  });
}


module.exports = function (sandbox) {
  _.forEach(sandbox.config.packages, (pkg, pkg_name) => {
    _.forEach(pkg.files.widget_view, file_info => {
      let ext        = path.extname(file_info.path);

      let wrapBefore = beforeWithRuntime[ext] ? beforeWithRuntime[ext] : before;

      let asset = sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        virtual: true,
        plugins: [ 'load_text', 'macros', 'auto', 'wrapper', babelify_plugin ]
                   .concat(sandbox.compression ? [ 'terser' ] : []),
        wrapBefore: wrapBefore({ apiPath: file_info.api_path }),
        wrapAfter: after
      });

      if (file_info.public) {
        sandbox.component_client[pkg_name].views.push(asset);
      }

      sandbox.component_server[pkg_name].views.push(asset);
    });
  });
};
