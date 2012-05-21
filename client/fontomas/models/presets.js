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
  },


  load: function () {
    console.log('Not implemented yet');
  }
});


module.exports = Backbone.Collection.extend({
  localStorage: new Backbone.LocalStorage("Fontello:Presets"),
  model:        Preset,


  initialize: function () {
    this.fetch();

    // get special case preset
    if (0 === this.length) {
      this.create({name: '$current$'});
    }

    // cache special preset
    this.$current = this.at(0);
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
