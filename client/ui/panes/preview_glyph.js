/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "preview-glyph span3",


  render: function () {
    var self = this,
        font = this.model.get('font').getName(),
        uid  = this.model.get('source').uid,
        code = nodeca.shared.glyphs_map[font][uid];

    this.$el.html(nodeca.client.render('preview.glyph', {
      css: this.model.get('css'),
      chr: nodeca.client.util.fixedFromCharCode(code)
    }));


    var $editor = this.$el.find('.name');

    $editor.on('change', function (event, val) {
      self.model.set( 'css', val );
    });

    nodeca.client.inplace_editor($editor, {
      html:   false,
      filter: function (val) {
        return String(val).replace(/[\t\r\n]+/g, ' ');
      }
    });

    return this;
  }
});
