/*global $, ko, N*/


'use strict';


function CodesEditorModel(fontsList) {
  this.selectedGlyphs = fontsList.selectedGlyphs;
  this.hideGlyph      = function (el) {
    $(el).fadeOut(function () {
      $(this).remove();
    });
  };
}


module.exports.init = function () {
  N.once('fonts_ready', function (fontsList) {
    $(function () {
      var $view = $('#codes-editor');

      //
      // Bind model and view
      //

      ko.applyBindings(new CodesEditorModel(fontsList), $view.get(0));
    });
  });
};
