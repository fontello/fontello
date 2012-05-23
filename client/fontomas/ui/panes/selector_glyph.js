/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  tagName:    'li',
  className:  'glyph',


  events: {
    click: function () {
      this.model.toggle('selected');
    }
  },


  initialize: function () {
    var self = this,
        code = this.model.get('source').code,
        text = nodeca.client.fontomas.util.fixedFromCharCode(code);

    this.$el.data('model', this.model);
    this.$el.text(text);

    //
    // Listen to the model changes
    //

    this.model.on('change:selected', function (g, v) {
      self.$el.toggleClass('selected', v);
    });
  }
});
