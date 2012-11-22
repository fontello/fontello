'use strict';


/*global $, ko, N*/


N.once('fonts_ready', function (fontsList) {
  $(function () {
    var $view = $('#tabs').tab();

    //
    // Bind model and view
    //

    ko.applyBindings(fontsList, $view.get(0));

    //
    // Jump to selector on resets
    //

    function jumpToSelector() {
      $view.find('a[href="#selector"]').tab('show');
    }

    N.on('reset_all',       jumpToSelector);
    N.on('reset_selected',  jumpToSelector);

    //
    // Jump to selector on startup
    //

    jumpToSelector();
  });
});
