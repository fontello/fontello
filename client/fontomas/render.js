/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

var tpl_cache = {};


Handlebars.registerHelper("each_pair", function (context, options) {
  return _.map(context, function (val, key) {
    return options.fn({key: key, val: val});
  }).join('\n');
});


module.exports = function (id, locals) {
  var $tpl;

  if (!tpl_cache[id]) {
    $tpl = $('[data-tpl-id="' + id + '"]').remove();
    tpl_cache[id] = Handlebars.compile($tpl.html());
  }

  return tpl_cache[id](locals || {});
};
