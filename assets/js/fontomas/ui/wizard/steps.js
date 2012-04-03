/*global fontomas, _, Backbone, Raphael*/

;(function () {
  "use strict";


  fontomas.ui.wizard.steps = Backbone.View.extend({
    el: '#wizard-steps',

    initialize: function () {
      // init tabs plugin
      this.$el.tab('show');
    },

    activate: function (id) {
      this.$('a[href="' + id + '"]').tab('show');
    },

    // WILL BE REMOVED SOON
    enable: function (id) {
      this.$('a[href="' + id + '"]').removeClass('disabled');
    },

    disable: function (id) {
      this.$('a[href="' + id + '"]').addClass('disabled');
    }
  });

}());
