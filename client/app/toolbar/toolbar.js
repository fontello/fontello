'use strict';


/*global _, $, ko, N*/


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


var keywords = _.chain(require('../../../lib/shared/embedded_fonts'))
  .map(function (font) {
    return _.map(font.glyphs, function (glyph) {
      return glyph.search;
    });
  })
  .flatten()
  .map(String)
  .uniq()
  .value();


var model = {
  with3DEffect:   ko.observable(true),
  selectedGlyphs: ko.observable(0),
  fontname:       ko.observable(''),
  startDownload:  function () {
    if (0 === model.selectedGlyphs()) {
      return;
    }

    alert('Not yet implemented');
  }
};


//
// Expose some events
//

model.with3DEffect.subscribe(function (value) {
  N.emit('3d-mode:change', value);
});


//
// Subscribe to events
//


N.on('glyph:selected', function () {
  model.selectedGlyphs(model.selectedGlyphs() + 1);
});


N.on('glyph:unselected', function () {
  model.selectedGlyphs(model.selectedGlyphs() - 1);
});


N.once('page:loaded', function () {
  $(function () {
    var $view = $('#toolbar'), $glyph_size_value, $glyphs, $search, on_search_change;

    // initialize glyph-size slider
    $glyph_size_value = $('#glyph-size-value');
    $('#glyph-size-slider').slider({
      orientation:  'horizontal',
      range:        'min',
      value:        N.config.app.glyph_size.val,
      min:          N.config.app.glyph_size.min,
      max:          N.config.app.glyph_size.max,
      slide:        function (event, ui) {
        /*jshint bitwise:false*/
        var val = ~~ui.value;
        $glyph_size_value.text(val + 'px');
        N.emit('font-size:change', val);
      }
    });

    $glyphs = $('.glyph');

    // search query change event listener
    on_search_change = function (event) {
      var q = $.trim($search.val());

      if (0 === q.length) {
        $glyphs.show();
        return;
      }

      $glyphs.hide().filter(function () {
        var model = ko.dataFor(this);
        return model && 0 <= model.keywords.indexOf(q);
      }).show();
    };

    // init search input
    $search = $('#search')
      .on('change', on_search_change)
      .on('keyup', _.debounce(on_search_change, 250))
      .on('focus keyup', _.debounce(function () {
        $search.typeahead('hide');
      }, 5000))
      .typeahead({
        source: keywords
      });

    ko.applyBindings(model, $view.get(0));
  });
});
