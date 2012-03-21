/*global Fontomas, _, Backbone, Handlebars*/

;(function () {
  "use strict";


  var config = Fontomas.config;


  Fontomas.views.app = Backbone.View.extend({
    myfiles:        [],
    next_font_id:   1,
    fonts:          null,
    iconsize:       config.preview_icon_sizes[0],

    select_toolbar: null,
    fontviews:      {},
    resultfontview: null,

    events:         {},


    initialize: function () {
      Fontomas.logger.debug("views.app.initialize");

      _.bindAll(this);

      this.select_toolbar = new Fontomas.views.SelectToolbar({
        el: $("#fm-file-drop-zone")[0]
      });
      this.select_toolbar.on("changeIconSize",  this.onChangeIconSize,  this);
      this.select_toolbar.on("fileDrop",        this.onFileDrop,        this);
      this.select_toolbar.on("fileUpload",      this.onFileUpload,      this);
      this.select_toolbar.on("useEmbeddedFont", this.onUseEmbeddedFont, this);

      this.fonts = new Fontomas.models.FontsCollection;
      this.fonts.on("add",   this.onAddFont,      this);
      this.fonts.on("reset", this.onAddAllFonts,  this);

      this.resultfontview = new Fontomas.views.ResultFont({
        el:       $("#fm-result-font")[0],
        model:    new Fontomas.models.ResultFont,
        iconsize: this.iconsize
      });
      this.resultfontview.on("someGlyphsSelected", this.menuOn,  this);
      this.resultfontview.on("noGlyphsSelected",   this.menuOff, this);

      this.on("fileLoaded", this.onLoadFont, this);
    },


    onChangeIconSize: function (size) {
      Fontomas.logger.debug("views.app.onChangeIconSize");

      this.iconsize = size;

      _.each(this.fontviews, function (view) {
        view.changeIconSize(size);
      });

      this.resultfontview.changeIconSize(size);
    },


    onFileDrop: function (files) {
      Fontomas.logger.debug("views.app.onFileDrop");
      this.doUploadFonts(files);
    },


    onFileUpload: function (files) {
      Fontomas.logger.debug("views.app.onFileUpload");
      this.doUploadFonts(files);
    },


    onUseEmbeddedFont: function (font) {
      Fontomas.logger.debug("views.app.onUseEmbeddedFont");
      this.addEmbeddedFonts([font]);
    },


    // a model has been added, so we create a corresponding view for it
    onAddFont: function (font) {
      Fontomas.logger.debug("views.app.onAddFont");

      var view = new Fontomas.views.Font({
        model:    font,
        iconsize: this.iconsize
      });
      view.on("toggleGlyph",        this.onToggleGlyph,       this);
      view.on("closeEmbeddedFont",  this.onCloseEmbeddedFont, this);
      view.on("remove",             this.onRemoveFont,        this);

      this.fontviews[font.id] = view;
      $("#fm-font-list").append(view.render().el);
    },


    // models have been added, so we create views for all of them
    onAddAllFonts: function () {
      Fontomas.logger.debug("views.app.onAddAllFonts");
      this.fonts.each(this.onAddFont);
    },


    onRemoveFont: function (id) {
      Fontomas.logger.debug("views.app.onRemoveFont id=", id);
      delete this.fontviews[id];
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
    },

    
    doUploadFonts: function (files) {
      var self = this;

      Fontomas.logger.debug("views.app.doUploadFonts");

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
          self.trigger("fileLoaded", event, fileinfo);
        };

        reader.readAsBinaryString(f);
      });
    },


    onLoadFont: function (event, fileinfo) {
      Fontomas.logger.debug("views.app.onLoadFont");

      // is there a file with the same content?
      var is_exist = false;

      _.each(this.myfiles, function (f) {
        if (event.target.result === f.content) {
          is_exist = fileinfo.is_dup = true;
        }
      });

      if (!is_exist) {
        fileinfo.content    = event.target.result;
        fileinfo.is_loaded  = true;
      }

      this.addFont(fileinfo);
    },


    addEmbeddedFonts: function (embedded_fonts) {
      var self = this;

      Fontomas.logger.debug("views.app.addEmbeddedFonts");

      _.each(embedded_fonts, function (f) {
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

        self.addFont(fileinfo);

        f.is_ok     = fileinfo.is_ok;
        f.is_added  = fileinfo.is_added;
        f.fontname  = fileinfo.fontname;

        self.select_toolbar.renderUseEmbedded();
      });
    },


    onToggleGlyph: function (glyph_id, glyph) {
      Fontomas.logger.debug("views.app.onToggleGlyph glyph=", glyph);

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


    addFont: function (fileinfo) {
      /*jshint newcap:false*/
      Fontomas.logger.debug("views.app.addFont id=", fileinfo.id);

      var font, file_ext;

      // if it is a dup, skip it
      if (fileinfo.is_dup) {
        return;
      }

      file_ext  = Fontomas.util.getFileExt(fileinfo.filename);
      font      = Fontomas.models.Font.parse(file_ext, fileinfo.content);

      // FIXME: failed refactoring?
      if (!font) {
        // unknown file exstension
        Fontomas.util.notify_alert(
          "Can't parse file '" + fileinfo.filename +
          "': unknown file extension. Currently, we support only: " +
          Fontomas.models.Font.supported_types.join(", ") + "."
        );
        return;
      }

      // FIXME: failed refactoring?
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
      Fontomas.logger.debug("views.app.createFont attrs=", attrs);

      //if (!attrs.id) // FIXME
      attrs.id = this.next_font_id++;
      this.fonts.create(attrs);
    },


    render: function () {
      Fontomas.logger.debug("views.app.render");

      // auto load embedded fonts
      // debug
      if (!(Fontomas.debug.is_on && Fontomas.debug.noembedded)) {
        this.addEmbeddedFonts(Fontomas.embedded_fonts);
      }

      // first tab is fully initialized so show it
      $("#tab a:first").tab("show");

      return this;
    }
  });

}());
