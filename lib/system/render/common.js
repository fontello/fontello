// Template renderer used by both the server and the client.


'use strict';


const _ = require('lodash');


////////////////////////////////////////////////////////////////////////////////


// Normalizes (resolves) include/translate API paths.
//
function resolveApiPath(path, apiPathStack) {
  let context = apiPathStack[apiPathStack.length - 1];

  if (path.indexOf('@') === 0) {
    return path.replace(/^@([^.]*)/, (m, ns) => ns || context.split('.').shift());
  }

  return context + '.' + path;
}


////////////////////////////////////////////////////////////////////////////////


//  common.render(N, apiPath[, locals[, helpers]]) -> String
//  - N (Object): The N global sandbox.
//  - apiPath (String): Template to render, e.g. `forum.index`
//  - locals (Object): Locals data to pass to the renderer function
//  - helpers (Object): Helper functions and constants
//
//  Renders a template passing `locals` and `helpers` as `self` object within
//  it. The difference between these is that `locals` is only for the specified
//  template, but `helpers` passes forward to partials.
//
module.exports = function render(N, apiPath, locals, helpers) {
  let pathStack = []; // Stack of file API paths used when rendering partials.
  let execute;

  function translate(phrase, params) {
    return helpers.t(resolveApiPath(phrase, pathStack), params);
  }

  translate.exists = function translate_exists(phrase) {
    return helpers.t.exists(resolveApiPath(phrase, pathStack));
  };

  // Helper used to render partial templates. It's needed to properly render
  // translations and/or other partials by relative API path.
  function partial(partialPath, partialLocals) {
    return execute.call(this, resolveApiPath(partialPath, pathStack), partialLocals);
  }

  function partial_exists(partialPath) {
    return N.views.hasOwnProperty(resolveApiPath(partialPath, pathStack));
  }

  // Internal render closure.
  // It expects `this` to be `self` object of parent template.
  execute = function _execute(executePath, executeLocals) {
    let templateFn, templateSelf;

    if (N.views[executePath]) {
      templateFn = N.views[executePath];
    } else {
      throw new Error(`View template "${executePath}" not found.`);
    }

    // Create new `self` context for current template inheriting all data from
    // parent template's `self`.
    templateSelf = Object.create(this);

    if (executeLocals) {
      _.assign(templateSelf, executeLocals);
    }

    pathStack.push(executePath);

    try {
      return templateFn(templateSelf);
    } finally {
      pathStack.pop();
    }
  };

  let extendedHelpers = {};

  // Mixin all external helpers.
  if (helpers) {
    _.assign(extendedHelpers, helpers);
  }

  // Wrap `t` helpers if present.
  if (helpers && helpers.t) {
    extendedHelpers.t = translate;
  }

  // Provide `partial` helper for recursive render.
  extendedHelpers.partial = partial;
  extendedHelpers.partial_exists = partial_exists;

  return execute.call(extendedHelpers, apiPath, locals);
};
