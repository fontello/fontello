'use strict';


/*global $, ko, N*/


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


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

N.on('glyph:create', function (glyph) {
  glyph.selected.subscribe(function (value) {
    model.selectedGlyphs(model.selectedGlyphs() + (value ? +1 : -1));
  });
});


N.once('page:loaded', function () {
  $(function () {
    var $view = $('#toolbar'), $glyph_size_value;

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

    ko.applyBindings(model, $view.get(0));
  });
});
