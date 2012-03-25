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
      view.on("closeFont",          this.onCloseFont,         this);
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
          id:             this.myfiles.length,
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
          font_id:        null,
          embedded_id:    null
        };

        this.myfiles.push(fileinfo);

        reader.onload = function (event) {
          // FIXME self?
          self.trigger("fileLoaded", event, fileinfo);
        };

        reader.readAsBinaryString(f);
      }, this);
    },


    onLoadFont: function (event, fileinfo) {
      Fontomas.logger.debug("views.app.onLoadFont");

      var font, file_ext, is_exist = false;

      // is there a file with the same content?
      _.each(this.myfiles, function (f) {
        if (f.is_added && f.content === event.target.result) {
          is_exist = fileinfo.is_dup = true;
        }
      });

      // if it is a dup, skip it
      if (fileinfo.is_dup) {
        return;
      }

      fileinfo.content    = event.target.result;
      fileinfo.is_loaded  = true;

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

      font = _.extend(font, {
        fontname:     fileinfo.fontname,
        is_embedded:  false
      });
      fileinfo.font_id = this.createFont(font);

      // scroll to the loaded font
      //var fonthash = 'a[href="#font-'+fileinfo.id+'"]';
      //$("html,body").animate({scrollTop: $(fonthash).offset().top}, 500);
    },


    addEmbeddedFonts: function (embedded_fonts) {
      Fontomas.logger.debug("views.app.addEmbeddedFonts");

      _.each(embedded_fonts, function (f) {
        var font = {
          fontname:     f.fontname,
          glyphs:       _.map(f.glyphs, function (i) { return {unicode: i}; }),
          is_embedded:  true,
          embedded_id:  f.id
        };
        this.createFont(font);

        f.is_added = true;
      }, this);

      this.select_toolbar.renderUseEmbedded();
    },


    onToggleGlyph: function (data) {
      Fontomas.logger.debug("views.app.onToggleGlyph data=", data);

      var glyph, found_glyph;

      found_glyph = this.resultfontview.model.glyphs.find(function (item) {
        var glyph = item.get("source_glyph");

        return  glyph.font_id === data.font_id &&
                glyph.glyph_id === data.glyph_id;
      });

      if (found_glyph) {
        found_glyph.destroy();
      } else {
        glyph = {source_glyph: data};
        this.resultfontview.model.glyphs.add(glyph);
      }
    },


    onCloseEmbeddedFont: function () {
      Fontomas.logger.debug("views.app.onCloseEmbeddedFont");
      this.select_toolbar.renderUseEmbedded();
    },


    onCloseFont: function (font_id) {
      Fontomas.logger.debug("views.app.onCloseFont");
      this.resultfontview.removeGlyphsByFont(font_id);

      var found_font = _.find(this.myfiles, function (f) {
        return f.font_id === font_id;
      }, this);

      if (found_font !== undefined) {
        found_font.font_id = null;
        found_font.is_added = false;
      }
    },


    createFont: function (attrs) {
      Fontomas.logger.debug("views.app.createFont attrs=", attrs);

      //if (!attrs.id) // FIXME
      attrs.id = this.next_font_id++;
      this.fonts.create(attrs);
      return attrs.id;
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
