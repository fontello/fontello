/*global $, _, ko, N*/


'use strict';


var render = require('../../../lib/render/client');


function NamesEditorModel() {
  this.glyphs = ko.observableArray();

  this.addGlyph = function (glyph) {
    this.glyphs.push(glyph);
  }.bind(this);

  this.removeGlyph = function (glyph) {
    this.glyphs.remove(glyph);
  }.bind(this);
}


var model = new NamesEditorModel();

//
// Bind event handlers
//

N.on('glyph:selected',    model.addGlyph);
N.on('glyph:unselected',  model.removeGlyph);


$(function () {
  var $view = $(render('app.names_editor')).appendTo('#names-editor');

  //
  // Bind model and view
  //

  ko.applyBindings(model, $view.get(0));
});
