/*global ko*/


'use strict';


function NamesEditorModel() {

  this.selectedGlyphs = N.app.fontsList.selectedGlyphs;
  this.fontSize       = N.app.fontSize;
  this.cssPrefixText  = N.app.cssPrefixText;
  this.cssUseSuffix   = N.app.cssUseSuffix;

  this.hideGlyph      = function (el) {
    $(el).fadeOut(function () {
      $(this).remove();
    });
  };
}


N.wire.once('navigate.done', function () {
  //
  // Bind model and view
  //
  var $view = $('#names-editor');
  ko.applyBindings(new NamesEditorModel(), $view.get(0));
});
