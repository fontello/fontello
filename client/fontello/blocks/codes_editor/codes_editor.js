'use strict';


var ko = require('knockout');


function CodesEditorModel() {
  this.selectedGlyphs = N.app.fontsList.selectedGlyphs;
}


N.wire.once('navigate.done', function () {
  var $view = $('#codes-editor');

  // Bind model and view
  ko.applyBindings(new CodesEditorModel(), $view.get(0));

  // Remove glyph from selection
  //
  N.wire.on('codes_edit:glyph_remove', function glyph_remove(data) {
    var $el    = data.$this;
    var id    = $el.data('id');
    var glyph = N.app.fontsList.getGlyph(id);

    $el.closest('.result-glyph').fadeOut(function () {
      glyph.selected(false);
    });
  });

});
