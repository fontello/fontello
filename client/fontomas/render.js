/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

var tpl_cache = {};

module.exports = function (id, locals) {
  var $tpl;

  if (!tpl_cache[id]) {
    $tpl = $('[data-tpl-id=' + id + ']').remove();
    tpl_cache[id] = Handlebars.compile($tpl.html());
  }

  return tpl_cache[id](locals || {});
};
