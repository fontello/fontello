/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  var config = Fontomas.config;


  Fontomas.views.SelectToolbar = Backbone.View.extend({
    tagName:  "form",
    id:       "fm-file-drop-zone",


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

      this.render();

      // FIXME: workaround, because dragover/drag events don't work
      if (Fontomas.env.filereader) {
        $('#fm-file-drop-zone').on("dragover",  this.fileDragOver);
        $('#fm-file-drop-zone').on("drop",      this.fileDrop);
      }
    },


    changeIconSize: function (event) {
      Fontomas.logger.debug("views.SelectToolbar.changeIconSize");

      var size = parseInt($(event.target).val(), 10) ||
                 config.preview_icon_sizes[0];

      Fontomas.logger.debug("size=", size);

      event.preventDefault();
      this.trigger("changeIconSize", size);
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
      this.trigger("fileUpload", event.target.files);
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
        this.trigger("fileDrop", event.originalEvent.dataTransfer.files);
      }
    },


    useEmbedded: function (event) {
      Fontomas.logger.debug("views.SelectToolbar.useEmbedded");

      var id    = $(event.target).data("embedded_id"),
          font  = Fontomas.embedded_fonts[id];

      event.preventDefault();

      if (font && !font.is_added) {
        this.trigger("useEmbeddedFont", font);
      }
    },


    render: function () {
      Fontomas.logger.debug("views.SelectToolbar.render");

      var tpl_vars = {buttons: config.preview_icon_sizes};

      // render icon size buttons
      $('#fm-icon-size')
        .html(Fontomas.render('icon-size', tpl_vars))
        .find("button:first")
          .addClass("active");

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

      return this;
    }
  });

}());
