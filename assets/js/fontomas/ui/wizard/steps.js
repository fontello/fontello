/*global fontomas, _, Backbone, Raphael*/

;(function () {
  "use strict";


  fontomas.ui.wizard.steps = Backbone.View.extend({
    el: '#wizard-steps',

    $result_tab:    null,
    $glyphs_count:  null,

    initialize: function () {
      // init tabs plugin
      this.$el.tab('show');

      this.$result_tab   = this.$('a[href="#result"]');
      this.$glyphs_count = this.$('a[href="#result"] #selected-glyphs-count');
    },

    activate: function (id) {
      this.$('a[href="' + id + '"]').tab('show');
    },

    setGlyphsCount: function (count) {
      this.$result_tab[!count ? 'addClass' : 'removeClass']('disabled');
      this.$glyphs_count.text(+count);
    }
  });

}());
