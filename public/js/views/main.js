var Fontomas = (function (Fontomas) {
    "use strict";

    var app = Fontomas.app,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug,
        util = Fontomas.lib.util,
        Font = Fontomas.lib.Font,
        Backbone = window.Backbone,
        _ = window._,
        Handlebars = window.Handlebars;

    app.views.Main = Backbone.View.extend({
        templates: {},
        fontviews: {},
        genfontview: null,
        select_toolbar: null,
        rearrange_toolbar: null,

        events: {
        },

        initialize: function () {
            console.log("app.views.Main.initialize");
            _.bindAll(this);

            this.initTemplates();
            this.initSvgFontTemplate();

            this.model.fonts.bind('add',   this.addOneFont, this);
            this.model.fonts.bind('reset', this.addAllFonts, this);
            //this.model.fonts.fetch();

            this.select_toolbar = new app.views.SelectToolbar({
                el: $(cfg.id.file_drop_zone)[0],
                topview: this
            });
            this.rearrange_toolbar = new app.views.RearrangeToolbar({
                el: $(cfg.id.form_charset)[0],
                topview: this
            });
            this.genfontview = new app.views.GeneratedFont({
                model: this.model.genfont,
                topview: this
            });
        },

        // compile templates defined in cfg.templates and place them into
        // this.templates for later use
        initTemplates: function () {
            console.log("app.views.Main.initTemplates");
            var self = this;
            _.each(cfg.templates, function (el_id, tpl_name) {
                self.templates[tpl_name] = Handlebars.compile($(el_id).html());
                $(el_id).remove();
            });
        },

        // subviews call this to get their templates
        getTemplates: function (tpl_names) {
            var result = {};
            _.each(this.templates, function (item, key) {
                 if (_.include(tpl_names, key)) {
                    result[key] = item;
                 }
            });
            return result;
        },

        initSvgFontTemplate: function () {
            var xml_string = util.trimLeadingWS($(cfg.id.font_output).html());
            try {
                this.model.xml_template = $.parseXML(xml_string);
            } catch (e) {
                console.log("initSvgFontTemplate: invalid xml template=",
                    $(cfg.id.font_output).html(), "e=", e);
                util.notify_alert("Internal error: can't parse output template.");
            }
            if (this.model.xml_template) {
                $("metadata", this.model.xml_template)
                    .text(cfg.output.metadata);
                $("font", this.model.xml_template).attr({
                    id: cfg.output.font_id,
                    "horiz-adv-x": cfg.output.horiz_adv_x
                });
                $("font-face", this.model.xml_template).attr({
                    "units-per-em": cfg.output.units_per_em,
                    ascent: cfg.output.ascent,
                    descent: cfg.output.descent
                });
                $("missing-glyph", this.model.xml_template).attr({
                    "horiz-adv-x": cfg.output.missing_glyph_horiz_adv_x
                });
            }
        },

        render: function () {
            console.log("app.views.Main.render");
            // render the select tab
            this.select_toolbar.render();

            // auto load embedded fonts
            // debug
            if (!(debug.is_on && debug.noembedded)) {
                this.addEmbeddedFonts(fm_embedded_fonts);
            }

            // first tab is fully initialized so show it
            $(cfg.id.tab + " a:first").tab("show");

            // render the rearrange tab
            this.genfontview.render();

            // render the save tab
            this.initDownloadLink();

            return this;
        },

        addEmbeddedFonts: function (embedded_fonts) {
            this.addFontsAsStrings(embedded_fonts, function (fileinfo) {
                // onload closure
                var e_id = fileinfo.embedded_id;
                // FIXME
                app.mainview.addFont(fileinfo, function (fileinfo) {
                    // onclose closure
                    fm_embedded_fonts[e_id].is_added = fileinfo.is_added;
                    app.mainview.select_toolbar.renderUseEmbedded();
                });
                fm_embedded_fonts[e_id].is_added = fileinfo.is_added;
                fm_embedded_fonts[e_id].fontname = fileinfo.fontname;
                app.mainview.select_toolbar.renderUseEmbedded();
            });
        },

        addFontsAsStrings: function (files, cb_onload) {
            console.log("app.views.Main.addFontsAsStrings flen=", files.length);
            for (var i=0, f; (f=files[i]); i+=1) {
                var idx = app.main.myfiles.push({
                    id:             null,
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
                }) - 1;
                app.main.myfiles[idx].id = idx;

                if (cb_onload) {
                    cb_onload(app.main.myfiles[idx]);
                }

                f.is_ok = app.main.myfiles[idx].is_ok;
                f.is_added = app.main.myfiles[idx].is_added;
                f.fontname = app.main.myfiles[idx].fontname;
            }
        },

        addUploadedFonts: function (files) {
            this.addFonts(files, function (fileinfo) {
                // onload closure
                // FIXME
                app.mainview.addFont(fileinfo);
            });
        },

        addFonts: function (files, cb_onload) {
            console.log("app.views.Main.addFonts");
            for (var i=0, f; (f=files[i]); i+=1) {
                var idx = app.main.myfiles.push({
                    id:             null,
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
                }) - 1;
                app.main.myfiles[idx].id = idx;

                var reader = new FileReader();
                reader.onload = (function (fileinfo) {
                    return function (e) {
                        // FIXME: race condition?
                        // is there a file with the same content?
                        var is_exist = false;
                        for (var i=0, len=app.main.myfiles.length;
                            i<len; i+=1) {
                            if (!app.main.myfiles[i] ||
                                !app.main.myfiles.is_ok) {
                                continue;
                            }
                            if (app.main.myfiles[i].content ===
                                e.target.result) {
                                fileinfo.is_dup = is_exist = true;
                                break;
                            }
                        }
                        if (!is_exist) {
                            fileinfo.content = e.target.result;
                            fileinfo.is_loaded = true;
                        }

                        if (cb_onload) {
                            cb_onload(fileinfo);
                        }
                    };
                })(app.main.myfiles[idx]);
                reader.readAsBinaryString(f);
            }
        },

        /*jshint newcap:false*/
        addFont: function (fileinfo, cb_onclose) {
            console.log("app.views.Main.addFont id=", fileinfo.id);
            // if it is a dup, skip it
            if (fileinfo.is_dup) {
                return;
            }

            var font = null, types = ["svg"/*, "ttf", "otf"*/, "js"];

            var file_ext = util.getFileExt(fileinfo.filename);
            switch (file_ext) {
            case "svg":
                font = Font("svg", fileinfo.content);
                break;
            case "js":
                font = Font("cufonjs", fileinfo.content);
                break;
            default:
                // unknown file exstension
                util.notify_alert("Can't parse file '" + fileinfo.filename +
                    "': unknown file extension. Currently, we only support " +
                    util.joinList(types, ", ", " and ") + "."
                );
                return;
            }

            if (!font) {
                console.log("invalid file");
                fileinfo.is_ok = false;
                fileinfo.error_msg = "invalid file";

                util.notify_alert("Loading error: can't parse file '" + 
                    fileinfo.filename + "'");
                return;
            }

            fileinfo.is_ok = true;
            fileinfo.fontname = font.id;

            // FIXME
            var tmp = $.extend({}, fileinfo);
            tmp.font = font;
            app.mainview.createFont(tmp);

            fileinfo.is_added = true;

    /*
            // scroll to the loaded font
            var fonthash = 'a[href="#font-'+fileinfo.id+'"]';
            $("html,body").animate({scrollTop: $(fonthash).offset().top}, 500);
    */
        },
        /*jshint newcap:true*/

        createFont: function (attrs) {
            console.log("app.views.Main.create attrs=", attrs);
            //if (!attrs.id) // FIXME
                attrs.id = this.model.next_font_id += 1;
            this.model.fonts.create(attrs);
        },

        addOneFont: function (font) {
            console.log("app.views.Main.addOneFont");
            var view = new app.views.Font({
                model: font,
                topview: this
            });
            this.fontviews[font.id] = view;
            $("#fm-font-list").append(view.render().el);
        },

        addAllFonts: function () {
            console.log("app.views.Main.addAllFonts");
            this.model.fonts.each(this.addOneFont);
        },

        toggleMenu: function (enabled) {
            console.log("app.views.Main.toggleMenu");
            $(cfg.id.tab).find("a"+cfg.css_class.disable_on_demand)
                .toggleClass("disabled", !enabled);
        },

        initDownloadLink: function () {
            console.log("app.views.Main.initDownloadLink");
            $(cfg.id.tab_save).one("shown", function () {
                console.log("app.views.Main.initDownloadLink: shown fired");
                $(cfg.id.download_font_button).click(function (event) {
                    console.log("download button clicked");

                    // image/svg+xml
                    // binary/octet-stream
                    // application/x-zip-compressed

                    $(cfg.id.download_font_button).attr({
                        download: cfg.output.filename,
                        href: "data:binary/octet-stream;base64," +
                            util.base64_encode($(cfg.id.font).val())
                    });

                });
            });
        }
    });

    return Fontomas;
}(Fontomas || {}));
