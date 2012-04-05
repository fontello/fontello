/*global fontomas, _, $, Backbone*/

;(function () {
  "use strict";


  var config = fontomas.config;


  fontomas.ui.wizard.selector.toolbar = Backbone.View.extend({
    el: "#selector-toolbar",

    events: {
      "click .glyph-size-button":     "changeGlyphSize",
      "click #fm-file-browse-button": "fileBrowse",
      "change #fm-file":              "fileUpload",
      "click .fm-font-name":          "onActivateEmbeddedFont"
    },


    initialize: function () {
      _.bindAll(this);

      this.render();
    },


    changeGlyphSize: function (event) {
      var size = parseInt($(event.target).val(), 10) ||
                 _.last(config.preview_glyph_sizes);

      event.preventDefault();
      this.trigger("changeGlyphSize", size);
    },


    fileBrowse: function (event) {
      event.preventDefault();

      if (!window.FileReader) {
        fontomas.util.notify_alert(
          "File upload is not supported by your" +
          " browser, use embedded fonts instead"
        );
        return;
      }

      //$('#fm-file').click();
      fontomas.util.notify_alert('File upload is temporarily disabled');
      return;
    },


    fileUpload: function (event) {
      this.trigger("fileUpload", event.target.files);
    },


    onActivateEmbeddedFont: function (event) {
      var id    = $(event.target).data("embedded_id"),
          font  = fontomas.embedded_fonts[id];

      event.preventDefault();

      if (font && !font.is_added) {
        this.trigger("useEmbeddedFont", font);
      }
    },


    render: function () {
      var tpl_vars = {buttons: config.preview_glyph_sizes};

      // render icon size buttons
      $('#glyph-size')
        .html(fontomas.render('icon-size', tpl_vars))
        .find("button:last")
          .addClass("active");

      this.renderUseEmbedded();

      return this;
    },


    renderUseEmbedded: function () {
      var tpl_vars = {
        options: _.map(fontomas.embedded_fonts, function (item) {
          return {text: item.fontname, disabled: item.is_added};
        })
      };

      $('#fm-use-embedded')
        .html(fontomas.render('use-embedded', tpl_vars))
        .find('.fm-font-name')
          .each(function (id) {
            $(this).data("embedded_id", id);
          });

      return this;
    }
  });

}());
