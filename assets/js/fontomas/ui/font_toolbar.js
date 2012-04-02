/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  var config = fontomas.config;


  fontomas.ui.font_toolbar = Backbone.View.extend({
    tagName:  "form",
    id:       "fm-file-drop-zone",


    events: {
      "click .glyph-size-button":     "changeGlyphSize",
      "click #fm-file-browse-button": "fileBrowse",
      "change #fm-file":              "fileUpload",
      "dragover #fm-file-drop-zone":  "fileDragOver", // doesn't work
      "drop #fm-file-drop-zone":      "fileDrop",     // doesn't work
      "click .fm-font-name":          "useEmbedded"
    },


    initialize: function () {
      _.bindAll(this);

      this.render();

      // FIXME: workaround, because dragover/drag events don't work
      if (fontomas.env.filereader) {
        $('#fm-file-drop-zone').on("dragover",  this.fileDragOver);
        $('#fm-file-drop-zone').on("drop",      this.fileDrop);
      }
    },


    changeGlyphSize: function (event) {
      var size = parseInt($(event.target).val(), 10) ||
                 config.preview_glyph_sizes[0];

      event.preventDefault();
      this.trigger("changeGlyphSize", size);
    },


    fileBrowse: function (event) {
      event.preventDefault();

      if (fontomas.env.filereader) {
        $('#fm-file').click();
      } else {
        fontomas.util.notify_alert(
          "File upload is not supported by your" +
          " browser, use embedded fonts instead"
        );
      }
    },


    fileUpload: function (event) {
      this.trigger("fileUpload", event.target.files);
    },


    fileDragOver: function (event) {
      if (fontomas.env.filereader) {
        event.stopPropagation();
        event.preventDefault();
        event.originalEvent.dataTransfer.dropEffect = 'copy';
      }
    },


    fileDrop: function (event) {
      if (fontomas.env.filereader) {
        event.stopPropagation();
        event.preventDefault();
        this.trigger("fileDrop", event.originalEvent.dataTransfer.files);
      }
    },


    useEmbedded: function (event) {
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
        .find("button:first")
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
