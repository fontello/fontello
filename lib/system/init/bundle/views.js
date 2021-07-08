'use strict';


const babel     = require('@babel/core');
const _         = require('lodash');
const path      = require('path');


const wrappers = {
  __default__: `
(function () {
  let template = COMPILED_ASSET;
  N.views['<%= apiPath %>'] = (locals, helpers) =>
    template(Object.assign({}, helpers, locals));
})();
`,

  // for pug partials `helpers` object includes previous locals (merged here previously),
  // so we need to assign locals after helpers in case old and new locals have same keys
  '.pug': `
(function () {
  let pug = require('pug-runtime');
  let template = COMPILED_ASSET;
  N.views['<%= apiPath %>'] = (locals, helpers) =>
    template(Object.assign({}, helpers, locals));
})();
`,

  '.hbs': `
(function () {
  let template = COMPILED_ASSET;
  N.views['<%= apiPath %>'] = (locals, helpers) => {
    let handlebars = require('handlebars/runtime').create();
    for (let name in helpers) {
      // only support helpers in the form of {{fn "argument" a="value1" b="value2"}},
      // i.e. first argument is a string, second is a hash
      handlebars.registerHelper(name, function (str, options) {
        return helpers[name](str, options.hash);
      });
    }
    return handlebars.template(template)(locals);
  };
})();
`
};

// Injections with helpers for template functions
const before = {};
const after = {};

for (let [ type, value ] of Object.entries(wrappers)) {
  let [ beforeTpl, afterTpl ] = value.split('COMPILED_ASSET');
  before[type] = _.template(beforeTpl);
  after[type]  = _.template(afterTpl);
}


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
  for (let [ pkg_name, pkg ] of Object.entries(sandbox.config.packages)) {
    for (let file_info of pkg.files.widget_view || []) {
      let ext        = path.extname(file_info.path);

      let wrapBefore = before[ext] || before.__default__;
      let wrapAfter  = after[ext]  || after.__default__;

      let asset = sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        virtual: true,
        plugins: [ 'load_text', 'macros', 'auto', 'wrapper', babelify_plugin ]
                   .concat(sandbox.compression ? [ 'terser' ] : []),
        wrapBefore: wrapBefore({ apiPath: file_info.api_path }),
        wrapAfter:  wrapAfter({ apiPath: file_info.api_path })
      });

      if (file_info.public) {
        sandbox.component_client[pkg_name].views.push(asset);
      }

      sandbox.component_server[pkg_name].views.push(asset);
    }
  }
};
