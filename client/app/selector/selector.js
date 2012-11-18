/*global $, _, nodeca*/


'use strict';


nodeca.once('page:loaded', function () {
  var
  fonts         = require('../../../shared/embedded_fonts'),
  glyphs_map    = require('../../../shared/glyphs_map'),
  fromCharCode  = require('../../../shared/util').fixedFromCharCode;


  $.each(fonts, function () {
    var remap = glyphs_map[this.font.fontname];

    $.each(this.glyphs, function () {
      this.code_as_text = fromCharCode(remap[this.uid]);
    });
  });


  $(function () {
    var $fonts_list = $(nodeca.client.render('app.selector', { fonts: fonts }));

    nodeca.on('font-size:change', function (size) {
      $fonts_list.css('font-size', size);
    });

    nodeca.on('3d-mode:change', function (val) {
      $fonts_list.toggleClass('_3d', val);
    });

    $fonts_list.find('li.glyph').on('click', function () {
      $(this).toggleClass('selected');
    });

    $fonts_list.appendTo('#selector');
  });
});
