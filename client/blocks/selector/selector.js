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
  $('body').selectable({
    filter: 'li.glyph:visible',
    distance: 5,
    stop: function () {
      var $els = $view.find('.glyph.ui-selected');

      // prevent from double-triggering event,
      // otherwise click event will be fired as well
      if (1 === $els.length) {
        return;
      }

      $els.each(function () {
        ko.dataFor(this).toggleSelection();
      });
    }
  });

  //
  // Setup default collapse state
  //
  N.app.fontsList.fonts.forEach(function (font) { font.setCollapseState(); });

});
