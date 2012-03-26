/*global fontomas, _, Backbone, Handlebars*/

;(function () {
  "use strict";


  var config = fontomas.config;


  fontomas.views.app = Backbone.View.extend({
    myfiles:        [],
    next_font_id:   1,
    fonts:          null,
    glyph_size:     config.preview_glyph_sizes[0],

    font_toolbar:   null,
    fontviews:      {},
    resultfontview: null,

    events:         {},


    initialize: function () {
      fontomas.logger.debug("views.app.initialize");

      _.bindAll(this);

      this.font_toolbar = new fontomas.views.font_toolbar({
        el: $("#fm-file-drop-zone")[0]
      });
      this.font_toolbar.on("changeGlyphSize", this.onChangeGlyphSize, this);
      this.font_toolbar.on("fileDrop",        this.onFileDrop,        this);
      this.font_toolbar.on("fileUpload",      this.onFileUpload,      this);
      this.font_toolbar.on("useEmbeddedFont", this.onUseEmbeddedFont, this);

      this.fonts = new Backbone.Collection;
      this.fonts.on("add",   this.onAddFont,      this);
      this.fonts.on("reset", this.onAddAllFonts,  this);

      this.resultfontview = new fontomas.views.result_font({
        el:         $("#fm-result-font")[0],
        model:      new fontomas.models.result_font,
        glyph_size: this.glyph_size
      });
      this.resultfontview.on("someGlyphsSelected", this.menuOn,  this);
      this.resultfontview.on("noGlyphsSelected",   this.menuOff, this);

      this.on("fileLoaded", this.onLoadFont, this);

      // FIXME
      $("#fm-download-font-button").click(this.download);
    },


    download: function (event) {
      fontomas.logger.debug("views.app.download");

      fontomas.util.notify_alert("Not yet implemented. Stay tuned.", true);
      event.preventDefault();
    },


    onChangeGlyphSize: function (size) {
      fontomas.logger.debug("views.app.onChangeGlyphSize");

      this.glyph_size = size;

      _.each(this.fontviews, function (view) {
        view.changeGlyphSize(size);
      });

      this.resultfontview.changeGlyphSize(size);
    },


    onFileDrop: function (files) {
      fontomas.logger.debug("views.app.onFileDrop");
      this.doUploadFonts(files);
    },


    onFileUpload: function (files) {
      fontomas.logger.debug("views.app.onFileUpload");
      this.doUploadFonts(files);
    },


    onUseEmbeddedFont: function (font) {
      fontomas.logger.debug("views.app.onUseEmbeddedFont");
      this.addEmbeddedFonts([font]);
    },


    // a model has been added, so we create a corresponding view for it
    onAddFont: function (font) {
      fontomas.logger.debug("views.app.onAddFont");

      var view = new fontomas.views.source_font({
        model:      font,
        glyph_size: this.glyph_size
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
      fontomas.logger.debug("views.app.onAddAllFonts");
      this.fonts.each(this.onAddFont);
    },


    onRemoveFont: function (id) {
      fontomas.logger.debug("views.app.onRemoveFont id=", id);
      delete this.fontviews[id];
    },


    toggleMenu: function (enabled) {
      fontomas.logger.debug("views.app.toggleMenu");
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
      fontomas.logger.debug("views.app.doUploadFonts");

      var self = this;

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
      fontomas.logger.debug("views.app.onLoadFont");

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

      file_ext  = fontomas.util.getFileExt(fileinfo.filename);
      font      = fontomas.models.source_font.parse(file_ext, fileinfo.content);

      // FIXME: failed refactoring?
      if (!font) {
        // unknown file exstension
        fontomas.util.notify_alert(
          "Can't parse file '" + fileinfo.filename +
          "': unknown file extension. Currently, we support only: " +
          fontomas.models.source_font.supported_types.join(", ") + "."
        );
        return;
      }

      // FIXME: failed refactoring?
      if (!font) {
        fontomas.logger.error("invalid file");

        fileinfo.is_ok     = false;
        fileinfo.error_msg = "invalid file";

        fontomas.util.notify_alert(
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
      fontomas.logger.debug("views.app.addEmbeddedFonts");

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

      this.font_toolbar.renderUseEmbedded();
    },


    onToggleGlyph: function (data) {
      fontomas.logger.debug("views.app.onToggleGlyph data=", data);

      var glyph, found_glyph;

      found_glyph = this.resultfontview.model.glyphs.find(function (item) {
        var glyph = item.get("source_glyph");

        return  glyph.font_id === data.font_id &&
                glyph.glyph_id === data.glyph_id;
      });

      if (found_glyph) {
        found_glyph.destroy();
      } else {
        glyph = new fontomas.models.glyph({source_glyph: data});
        this.resultfontview.model.glyphs.add(glyph);
      }
    },


    onCloseEmbeddedFont: function () {
      fontomas.logger.debug("views.app.onCloseEmbeddedFont");
      this.font_toolbar.renderUseEmbedded();
    },


    onCloseFont: function (font_id) {
      fontomas.logger.debug("views.app.onCloseFont");

      this.resultfontview.removeGlyphsByFont(font_id);

      var found_font = _.find(this.myfiles, function (f) {
        return f.font_id === font_id;
      }, this);

      if (found_font) {
        found_font.font_id = null;
        found_font.is_added = false;
      }
    },


    createFont: function (attrs) {
      fontomas.logger.debug("views.app.createFont attrs=", attrs);

      //if (!attrs.id) // FIXME
      attrs.id = this.next_font_id++;
      var font = new fontomas.models.source_font(attrs);

      this.fonts.create(font);
      return attrs.id;
    },


    render: function () {
      fontomas.logger.debug("views.app.render");

      // auto load embedded fonts
      // debug
      if (!(fontomas.debug.is_on && fontomas.debug.noembedded)) {
        this.addEmbeddedFonts(fontomas.embedded_fonts);
      }

      // first tab is fully initialized so show it
      $("#tab a:first").tab("show");

      return this;
    }
  });

}());
