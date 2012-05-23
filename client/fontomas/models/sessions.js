/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


var Session = Backbone.Model.extend({
  defaults: function () {
    return {
      name: 'Untitled',
      data: null
    };
  }
});


module.exports = Backbone.Collection.extend({
  localStorage: new Backbone.LocalStorage("Fontello:Sessions"),
  model:        Session,


  initialize: function () {
    this.fetch();

    // make sure "special" session exists
    if (0 === this.length) {
      this.create({name: '$current$'});
    }
  },


  save: function (name) {
    return this.create({name: name, data: this.get('data')});
  }
});
