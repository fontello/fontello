/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


var Preset = Backbone.Model.extend({
  defaults: function () {
    return {
      name: 'Untitled',
      data: null
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


  save: function (name) {
    return this.create({name: name, data: this.get('data')});
  }
});
