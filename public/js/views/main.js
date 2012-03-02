var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug,
        util = fm.lib.util,
        Font = fm.lib.Font;

    App.Views.Main = Backbone.View.extend({
        fontviews: {},
        genfontview: null,
        select_toolbar: null,
        rearrange_toolbar: null,

        events: {
        },

        initialize: function () {
            console.log("Views.Main.initialize");
            _.bindAll(this);

            this.model.fonts.bind('add',   this.addOneFont, this);
            this.model.fonts.bind('reset', this.addAllFonts, this);
            //this.model.fonts.fetch();

            this.select_toolbar = new App.Views.SelectToolbar({
                el: $(cfg.id.file_drop_zone)[0]
            });
            this.rearrange_toolbar = new App.Views.RearrangeToolbar({
                el: $(cfg.id.form_charset)[0]
            });

            this.genfontview = new App.Views.GeneratedFont({
                model: this.model.genfont
            });

            this.initSvgFontTemplate();
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
            console.log("Views.Main.render");
            // render the select tab
            this.select_toolbar.render();

            // auto load embedded fonts
            // debug
            if (!(debug.is_on && debug.noembedded))
            this.addEmbeddedFonts(fm_embedded_fonts);

            // first tab is fully initialized so show it
            $(cfg.id.tab + " a:first").tab("show");

            // render the rearrange tab
            this.genfontview.render();

            // render the save tab
            this.initDownloadLink();
            this.initClipboardLinks();

            return this;
        },

        addEmbeddedFonts: function (embedded_fonts) {
            this.addFontsAsStrings(embedded_fonts, function (fileinfo) {
                // onload closure
                var e_id = fileinfo.embedded_id;
                // FIXME
                App.mainview.addFont(fileinfo, function (fileinfo) {
                    // onclose closure
                    fm_embedded_fonts[e_id].is_added = fileinfo.is_added;
                    App.mainview.select_toolbar.renderUseEmbedded();
                });
                fm_embedded_fonts[e_id].is_added = fileinfo.is_added;
                fm_embedded_fonts[e_id].fontname = fileinfo.fontname;
                App.mainview.select_toolbar.renderUseEmbedded();
            });
        },

        addFontsAsStrings: function (files, cb_onload) {
            console.log("Views.Main.addFontsAsStrings flen=", files.length);
            for (var i=0, f; f=files[i]; i++) {
                var idx = App.main.myfiles.push({
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
                App.main.myfiles[idx].id = idx;

                if (cb_onload)
                    cb_onload(App.main.myfiles[idx]);

                f.is_ok = App.main.myfiles[idx].is_ok;
                f.is_added = App.main.myfiles[idx].is_added;
                f.fontname = App.main.myfiles[idx].fontname;
            }
        },

        addUploadedFonts: function (files) {
            this.addFonts(files, function (fileinfo) {
                // onload closure
                // FIXME
                App.mainview.addFont(fileinfo);
            });
        },

        addFonts: function (files, cb_onload) {
            console.log("Views.Main.addFonts");
            for (var i=0, f; f=files[i]; i++) {
                var idx = App.main.myfiles.push({
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
                App.main.myfiles[idx].id = idx;

                var reader = new FileReader();
                reader.onload = (function (fileinfo) {
                    return function (e) {
                        // FIXME: race condition?
                        // is there a file with the same content?
                        var is_exist = false;
                        for (var i=0, len=App.main.myfiles.length;
                            i<len; i++) {
                            if (!App.main.myfiles[i]
                                || !App.main.myfiles.is_ok)
                                continue;
                            if (App.main.myfiles[i].content
                                == e.target.result) {
                                fileinfo.is_dup = is_exist = true;
                                break;
                            }
                        }
                        if (!is_exist) {
                            fileinfo.content = e.target.result;
                            fileinfo.is_loaded = true;
                        }

                        if (cb_onload)
                            cb_onload(fileinfo);
                    };
                })(App.main.myfiles[idx]);
                reader.readAsBinaryString(f);
            }
        },

        addFont: function (fileinfo, cb_onclose) {
            console.log("Views.Main.addFont id=", fileinfo.id);
            // if it is a dup, skip it
            if (fileinfo.is_dup)
                return;

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
                util.notify_alert("Can't parse file '" + fileinfo.filename
                    + "': unknown file extension. Currently, we only support "
                    + util.joinList(types, ", ", " and ") + "."
                );
                return;
            }

            if (!font) {
                console.log("invalid file");
                fileinfo.is_ok = false;
                fileinfo.error_msg = "invalid file";

                util.notify_alert("Loading error: can't parse file '" 
                    + fileinfo.filename + "'");
                return;
            }

            fileinfo.is_ok = true;
            fileinfo.fontname = font.id;

            // FIXME
            var tmp = $.extend({}, fileinfo);
            tmp.font = font;
            App.mainview.createFont(tmp);

            fileinfo.is_added = true;

    /*
            // scroll to the loaded font
            var fonthash = 'a[href="#font-'+fileinfo.id+'"]';
            $("html,body").animate({scrollTop: $(fonthash).offset().top}, 500);
    */
        },

        createFont: function (attrs) {
            console.log("Views.Main.create attrs=", attrs);
            //if (!attrs.id) // FIXME
                attrs.id = this.model.next_font_id++;
            this.model.fonts.create(attrs);
        },

        addOneFont: function (font) {
            console.log("Views.Main.addOneFont");
            var view = new App.Views.Font({model: font});
            this.fontviews[font.id] = view;
            $("#fm-font-list").append(view.render().el);
        },

        addAllFonts: function () {
            console.log("Views.Main.addAllFonts");
            this.model.fonts.each(this.addOneFont);
        },

        toggleMenu: function (enabled) {
            console.log("Views.Main.toggleMenu");
            $(cfg.id.tab).find("a"+cfg.class.disable_on_demand)
                .toggleClass("disabled", !enabled);
        },

        initDownloadLink: function () {
            console.log("Views.Main.initDownloadLink");
            $(cfg.id.tab_save).one("shown", function () {
                console.log("Views.Main.initDownloadLink: shown fired");
                // flash download helper doesn't work if file: proto used
                if (!env.is_file_proto && env.flash_version.major > 0) {
                    $(cfg.id.download_font_button).downloadify({
                        swf: "img/downloadify.swf",
                        downloadImage: "img/transparent-129x140.png",
                        width: $(cfg.id.download_font_button).outerWidth(),
                        height: $(cfg.id.download_font_button).outerHeight(),
                        filename: cfg.output.filename,
                        data: function () {
                            return $(cfg.id.font).val();
                        },
                        dataType: "string",
                        transparent: true,
                        append: true,
                        onComplete: function () {
                            console.log("downloadify onComplete");
                        },
                        onCancel: function () {
                            console.log("downloadify onCancel");
                        },
                        onError: function () {
                            console.log("downloadify onError");
                        }
                    });
                } else {
                    $(cfg.id.download_font_button).click(function (event) {
                        console.log("noflash download button clicked");

                        // image/svg+xml
                        // binary/octet-stream
                        // application/x-zip-compressed

                        $(cfg.id.download_font_button).attr({
                            download: cfg.output.filename,
                            href: "data:binary/octet-stream;base64,"
                                + util.base64_encode($(cfg.id.font).val())
                        });

                    });
                }
            });
        },

        initClipboardLinks: function () {
            console.log("Views.Main.initClipboardLinks");
            $(cfg.id.tab_save).one("shown", function () {
                console.log("Views.Main.initClipboardLinks: shown fired");
                // flash clipboard helper doesn't work if file: proto used
                if (!env.is_file_proto && env.flash_version.major > 0) {
                    ZeroClipboard.setMoviePath(cfg.zero_clipboard.swf_path);

                    for (var i=0, len=cfg.zero_clipboard.links.length;
                        i<len; i++) {
                        var item = cfg.zero_clipboard.links[i];
                        item.client = new ZeroClipboard.Client();
                        item.client.fm_index = i;
                        item.client.glue(item.link, item.span);

                        item.client.addEventListener("mouseDown",
                            function (client) { 
                            console.log("zcb: mousedown");
                            var item = cfg.zero_clipboard
                                .links[client.fm_index];
                            client.setText($(item.target).val());
                        });
                        item.client.addEventListener("complete",
                            function (client, text) {
                                console.log("zcb: complete");
                                util.notify_info("Copied to clipboard", true);
                            }
                        );
                        item.client.addEventListener("mouseOver",
                            function (client) {
                                console.log("zcb: mouseover");
                                $("#" + item.link).trigger("mouseover");
                            }
                        );
                        item.client.addEventListener("mouseOut",
                            function (client) { 
                                console.log("zcb: mouseout");
                                $("#" + item.link).trigger("mouseout");
                            }
                        );

                        $("#" + item.link).click(function () {
                            console.log("noflash clipboard link clicked");
                        });
                    }
    /*
                } else {
                    // TODO: IE clipboard code
    */
                } else {
                    // no clipboard support
                    for (var i=0, len=cfg.zero_clipboard.links.length;
                        i<len; i++) {
                        var item = cfg.zero_clipboard.links[i];
                        $("#" + item.span).remove();
                    }
                }
            });
        }
    });

    return fm;
})(fm || {});
