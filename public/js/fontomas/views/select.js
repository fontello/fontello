var Fontomas = (function (_, Backbone, Fontomas) {
  "use strict";

  var config = Fontomas.cfg;

  Fontomas.app.views.SelectToolbar = Backbone.View.extend({
    tagName: "form",
    id: "fm-file-drop-zone",

    templates: {},

    events: {
      "click .fm-icon-size-button":   "changeIconSize",
      "click #fm-file-browse-button": "fileBrowse",
      "change #fm-file":              "fileUpload",
      "dragover #fm-file-drop-zone":  "fileDragOver", // doesn't work
      "drop #fm-file-drop-zone":      "fileDrop",     // doesn't work
      "click .fm-font-name":          "useEmbedded"
    },

    initialize: function () {
      console.log("app.views.SelectToolbar.initialize");

      _.bindAll(this);

      this.topview    = this.options.topview;
      this.templates  = this.topview.getTemplates(["icon_size", "use_embedded"]);
    },

    render: function () {
      console.log("app.views.SelectToolbar.render");

      var self      = this,
          tpl_vars  = {buttons: config.preview_icon_sizes};

      // render icon size buttons
      $(config.id.icon_size)
        .html(this.templates.icon_size(tpl_vars))
        .find("button:first")
          .addClass("active");

      // FIXME: workaround, because dragover/drag events don't work
      if (Fontomas.env.filereader) {
        // init file drag and drop
        $(config.id.file_drop_zone).on("dragover",  function (event) {
          self.fileDragOver(event);
        });
        $(config.id.file_drop_zone).on("drop",      this.fileDrop.bind(this));
      }

      this.renderUseEmbedded();

      return this;
    },

    renderUseEmbedded: function () {
      console.log("app.views.SelectToolbar.renderUseEmbedded");

      var tpl_vars = {
        options: _.map(Fontomas.app.embedded_fonts, function (item) {
          return {text: item.fontname, disabled: item.is_added};
        })
      };

      $(config.id.use_embedded)
        .html(this.templates.use_embedded(tpl_vars))
        .find(config.css_class.font_name)
          .each(function (id) {
            $(this).data("embedded_id", id);
          });
    },

    useEmbedded: function (event) {
      console.log("app.views.SelectToolbar.useEmbedded");

      var id    = $(event.target).data("embedded_id"),
          font  = Fontomas.app.embedded_fonts[id];

      console.assert(font);
      event.preventDefault();

      if (font && !font.is_added) {
        this.topview.addEmbeddedFonts([font]);
      }
    },

    fileBrowse: function (event) {
      event.preventDefault();

      if (Fontomas.env.filereader) {
        $(config.id.file).click();
      } else {
        Fontomas.lib.util.notify_alert(
          "File upload is not supported by your" +
          " browser, use embedded fonts instead"
        );
      }
    },

    fileUpload: function (event) {
      this.topview.addUploadedFonts(event.target.files);
    },

    fileDragOver: function (event) {
      //console.log("fileDragOver");
      if (Fontomas.env.filereader) {
        event.stopPropagation();
        event.preventDefault();
        event.originalEvent.dataTransfer.dropEffect = 'copy';
      }
    },

    fileDrop: function (event) {
      console.log("fileDrop");

      if (Fontomas.env.filereader) {
        event.stopPropagation();
        event.preventDefault();
        this.topview.addUploadedFonts(event.originalEvent.dataTransfer.files);
      }
    },

    changeIconSize: function (event) {
      console.log("app.views.SelectToolbar.changeIconSize");

      var size = parseInt($(event.target).val(), 10) ||
                 config.preview_icon_sizes[0];

      console.log('size='+size);
      event.preventDefault();

      // attach class
      $(config.css_class.glyph_group)
        .removeClass(config.icon_size_classes)
        .addClass(config.icon_size_prefix + size);

      // change width/height
      $(config.id.font_list)
        .find(config.css_class.glyph_div)
        .each(function (i) {
          var $this   = $(this),
              size_x  = $this.data("glyph_sizes")[size][0],
              size_y  = $this.data("glyph_sizes")[size][1];

          $this.css({
            "width":        size_x + "px",
            "height":       size_y + "px",
            "margin-left":  "-" + Math.round(size_x / 2) + "px",
            "margin-top":   "-" + Math.round(size_y / 2) + "px"
          }).find("svg").css({
            "width":        size_x + "px",
            "height":       size_y + "px"
          });
        });

      // do the same on the rearrange tab
      $(config.id.generated_font)
        .removeClass(config.icon_size_classes)
        .addClass(config.icon_size_prefix + size);

      // change width/height
      $(config.id.generated_font)
        .find(config.css_class.rg_icon)
        .each(function (i) {
          var $this    = $(this),
              glyph_id = $(this).parent().siblings(".fm-glyph-id").val(),
              size_x   = size,
              size_y   = size;

          // FIXME
          if (glyph_id !== "") {
            size_x = $this.data("glyph_sizes")[size][0];
            size_y = $this.data("glyph_sizes")[size][1];
          }

          $this.css({
            "width":        "100%",
            "height":       size_y + "px",
            "left":         "0px",
            "margin-left":  "0px",
            "margin-top":   "-" + Math.round(size_y/2) + "px"
          }).find("svg").css({
            width: size_x + "px",
            height: size_y + "px"
          });
        });
    }
  });

  return Fontomas;
}(window._, window.Backbone, Fontomas || {}));
