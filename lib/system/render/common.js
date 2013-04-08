// Template renderer used by both the server and the client.


'use strict';


var _ = require('lodash');


////////////////////////////////////////////////////////////////////////////////


// Normalizes (resolves) include/translate API paths.
//
function resolveApiPath(path, apiPathStack) {
  var context = apiPathStack[apiPathStack.length - 1];

  if (0 === path.indexOf('@')) {
    return path.replace(/^@([^.]*)/, function (m, ns) {
      return ns || context.split('.').shift();
    });
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
  var pathStack = []; // Stack of file API paths used when rendering partials.

  function translate(phrase, params) {
    return helpers.t(resolveApiPath(phrase, pathStack), params);
  }

  translate.exists = function (phrase) {
    return helpers.t.exists(resolveApiPath(phrase, pathStack));
  };

  // Helper used to render partial templates. It's needed to properly render
  // translations and/or other partials by relative API path.
  function partial(partialPath, partialLocals) {
    return execute(resolveApiPath(partialPath, pathStack), partialLocals);
  }

  // Internal render closure.
  function execute(executePath, executeLocals) {
    var templateFn, self = {};

    if (N.views[executePath]) {
      templateFn = N.views[executePath];
    } else {
      throw new Error('View template "' + executePath + '" not found.');
    }

    if (helpers) {
      _.extend(self, helpers);
    }

    if (helpers && helpers.t) {
      self.t = translate;
    }

    self.partial = partial;

    if (executeLocals) {
      _.extend(self, executeLocals);
    }

    pathStack.push(executePath);
    try {
      return templateFn(self);
    } finally {
      pathStack.pop();
    }
  }

  return execute(apiPath, locals);
};
