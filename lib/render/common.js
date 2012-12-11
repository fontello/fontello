'use strict';


/*global N, _*/


var getByPath = require('../util').getByPath;


////////////////////////////////////////////////////////////////////////////////


//  render.common(views, path, locals, layout, skipBaseLayout) -> String
//  - viewsTree (Object): Views tree (without locale and/or theme subpaths).
//  - path (String): View name to render, e.g. `forums.index`
//  - locals (Object): Locals data to pass to the renderer function
//  - layout (String): Layout to render, e.g. `default.blogs`
//  - skipBaseLayout (Boolean): Whenever to skip rendering base layout or not
//
//  Renders view registered as `path` with given `layout` and returns result.
//
//      render(views, 'blogs.post.show', 'default.blogs');
//
//  In the example above, it will render `blogs.post.show` view with given
//  `data`, then will render `default.blogs` layout with `data` where `content`
//  property will be rendered view.
//
function render(viewsTree, path, locals, layout, skipBaseLayout) {
  var t, html, view = getByPath(viewsTree, path);

  locals = _.defaults(locals || {}, {
    include: function (path) {
      var context = locals._apiContext[locals._apiContext.length - 1] || '@';
      return render(viewsTree, path.replace(/^@/, context), locals);
    },
    _apiContext: []
  });

  if (locals.t && !locals.t.wrapped) {
    t = locals.t;
    locals.t = function (phrase, params) {
      var context = locals._apiContext[locals._apiContext.length - 1];

      if (0 === phrase.indexOf('.')) {
        phrase = phrase.substr(1);
      } else if (context) {
        phrase = context + '.' + phrase;
      }

      return t.call(locals, phrase, params);
    };
    locals.t.wrapped = 1;
  }

  if (!!view) {
    try {
      locals._apiContext.push(path);
      html = view(locals);
    } finally {
      locals._apiContext.pop();
    }
  } else {
    // Here we just notify that view not found.
    // This should never happen - one must check path existance before render()
    N.logger.warn("View " + path + " not found");
    html = '';
  }

  if (layout) {
    layout = (_.isArray(layout) ? layout.slice() : [layout]);
    layout = (!!skipBaseLayout ? layout.slice(1) : layout).reverse();

    _.each(layout, function (path) {
      var fn = getByPath(viewsTree, path);

      if (!_.isFunction(fn)) {
        N.logger.warn("Layout " + path + " not found");
        return;
      }


      locals.content = html;

      try {
        locals._apiContext.push(path);
        html = fn(locals);
      } finally {
        locals._apiContext.pop();
      }
    });
  }

  return html;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = render;
