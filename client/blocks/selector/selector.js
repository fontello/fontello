'use strict';


var ko = require('knockout');


N.wire.once('navigate.done', function () {
  var $view = $('#selector');

  //
  // Bind model and view
  //
  ko.applyBindings({
    fontsList:  N.app.fontsList,
    fontSize:   N.app.fontSize,
    searchMode: N.app.searchMode
  }, $view.get(0));

  //
  // Init multi-select of glyphs
  //
  //$view.selectable({
  // We attach selectable to "body", to allow start
  // dragging from the left white space.
  $('#selector').selectable({
    filter: '.selector__glyph:visible',
    distance: 3,
    start: function() {
      $('#selector').addClass('_multicursor');
    },
    stop: function () {
      var $els = $view.find('.selector__glyph.ui-selected');

      // prevent from double-triggering event,
      // otherwise click event will be fired as well
      if (1 === $els.length) {
        return;
      }

      $els.each(function () {
        ko.dataFor(this).toggleSelection();
      });

      $('#selector').removeClass('_multicursor');
    }
  });

  //
  // Additionally setup class switch on mouse down/up,
  // to change cursor immediately after click on glyph
  //
  $('#selector').on('mousedown', '.glyph', function() {
    $('#selector').addClass('_multicursor');
  });
  $('#selector').on('mouseup', function() {
    $('#selector').removeClass('_multicursor');
  });

  //
  // Setup default collapse state
  //
  N.app.fontsList.fonts.forEach(function (font) { font.setCollapseState(); });

});
