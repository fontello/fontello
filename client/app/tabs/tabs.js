'use strict';


/*global $, ko, nodeca*/


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


var selectedGlyphs = ko.observable(0);


nodeca.on('glyph:create', function (glyph) {
  glyph.selected.subscribe(function (value) {
    selectedGlyphs(selectedGlyphs() + (value ? +1 : -1));
  });
});


nodeca.once('page:loaded', function () {
  var
  $tabs_container = $('#tabs').tab(),
  $preview_tab    = $tabs_container.find('a[href="#preview"]'),
  $editor_tab     = $tabs_container.find('a[href="#codes-editor"]');

  // add submenu activation
  $tabs_container.find('a[data-toggle="tab"]').on('shown', function (event) {
    var $curr = $(event.target),
        $prev = $(event.relatedTarget);

    $($prev.data('submenu')).removeClass('active');
    $($curr.data('submenu')).addClass('active');
  });

  $preview_tab.add($editor_tab).on('click', stopPropagation);

  selectedGlyphs.subscribe(function (count) {
    var $tabs = $preview_tab.add($editor_tab);

    $tabs.toggleClass('disabled', !count);
    $tabs[!count ? 'on' : 'off']('click', stopPropagation);
  });

  // show selector tab after  load complete
  $tabs_container.find('a[href="#selector"]').tab('show');
});
