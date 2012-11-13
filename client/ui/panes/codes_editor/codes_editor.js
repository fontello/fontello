/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";


module.exports = Backbone.View.extend({
  el: '#codes-editor',


  initialize: function () {
    var $glyphs = this.$('#result-font'), views = {};

    function add(glyph) {
      var v = new nodeca.client.ui.panes.codes_editor.glyph({model: glyph});
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
