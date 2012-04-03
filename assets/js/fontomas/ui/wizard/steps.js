/*global fontomas, _, Backbone, Raphael*/

;(function () {
  "use strict";


  fontomas.ui.wizard.steps = Backbone.View.extend({
    el: '#wizard-steps',

    initialize: function () {
      // init tabs plugin
      this.$el.tab('show');
    }
  });

}());
