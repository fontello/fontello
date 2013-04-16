'use strict';


/*global ko*/


N.wire.once('fonts_ready', function () {
  $(function () {
    var $view = $('#tabs').tab()
      , tabs  = { selectedCount: N.app.fontsList.selectedCount };

    //
    // Bind model and view
    //

    ko.applyBindings(tabs, $view.get(0));

    //
    // Jump to selector on resets
    //

    function jumpToSelector() {
      $view.find('a[data-target="#selector"]').tab('show');
    }

    N.wire.on('reset_all',      jumpToSelector);
    N.wire.on('reset_selected', jumpToSelector);

    //
    // Jump to selector if no selected glyphs left
    //

    N.app.fontsList.selectedCount.subscribe(function (count) {
      if (0 === count) {
        jumpToSelector();
      }
    });

    //
    // Jump to selector on startup
    //

    jumpToSelector();
  });
});
