/*global Fontomas, _, Backbone, Handlebars*/

;(function () {
  "use strict";


  var config = Fontomas.config;


  Fontomas.views.app = Backbone.View.extend({
    myfiles:        [],
    next_font_id:   1,
    fonts:          null,
    fontviews:      {},
    select_toolbar: null,
    resultfontview: null,
    events:         {},


    initialize: function () {
      Fontomas.logger.debug("views.app.initialize");

      _.bindAll(this);

      this.select_toolbar = new Fontomas.views.SelectToolbar({
        el: $('#fm-file-drop-zone')[0]
      });
      this.select_toolbar.on("changeIconSize",  this.onChangeIconSize,  this);
      this.select_toolbar.on("fileDrop",        this.onFileDrop,        this);
      this.select_toolbar.on("fileUpload",      this.onFileUpload,      this);
      this.select_toolbar.on("useEmbeddedFont", this.onUseEmbeddedFont, this);

      this.fonts = new Fontomas.models.FontsCollection;
      this.fonts.on("add",   this.addOneFont,  this);
      this.fonts.on("reset", this.addAllFonts, this);

      var resultfont = new Fontomas.models.ResultFont;
      this.resultfontview = new Fontomas.views.ResultFont({model: resultfont});
      this.resultfontview.on("someGlyphsSelected", this.menuOn,  this);
      this.resultfontview.on("noGlyphsSelected",   this.menuOff, this);
    },


    onChangeIconSize: function (size) {
      Fontomas.logger.debug("views.app.onChangeIconSize");

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
          var $this = $(this),
            size_x  = $this.data("glyph_sizes")[size][0],
            size_y  = $this.data("glyph_sizes")[size][1];

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
    },


    onUseEmbeddedFont: function (font) {
      Fontomas.logger.debug("views.app.onUseEmbeddedFont");

      this.addEmbeddedFonts([font]);
    },


    onFileUpload: function (files) {
      Fontomas.logger.debug("views.app.onFileUpload");

      this.addUploadedFonts(files);
    },


    onFileDrop: function (files) {
      Fontomas.logger.debug("views.app.onFileDrop");

      this.addUploadedFonts(files);
    },


    render: function () {
      Fontomas.logger.debug("views.app.render");

      // render the select tab
      this.select_toolbar.render();

      // auto load embedded fonts
      // debug
      if (!(Fontomas.debug.is_on && Fontomas.debug.noembedded)) {
        this.addEmbeddedFonts(Fontomas.embedded_fonts);
      }

      // first tab is fully initialized so show it
      $("#tab a:first").tab("show");

      // render the rearrange tab
      this.resultfontview.render();

      return this;
    },


    addEmbeddedFonts: function (embedded_fonts) {
      var self = this;

      this.addFontsAsStrings(embedded_fonts, function (fileinfo) {
        // onload closure
        var e_id = fileinfo.embedded_id;

        // FIXME
        self.addFont(fileinfo, function (fileinfo) {
          // onclose closure
          Fontomas.embedded_fonts[e_id].is_added = fileinfo.is_added;
          self.select_toolbar.renderUseEmbedded();
        });

        Fontomas.embedded_fonts[e_id].is_added = fileinfo.is_added;
        Fontomas.embedded_fonts[e_id].fontname = fileinfo.fontname;

        self.select_toolbar.renderUseEmbedded();
      });
    },


    addFontsAsStrings: function (files, cb_onload) {
      var self = this;

      Fontomas.logger.debug("views.app.addFontsAsStrings flen=", files.length);

      _.each(files, function (f) {
        var fileinfo;

        fileinfo = {
          id:             self.myfiles.length,
          filename:       f.filename,
          filesize:       f.content.length,
          filetype:       f.filetype,
          fontname:       "unknown",
          is_loaded:      true,
          is_ok:          false,
          is_added:       false,
          is_dup:         false,
          error_msg:      "",
          content:        f.content,
          embedded_id:    f.id
        };

        self.myfiles.push(fileinfo);

        if (cb_onload) {
          cb_onload(fileinfo);
        }

        f.is_ok     = fileinfo.is_ok;
        f.is_added  = fileinfo.is_added;
        f.fontname  = fileinfo.fontname;
      });
    },


    addUploadedFonts: function (files) {
      this.addFonts(files, _.bind(this.addFont, this));
    },


    addFonts: function (files, callback) {
      var self = this;

      Fontomas.logger.debug("views.app.addFonts");

      _.each(files, function (f) {
        var fileinfo, reader = new FileReader();

        fileinfo = {
          id:             self.myfiles.length,
          filename:       f.name,
          filesize:       f.size,
          filetype:       f.type,
          fontname:       "unknown",
          is_loaded:      false,
          is_ok:          false,
          is_added:       false,
          is_dup:         false,
          error_msg:      "",
          content:        null,
          embedded_id:    null
        };

        self.myfiles.push(fileinfo);

        reader.onload = function (event) {
          // FIXME: race condition?
          // is there a file with the same content?
          var is_exist = false;

          _.each(self.myfiles, function (f) {
            if (event.target.result === f.content) {
              is_exist = fileinfo.is_dup = true;
            }
          });

          if (!is_exist) {
            fileinfo.content    = event.target.result;
            fileinfo.is_loaded  = true;
          }

          if (callback) {
            callback(fileinfo);
          }
        };

        reader.readAsBinaryString(f);
      });
    },


    addFont: function (fileinfo, cb_onclose) {
      /*jshint newcap:false*/
      Fontomas.logger.debug("views.app.addFont id=", fileinfo.id);

      var font, file_ext;

      // if it is a dup, skip it
      if (fileinfo.is_dup) {
        return;
      }

      file_ext  = Fontomas.util.getFileExt(fileinfo.filename);
      font      = Fontomas.models.Font.parse(file_ext, fileinfo.content);

      if (!font) {
        // unknown file exstension
        Fontomas.util.notify_alert(
          "Can't parse file '" + fileinfo.filename +
          "': unknown file extension. Currently, we support only: " +
          Fontomas.models.Font.supported_types.join(", ") + "."
        );
        return;
      }

      if (!font) {
        Fontomas.logger.error("invalid file");

        fileinfo.is_ok     = false;
        fileinfo.error_msg = "invalid file";

        Fontomas.util.notify_alert(
          "Loading error: can't parse file '" +
          fileinfo.filename + "'"
        );

        return;
      }

      fileinfo.is_ok    = true;
      fileinfo.is_added = true;
      fileinfo.fontname = font.id;

      this.createFont(_.extend({}, fileinfo, {font: font}));

      /*
          // scroll to the loaded font
          var fonthash = 'a[href="#font-'+fileinfo.id+'"]';
          $("html,body").animate({scrollTop: $(fonthash).offset().top}, 500);
      */
    },


    createFont: function (attrs) {
      Fontomas.logger.debug("views.app.create attrs=", attrs);

      //if (!attrs.id) // FIXME
      attrs.id = this.next_font_id++;
      this.fonts.create(attrs);
    },


    addOneFont: function (font) {
      Fontomas.logger.debug("views.app.addOneFont");

      var view = new Fontomas.views.Font({model: font});
      view.on("toggleGlyph",        this.toggleGlyph,         this);
      view.on("closeEmbeddedFont",  this.onCloseEmbeddedFont, this);

      this.fontviews[font.id] = view;
      $("#fm-font-list").append(view.render().el);
    },


    toggleGlyph: function (glyph_id, glyph) {
      Fontomas.logger.debug("views.app.toggleGlyph glyph=", glyph);

      var found_glyph = this.resultfontview.model.glyphs.find(function (item) {
        return item.get("glyph_id") === glyph_id;
      });

      if (found_glyph) {
        found_glyph.destroy();
      } else {
        this.resultfontview.model.glyphs.add({
          //unicode:  0x0020,
          glyph_id: glyph_id,
          glyph:    glyph
        });
      }
    },


    onCloseEmbeddedFont: function () {
      Fontomas.logger.debug("views.app.onCloseEmbeddedFont");
      this.select_toolbar.renderUseEmbedded();
    },


    addAllFonts: function () {
      Fontomas.logger.debug("views.app.addAllFonts");
      this.fonts.each(this.addOneFont);
    },


    toggleMenu: function (enabled) {
      Fontomas.logger.debug("views.app.toggleMenu");
      $('#tab')
        .find("a.fm-disable-on-demand")
          .toggleClass("disabled", !enabled);
    },


    menuOn: function () {
      this.toggleMenu(true);
    },


    menuOff: function () {
      this.toggleMenu(false);
    }
  });

}());
