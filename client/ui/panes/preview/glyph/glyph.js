/*global window, N, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "preview-glyph span3",


  render: function () {
    var self = this,
        font = this.model.get('font').getName(),
        uid  = this.model.get('source').uid,
        code = require('../../../../../shared/glyphs_map')[font][uid];

    this.$el.html(N.client.render('ui.panes.preview.glyph', {
      css: this.model.get('css'),
      chr: require('../../../../../shared/util').fixedFromCharCode(code)
    }));


    this.$el.find('.glyph-name').inplaceEditor({
      noPaste:      true,
      validateChar: function (char) {
        return (/[a-zA-Z0-9\-\_]/).test(char) && 20 > this.getValue().length;
      }
    }).on('change', function (event, value) {
      self.model.set('css', value);
    });

    return this;
  }
});
