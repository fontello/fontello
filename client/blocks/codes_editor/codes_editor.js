'use strict';


/*global ko*/


function CodesEditorModel(fontsList) {
  this.selectedGlyphs = fontsList.selectedGlyphs;

  this.hideGlyph = function (glyph) {
    $(glyph).fadeOut(function () {
      $(this).remove();
    });
  };
}


N.wire.once('fonts_ready', function (fontsList) {
  var $view = $('#codes-editor');

  // Bind model and view
  ko.applyBindings(new CodesEditorModel(fontsList), $view.get(0));
});
