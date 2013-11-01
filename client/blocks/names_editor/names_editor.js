
'use strict';


var ko = require('knockout');


function NamesEditorModel() {

  this.selectedGlyphs = N.app.fontsList.selectedGlyphs;
  this.fontSize       = N.app.fontSize;
  this.cssPrefixText  = N.app.cssPrefixText;
  this.cssUseSuffix   = N.app.cssUseSuffix;
}


N.wire.once('navigate.done', function () {
  //
  // Bind model and view
  //
  var $view = $('#names-editor');
  ko.applyBindings(new NamesEditorModel(), $view.get(0));


  // Remove glyph from selection
  //
  N.wire.on('names_edit:glyph_remove', function (event) {
    var $el    = $(event.currentTarget);
    var id    = $el.data('id');
    var glyph = N.app.fontsList.getGlyph(id);

    $el.closest('.preview-glyph').fadeOut(function () {
      glyph.selected(false);
    });
  });

});
