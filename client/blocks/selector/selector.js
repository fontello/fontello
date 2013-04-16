'use strict';


/*global ko*/


var _ = require('lodash');


////////////////////////////////////////////////////////////////////////////////


N.wire.on('cmd:search_update', N.app.searchWord);



N.wire.on('reset_selected', function () {
  _.each(N.app.fontsList.selectedGlyphs(), function (glyph) {
    glyph.selected(false);
  });
});


N.wire.on('reset_all', function () {
  _.each(N.app.fontsList.modifiedGlyphs(), function (glyph) {
    glyph.selected(false);
    glyph.code(glyph.originalCode);
    glyph.name(glyph.originalName);
  });
});


N.wire.once('navigate.done', function (data) {
  var $view = $('#selector');

  // Bind model and view
  ko.applyBindings({
    fontsList:  N.app.fontsList,
    fontSize:   N.app.fontSize,
    searchMode: N.app.searchMode
  }, $view.get(0));

  // Init multi-select of glyphs
  $view.selectable({
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

  // Once all init finished - notify that fonts are ready
  N.wire.emit('fonts_ready', N.app.fontsList);

  // Setup initial search string.
  if (data.params && data.params.search) {
    N.wire.emit('cmd:search_update', data.params.search);
  }
});
