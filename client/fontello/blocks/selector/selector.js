'use strict';


const ko = require('knockout');


N.wire.once('navigate.done', function () {
  const $view = $('#selector');

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
  //$view.xselectable({
  // We attach selectable to "body", to allow start
  // dragging from the left white space.
  $view.xselectable({
    filter: '.selector__glyph:visible',
    distance: 3
  })
    .on('xselectablestart', () => {
      $view.addClass('_multicursor');
    })
    .on('xselectablestop', () => {
      let $els = $view.find('.selector__glyph.xselectable-selected');

      $els.removeClass('xselectable-selected');

      // prevent from double-triggering event,
      // otherwise click event will be fired as well
      if ($els.length === 1) {
        return;
      }

      N.app.fontsList.lock();

      $els.each(function () {
        let id = $(this).data('id');
        let glyph = N.app.fontsList.getGlyph(id);

        glyph.selected(!glyph.selected());
      });

      N.app.fontsList.unlock();

      $view.removeClass('_multicursor');
    })
    .on('mousedown', () => {
      // We should send blur manually because of issue with jQuery UI selectable,
      // http://stackoverflow.com/questions/8869708/click-on-jquery-sortable-list-does-not-blur-input
      $('input').blur();
    });

  //
  // Additionally setup class switch on mouse down/up,
  // to change cursor immediately after click on glyph
  //
  $view.on('mousedown', '.glyph', () => {
    $view.addClass('_multicursor');
  });
  $view.on('mouseup', () => {
    $view.removeClass('_multicursor');
  });

  // Toggle glyph state on click
  //
  N.wire.on('selector:glyph_toggle', function glyph_toggle(data) {
    let id = data.$this.data('id');
    let glyph = N.app.fontsList.getGlyph(id);

    glyph.selected(!glyph.selected());
  });

  // Toggle font collapse state on click
  //
  N.wire.on('selector:font_collapse', function font_collapse(data) {
    let id = data.$this.data('id');
    let font = N.app.fontsList.getFont(id);

    font.collapsed(!font.collapsed());
  });
});
