/*global $, ko*/


'use strict';


var render = require('@/lib/render/client');


module.exports = function (window, N) {
  N.once('fonts_ready', function (fontsList) {
    $(function () {
      var $view = $(render('app.codes_editor')).appendTo('#codes-editor');

      //
      // Bind model and view
      //

      ko.applyBindings(fontsList, $view.get(0));
    });
  });
};
