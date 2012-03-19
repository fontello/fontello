/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  var config = Fontomas.config;


  Fontomas.views.SelectToolbar = Backbone.View.extend({
    tagName: "form",
    id: "fm-file-drop-zone",


    events: {
      "click .fm-icon-size-button":   "changeIconSize",
      "click #fm-file-browse-button": "fileBrowse",
      "change #fm-file":              "fileUpload",
      "dragover #fm-file-drop-zone":  "fileDragOver", // doesn't work
      "drop #fm-file-drop-zone":      "fileDrop",     // doesn't work
      "click .fm-font-name":          "useEmbedded"
    },


    initialize: function () {
      Fontomas.logger.debug("views.SelectToolbar.initialize");

      _.bindAll(this);

      this.topview    = this.options.topview;
    },


    render: function () {
      Fontomas.logger.debug("views.SelectToolbar.render");

      var self      = this,
          tpl_vars  = {buttons: config.preview_icon_sizes};

      // render icon size buttons
      $('#fm-icon-size')
        .html(Fontomas.render('icon-size', tpl_vars))
        .find("button:first")
          .addClass("active");

      // FIXME: workaround, because dragover/drag events don't work
      if (Fontomas.env.filereader) {
        // init file drag and drop
        $('#fm-file-drop-zone').on("dragover", function (event) {
          self.fileDragOver(event);
        });

        $('#fm-file-drop-zone').on("drop", function (event) {
          self.fileDrop(event);
        });
      }

      this.renderUseEmbedded();

      return this;
    },


    renderUseEmbedded: function () {
      Fontomas.logger.debug("views.SelectToolbar.renderUseEmbedded");

      var tpl_vars = {
        options: _.map(Fontomas.embedded_fonts, function (item) {
          return {text: item.fontname, disabled: item.is_added};
        })
      };

      $('#fm-use-embedded')
        .html(Fontomas.render('use-embedded', tpl_vars))
        .find('.fm-font-name')
          .each(function (id) {
            $(this).data("embedded_id", id);
          });
    },


    useEmbedded: function (event) {
      Fontomas.logger.debug("views.SelectToolbar.useEmbedded");

      var id    = $(event.target).data("embedded_id"),
          font  = Fontomas.embedded_fonts[id];

      Fontomas.logger.debug(font);
      event.preventDefault();

      if (font && !font.is_added) {
        this.topview.addEmbeddedFonts([font]);
      }
    },


    fileBrowse: function (event) {
      event.preventDefault();

      if (Fontomas.env.filereader) {
        $('#fm-file').click();
      } else {
        Fontomas.util.notify_alert(
          "File upload is not supported by your" +
          " browser, use embedded fonts instead"
        );
      }
    },


    fileUpload: function (event) {
      this.topview.addUploadedFonts(event.target.files);
    },


    fileDragOver: function (event) {
      //Fontomas.logger.debug("fileDragOver");
      if (Fontomas.env.filereader) {
        event.stopPropagation();
        event.preventDefault();
        event.originalEvent.dataTransfer.dropEffect = 'copy';
      }
    },


    fileDrop: function (event) {
      Fontomas.logger.debug("fileDrop");

      if (Fontomas.env.filereader) {
        event.stopPropagation();
        event.preventDefault();
        this.topview.addUploadedFonts(event.originalEvent.dataTransfer.files);
      }
    },


    changeIconSize: function (event) {
      Fontomas.logger.debug("views.SelectToolbar.changeIconSize");

      var size = parseInt($(event.target).val(), 10) ||
                 config.preview_icon_sizes[0];

      Fontomas.logger.debug('size='+size);
      event.preventDefault();

      // attach class
      $('.fm-glyph-group')
        .removeClass(config.icon_size_classes)
        .addClass(config.icon_size_prefix + size);

      // change width/height
      $('#fm-font-list')
        .find('.fm-glyph-div')
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
      $('#fm-generated-font')
        .removeClass(config.icon_size_classes)
        .addClass(config.icon_size_prefix + size);

      // change width/height
      $('#fm-generated-font')
        .find('.rg-icon')
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

}());
