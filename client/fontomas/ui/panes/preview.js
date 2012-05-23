/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  el: '#preview',


  initialize: function () {
    var $glyphs = this.$('#preview-font'), views = {};

    function add(glyph) {
      var v = new nodeca.client.fontomas.ui.panes.preview_glyph({model: glyph});
      views[glyph.cid] = v;
      $glyphs.append(v.render().el);
    }

    this.model.each(add);
    this.model.on('add', add);

    this.model.on('remove', function (glyph) {
      views[glyph.cid].remove();
      delete views[glyph.cid];
    });
  }
});
