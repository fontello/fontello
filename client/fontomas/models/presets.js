/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


var Preset = Backbone.Model.extend({
  defaults: function () {
    return {
      name:             'Untitled',
      collapsed:        [],
      selected_glyphs:  [],
      glyph_changes:    [],
      user_fonts:       []
    };
  }
});


module.exports = Backbone.Collection.extend({
  localStorage: new Backbone.LocalStorage("Fontello:Presets"),
  model:        Preset,


  initialize: function () {
    this.fetch();

    // make sure "special" preset exists
    if (0 === this.length) {
      this.create({name: '$current$'});
    }

    // cache special preset
    this.$current = this.at(0);
  },


  toggleGlyph: function (data, state) {
    var glyphs = this.$current.get('selected_glyphs');

    if (state) {
      glyphs = _.union(glyphs, [data]);
    } else {
      glyphs = _.filter(glyphs, function (glyph) {
        return !_.isEqual(glyph, data);
      });
    }
    this.$current.set('selected_glyphs', glyphs);
    this.$current.save();
  },


  save: function (name) {
    var attribs = _.extend(this.$current.toJSON(), {
      id:     null,
      name:   name
    });

    delete attribs.id;
    this.create(attribs);
  }
});
