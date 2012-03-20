/*global Fontomas, _, Backbone, Handlebars*/

;(function () {
  "use strict";


  Fontomas.views.app = Backbone.View.extend({
    myfiles:        [],
    next_font_id:   1,
    fonts:          null,
    fontviews:      {},
    select_toolbar: null,
    genfontview:    null,
    events:         {},


    initialize: function () {
      Fontomas.logger.debug("views.app.initialize");

      _.bindAll(this);

      this.select_toolbar = new Fontomas.views.SelectToolbar({
        el:       $('#fm-file-drop-zone')[0],
        topview:  this
      });

      this.fonts = new Fontomas.models.FontsCollection;
      this.fonts.on("add",   this.addOneFont,  this);
      this.fonts.on("reset", this.addAllFonts, this);

      var genfont = new Fontomas.models.GeneratedFont;
      this.genfontview = new Fontomas.views.GeneratedFont({
        model:    genfont,
        topview:  this
      });
      this.genfontview.on("toggleMenu", this.toggleMenu, this);
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
      this.genfontview.render();

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

      var view = new Fontomas.views.Font({
        model: font,
        topview: this
      });

      view.on("toggleGlyph", this.toggleGlyph, this);

      this.fontviews[font.id] = view;
      $("#fm-font-list").append(view.render().el);
    },


    toggleGlyph: function (glyph_id, glyph) {
      Fontomas.logger.debug("views.app.toggleGlyph glyph=", glyph);

      var found_glyph = this.genfontview.model.glyphs.find(function (item) {
        return item.get("glyph_id") === glyph_id;
      });

      if (found_glyph) {
        found_glyph.destroy();
      } else {
        this.genfontview.model.glyphs.add({
          //unicode:  0x0020,
          glyph_id: glyph_id,
          glyph:    glyph
        });
      }
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
    }
  });

}());
