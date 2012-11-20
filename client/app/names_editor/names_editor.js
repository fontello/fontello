/*global $, _, ko, N*/


'use strict';


function NamesEditorModel() {
  this.glyphs = ko.observableArray();

  this.addGlyph = function (glyph) {
    this.glyphs.push(glyph);
  }.bind(this);

  this.removeGlyph = function (glyph) {
    this.glyphs.remove(glyph);
  }.bind(this);
}


N.once('page:loaded', function () {
  $(function () {
    var
    $view = $(N.client.render('app.names_editor')).appendTo('#names-editor'),
    model = new NamesEditorModel();

    //
    // Bind event handlers
    //

    N.on('glyph.selected',    model.addGlyph);
    N.on('glyph.unselected',  model.removeGlyph);

    //
    // Bind model and view
    //

    ko.applyBindings(model, $view.get(0));
  });
});
