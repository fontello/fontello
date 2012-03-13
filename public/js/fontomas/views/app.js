var Fontomas = (function (_, Backbone, Handlebars, Fontomas) {
  "use strict";

  var config = Fontomas.cfg;

  Fontomas.views.app = Backbone.View.extend({
    fontviews:      {},
    genfontview:    null,
    select_toolbar: null,
    events:         {},

    initialize: function () {
      console.log("views.app.initialize");

      _.bindAll(this);

      this.initSvgFontTemplate();

      this.model.fonts.bind('add',   this.addOneFont, this);
      this.model.fonts.bind('reset', this.addAllFonts, this);
      //this.model.fonts.fetch();

      this.select_toolbar = new Fontomas.views.SelectToolbar({
        el:       $('#fm-file-drop-zone')[0],
        topview:  this
      });

      this.genfontview = new Fontomas.views.GeneratedFont({
        model:    this.model.genfont,
        topview:  this
      });
    },

    initSvgFontTemplate: function () {
      var xml_string;

      try {
        xml_string = $('#fm-font-output').html().trimLeft();
        this.model.xml_template = $.parseXML(xml_string);
      } catch (e) {
        console.log(
          "initSvgFontTemplate: invalid xml template=",
          $('#fm-font-output').html(),
          "e=", e
        );
        Fontomas.util.notify_alert("Internal error: can't parse output template.");
        return;
      }

      $(this.model.xml_template)
        .find("metadata").text(config.output.metadata)
        .end()
        .find("font").attr({
          "id":           config.output.font_id,
          "horiz-adv-x":  config.output.horiz_adv_x
        })
        .end()
        .find("font-face").attr({
          "units-per-em": config.output.units_per_em,
          "ascent":       config.output.ascent,
          "descent":      config.output.descent
        })
        .end()
        .find("missing-glyph").attr({
          "horiz-adv-x":  config.output.missing_glyph_horiz_adv_x
        });
    },

    render: function () {
      console.log("views.app.render");

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

      // render the save tab
      this.initDownloadLink();

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
      console.log("views.app.addFontsAsStrings flen=", files.length);

      _.each(files, function (f) {
        var idx, fileinfo;

        fileinfo = {
          id:             Fontomas.main.myfiles.length,
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

        Fontomas.main.myfiles.push(fileinfo);

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
      console.log("views.app.addFonts");

      _.each(files, function (f) {
        var fileinfo, reader = new FileReader();

        fileinfo = {
          id:             Fontomas.main.myfiles.length,
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

        Fontomas.main.myfiles.push(fileinfo);

        reader.onload = function (event) {
          // FIXME: race condition?
          // is there a file with the same content?
          var is_exist = false;

          _.each(Fontomas.main.myfiles, function (f) {
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
      console.log("views.app.addFont id=", fileinfo.id);

      var tmp, font, file_ext;

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
        console.log("invalid file");

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
      console.log("views.app.create attrs=", attrs);

      //if (!attrs.id) // FIXME
      attrs.id = this.model.next_font_id++;
      this.model.fonts.create(attrs);
    },

    addOneFont: function (font) {
      console.log("views.app.addOneFont");

      var view = new Fontomas.views.Font({
        model: font,
        topview: this
      });

      this.fontviews[font.id] = view;
      $("#fm-font-list").append(view.render().el);
    },

    addAllFonts: function () {
      console.log("views.app.addAllFonts");
      this.model.fonts.each(this.addOneFont);
    },

    toggleMenu: function (enabled) {
      console.log("views.app.toggleMenu");
      $('#tab')
        .find("a.fm-disable-on-demand")
          .toggleClass("disabled", !enabled);
    },

    initDownloadLink: function () {
      console.log("views.app.initDownloadLink");

      $('#fm-tab-save').one("shown", function () {
        console.log("views.app.initDownloadLink: shown fired");

        $('#fm-download-font-button').click(function (event) {
          console.log("download button clicked");

          // image/svg+xml
          // binary/octet-stream
          // application/x-zip-compressed

          $('#fm-download-font-button').attr({
            download: config.output.filename,
            href:     "data:binary/octet-stream;base64," +
                      Fontomas.util.base64_encode($('#fm-font').val())
          });

        });
      });
    }
  });

  return Fontomas;
}(window._, window.Backbone, window.Handlebars, Fontomas || {}));
