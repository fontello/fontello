'use strict';


/*global $, ko, N*/


N.once('fonts_ready', function (fontsList) {
  $(function () {
    var
    $view = $('#tabs').tab(),
    tabs  = { selectedCount: fontsList.selectedCount };

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

    N.on('reset_all',       jumpToSelector);
    N.on('reset_selected',  jumpToSelector);

    //
    // Jump to selector on startup
    //

    jumpToSelector();
  });
});
