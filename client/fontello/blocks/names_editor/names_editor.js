'use strict';


const ko = require('knockout');


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
  let $view = $('#names-editor');
  ko.applyBindings(new NamesEditorModel(), $view.get(0));


  // Remove glyph from selection
  //
  N.wire.on('names_edit:glyph_remove', function glyph_remove(data) {
    var $el    = data.$this;
    var id    = $el.data('id');
    var glyph = N.app.fontsList.getGlyph(id);

    $el.closest('.preview-glyph').fadeOut(function () {
      glyph.selected(false);
    });
  });


  /////////////////////////////////////////////////////////////////////////////
  // Sorting
  //

  let drag_glyph_uid;

  $('body')
    .on('dragstart', '.preview-glyph .icon', function (event) {
      drag_glyph_uid = $(this).data('id');

      // Firefox requires that a user run the dataTransfer.setData function in the event
      // http://stackoverflow.com/questions/18269677
      event.originalEvent.dataTransfer.setData('text/plain', drag_glyph_uid);

      // Disallow pointer events on child elements to correctly handle 'dragleave'
      // http://stackoverflow.com/questions/10867506
      $(this).closest('.preview-glyph-drop').addClass('preview-glyph-drop__m-current');
      $view.addClass('names-editor__m-drag-started');
    })
    .on('dragenter dragover', '.preview-glyph', function () {
      if ($(this).data('id') !== drag_glyph_uid) {
        $(this).addClass('preview-glyph__m-hovered');
      }
      return false;
    })
    .on('dragleave', '.preview-glyph', function () {
      $(this).removeClass('preview-glyph__m-hovered');
    })
    .on('drop', '.preview-glyph', function () {
      $('.preview-glyph.preview-glyph__m-hovered').removeClass('preview-glyph__m-hovered');
      // Allow pointer events
      $view.removeClass('names-editor__m-drag-started');
      $('.preview-glyph-drop__m-current').removeClass('preview-glyph-drop__m-current');

      let drop_glyph_uid = $(this).data('id');

      // Do nothing on drop to self
      if (drop_glyph_uid === drag_glyph_uid) return false;

      let drag_glyph = N.app.fontsList.getGlyph(drag_glyph_uid);
      let drop_glyph = N.app.fontsList.getGlyph(drop_glyph_uid);

      N.app.fontsList.lock();

      // Remove dragged glyph from selected
      N.app.fontsList.selectedGlyphs.remove(drag_glyph);

      let insert_index = N.app.fontsList.selectedGlyphs.indexOf(drop_glyph);

      // Insert before target glyph
      N.app.fontsList.selectedGlyphs.splice(insert_index, 0, drag_glyph);

      N.app.fontsList.unlock();

      N.wire.emit('session_save');
      return false;
    })
    .on('dragend', function () {
      $('.preview-glyph.preview-glyph__m-hovered').removeClass('preview-glyph__m-hovered');
      // Allow pointer events
      $view.removeClass('names-editor__m-drag-started');
      $('.preview-glyph-drop__m-current').removeClass('preview-glyph-drop__m-current');
      return false;
    });
});
