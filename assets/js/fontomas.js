/*global fontomas, _, Handlebars*/

;(function () {
  "use strict";


  window.fontomas = {};
  fontomas.models = {};
  fontomas.ui     = {};


  var logger = {}, tpl_cache = {};


  fontomas.config = {
    preview_glyph_sizes:  [32, 24, 16]
  };


  // environment
  fontomas.env = {
    is_file_proto:  (window.location.protocol === "file:"),
    filereader:     null,
    fontface:       null
  };


  fontomas.debug = false;

  // usage: index.html#debug
  _.each(window.location.hash.substr(1).split("&"), function (str) {
    var vars = str.split(":");

    if ("debug" === vars.shift()) {
      fontomas.debug = true;
    }
  });


  logger.assert =
  logger.error  =
  logger.debug  = function () {};

  if (fontomas.debug) {
    logger.assert = console.assert;
    logger.error  = console.error;
    logger.debug  = console.debug ? console.debug : console.log;
  }

  fontomas.logger = logger;


  fontomas.render = function (id, locals) {
    var $tpl;

    if (!tpl_cache[id]) {
      $tpl = $('[data-tpl-id=' + id + ']').remove();
      tpl_cache[id] = Handlebars.compile($tpl.html());
    }

    return tpl_cache[id](locals || {});
  };

}());
