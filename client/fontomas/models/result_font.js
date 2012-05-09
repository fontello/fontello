/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

var raise_max_glyphs_reached = _.throttle(function () {
  nodeca.client.fontomas.util.notify('error',
    "You can't select more than " +
    nodeca.config.fontomas.max_glyphs +
    " icons at once. If you have a real use-case," +
    " please, create ticket in issue tracker.");
}, 1000);


module.exports = Backbone.Model.extend({
  initialize: function () {
    this.glyphs = new nodeca.client.fontomas.models.glyphs_collection();
  },


  getGlyph: function (font_id, glyph_id) {
    return this.glyphs.find(function (glyph) {
      var src = glyph.get('source_glyph');
      return font_id === src.font_id && glyph_id === src.glyph_id;
    });
  },


  addGlyph: function (data) {
    var model = new nodeca.client.fontomas.models.glyph({source_glyph: data});
    this.trigger('add-glyph', model);
    this.glyphs.add(model);
    this.validate();
  },


  validate: function () {
    if (this.glyphs.length <= nodeca.config.fontomas.max_glyphs) {
      return true;
    }

    raise_max_glyphs_reached();
    return false;
  },


  getFontConfig: function () {
    var config = {glyphs: []};

    this.glyphs.forEach(function (g) {
      var src = g.get('source_glyph'), fontname;

      fontname = _.find(nodeca.shared.fontomas.embedded_fonts, function (cfg) {
        return cfg.id === src.embedded_id;
      }).font.fontname;

      config.glyphs.push({
        code: g.get('unicode_code'),
        css:  g.get('css'),
        from: src.code,
        src:  fontname
      });
    });

    return config;
  },


  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});
