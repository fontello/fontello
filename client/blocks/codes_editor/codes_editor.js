'use strict';


var ko = require('knockout');


function CodesEditorModel() {
  this.selectedGlyphs = N.app.fontsList.selectedGlyphs;

  this.hideGlyph = function (glyph) {
    $(glyph).fadeOut(function () {
      $(this).remove();
    });
  };
}


N.wire.once('navigate.done', function () {
  var $view = $('#codes-editor');

  // Bind model and view
  ko.applyBindings(new CodesEditorModel(), $view.get(0));
});
