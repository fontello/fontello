'use strict';


/*global $, ko, N*/


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


N.once('fonts_ready', function (fontsList) {
  $(function () {
    var
    $tabs_container = $('#tabs').tab(),
    $names_tab      = $tabs_container.find('a[href="#names-editor"]'),
    $codes_tab      = $tabs_container.find('a[href="#codes-editor"]'),
    $editors        = $names_tab.add($codes_tab);

    // add submenu activation
    $tabs_container.find('a[data-toggle="tab"]').on('shown', function (event) {
      var $curr = $(event.target),
          $prev = $(event.relatedTarget);

      $($prev.data('submenu')).removeClass('active');
      $($curr.data('submenu')).addClass('active');
    });

    function toggleEditors(count) {
      $editors.toggleClass('disabled', !count);
      $editors[!count ? 'on' : 'off']('click', stopPropagation);
    }

    toggleEditors(fontsList.selectedCount());
    fontsList.selectedCount.subscribe(toggleEditors);

    N.on('reset_all', function (type) {
      $tabs_container.find('a[href="#selector"]').tab('show');
    });

    N.on('reset_selected', function (type) {
      $tabs_container.find('a[href="#selector"]').tab('show');
    });

    // show selector tab after  load complete
    $tabs_container.find('a[href="#selector"]').tab('show');
  });
});
