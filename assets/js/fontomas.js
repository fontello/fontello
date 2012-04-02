/*global fontomas, _, Handlebars*/

;(function (global) {
  "use strict";


  var fontomas = window.fontomas = {}, tpl_cache = {};


  fontomas.models = {};
  fontomas.ui     = {};


  fontomas.config = {
    preview_glyph_sizes:  [24, 16]
  };


  // environment
  fontomas.env = {
    is_file_proto:  (window.location.protocol === "file:"),
    filereader:     null,
    fontface:       null
  };

  // TODO: on release - change fontomas.debug to `false`
  //       as it's needed for developers only

  // usage: index.html#debug
  fontomas.debug = '#debug' === window.location.hash;

  // debug logger
  fontomas.logger = {};

  // logger does nothing by default
  fontomas.logger.assert =
  fontomas.logger.error  =
  fontomas.logger.debug  = function () {};

  if (fontomas.debug) {
    fontomas.logger.assert = console.assert;
    fontomas.logger.error  = console.error;
    fontomas.logger.debug  = console.debug ? console.debug : console.log;
  }

  fontomas.render = function (id, locals) {
    var $tpl;

    if (!tpl_cache[id]) {
      $tpl = $('[data-tpl-id=' + id + ']').remove();
      tpl_cache[id] = Handlebars.compile($tpl.html());
    }

    return tpl_cache[id](locals || {});
  };

}());
