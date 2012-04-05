/*global window, console, $, _, Handlebars*/

;(function (global) {
  "use strict";


  var fontomas = window.fontomas = {}, tpl_cache = {};


  fontomas.models = {};
  fontomas.ui     = {};


  fontomas.config = {
    code_autoguess_range: [0xe800, 0xf8ff], // low, high
    preview_glyph_sizes:  [24, 16]
  };


  // debug logger
  fontomas.logger = {};

  // logger does nothing by default
  fontomas.logger.assert =
  fontomas.logger.error  =
  fontomas.logger.debug  = function () {};

  // change `false` to `true` to enable logger on development
  if (false) {
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
