/*global ko*/


'use strict';


function NamesEditorModel(fontsList) {
  this.selectedGlyphs = fontsList.selectedGlyphs;
  this.fontSize       = ko.observable(16);
  this.hideGlyph      = function (el) {
    $(el).fadeOut(function () {
      $(this).remove();
    });
  };

  N.wire.on('font_size_change',  this.fontSize);
}


N.wire.once('fonts_ready', function (fontsList) {
  $(function () {
    var $view = $('#names-editor');

    //
    // Bind model and view
    //

    ko.applyBindings(new NamesEditorModel(fontsList), $view.get(0));
  });
});
