/*global fontomas, _, Backbone, Raphael*/

;(function () {
  "use strict";


  // prevent the event from bubbling to ancestor elements
  function stopPropagation(event) {
    event.stopPropagation();
  }


  fontomas.ui.wizard.steps = Backbone.View.extend({
    el: '#wizard-steps',

    $preview_tab:   null,
    $result_tab:    null,
    $glyphs_count:  null,

    initialize: function () {
      // init tabs plugin
      this.$el.tab('show');

      this.$preview_tab  = this.$('a[href="#preview"]');
      this.$result_tab   = this.$('a[href="#result"]');
      this.$glyphs_count = this.$('a[href="#result"] #selected-glyphs-count');

      // disable click handler of tabs plugin on preview and result tabs
      this.$result_tab.add(this.$preview_tab).on('click', stopPropagation);
    },

    activate: function (id) {
      this.$('a[href="' + id + '"]').tab('show');
    },

    setGlyphsCount: function (count) {
      var $tabs = this.$result_tab.add(this.$preview_tab);

      $tabs.toggleClass('disabled', !count);
      $tabs[!count ? 'on' : 'off']('click', stopPropagation);

      this.$glyphs_count.text(+count);
    }
  });

}());
