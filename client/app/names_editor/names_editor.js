/*global $, ko, N*/


'use strict';


var render = require('@/lib/render/client');


function NamesEditorModel(fontsList) {
  this.selectedGlyphs = fontsList.selectedGlyphs;
  this.fontSize       = ko.observable(16);
  this.hideGlyph      = function (el) {
    $(el).fadeOut(function () {
      $(this).remove();
    });
  };

  N.on('font_size_change',  this.fontSize);
}


module.exports.init = function () {
  N.once('fonts_ready', function (fontsList) {
    $(function () {
      var $view = $(render('app.names_editor')).appendTo('#names-editor');

      //
      // Bind model and view
      //

      ko.applyBindings(new NamesEditorModel(fontsList), $view.get(0));
    });
  });
};
