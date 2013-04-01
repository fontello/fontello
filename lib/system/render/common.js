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
  var templateFn
    , translateFn
    , result = '';

  if (N.views[apiPath]) {
    templateFn = N.views[apiPath];
  } else {
    throw new Error('View template "' + apiPath + '" not found.');
  }

  // Clone locals/helpers objects to prevent destructive side-effects.
  locals  = locals  ? _.clone(locals)  : {};
  helpers = helpers ? _.clone(helpers) : {};

  // Stack of file API paths used when rendering partials.
  if (!helpers.__apiPathStack__) {
    helpers.__apiPathStack__ = [];
  }

  // Helper used to render partial templates. It's needed to properly render
  // translations and/or other partials by relative API path.
  if (!helpers.partial) {
    helpers.partial = function (partialPath, partialLocals) {
      return render(N, resolveApiPath(partialPath, helpers.__apiPathStack__), partialLocals, helpers);
    };
  }

  // Extend default translate helper with relative API path resolving.
  if (helpers.t && !helpers.t.wrapped) {
    translateFn = helpers.t;

    helpers.t = function (phrase, params) {
      return translateFn(resolveApiPath(phrase, helpers.__apiPathStack__), params);
    };

    helpers.t.exists = function (phrase) {
      return translateFn.exists(resolveApiPath(phrase, helpers.__apiPathStack__));
    };

    helpers.t.wrapped = true;
  }

  //
  // Render the view.
  //

  helpers.__apiPathStack__.push(apiPath);
  try {
    result = templateFn(_.extend(locals, helpers));
  } finally {
    helpers.__apiPathStack__.pop();
  }

  return result;
};
