/*global window, N, jQuery, Handlebars, Backbone, $, _*/


"use strict";


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


module.exports = Backbone.View.extend({
  el: '#tabs',

  $preview_tab:   null,
  $editor_tab:    null,

  initialize: function () {
    // init tabs plugin
    this.$el.tab('show');

    // add submenu activation
    this.$('a[data-toggle="tab"]').on('shown', function (event) {
      var $curr = $(event.target),
          $prev = $(event.relatedTarget);

      $($prev.data('submenu')).removeClass('active');
      $($curr.data('submenu')).addClass('active');
    });

    this.$preview_tab = this.$('a[href="#preview"]');
    this.$editor_tab  = this.$('a[href="#codes-editor"]');

    // disable click handler of tabs plugin on preview and result tabs
    this.$preview_tab.add(this.$editor_tab).on('click', stopPropagation);
  },

  activate: function (id) {
    this.$('a[href="' + id + '"]').tab('show');
  },

  setGlyphsCount: function (count) {
    var $tabs = this.$preview_tab.add(this.$editor_tab);

    $tabs.toggleClass('disabled', !count);
    $tabs[!count ? 'on' : 'off']('click', stopPropagation);
  }
});
