/*global $, ko, N*/


'use strict';


var render = require('@/lib/render/client');

var fontSize  = ko.observable(16);


module.exports.init = function () {
  N.on('font_size_change',  fontSize);
  N.once('fonts_ready', function (fontsList) {
    $(function () {
      var $view = $(render('app.names_editor')).appendTo('#names-editor');

      //
      // Bind model and view
      //

      ko.applyBindings({
      	fontsList: fontsList,
      	fontSize: fontSize
      }, $view.get(0));
    });
  });
};
