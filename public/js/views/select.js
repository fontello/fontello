var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    App.Views.SelectToolbar = Backbone.View.extend({
        tagName: "form",
        id: "fm-file-drop-zone",

        //template: _.template($('#fm-select-toolbar-template').html()),

        events: {
            "click .fm-icon-size-button": "changeIconSize",
            "click #fm-file-browse-button": "fileBrowse",
            "change #fm-file": "fileUpload",
            "dragover #fm-file-drop-zone": "fileDragOver", // doesn't work
            "drop #fm-file-drop-zone": "fileDrop",         // doesn't work
            "click .fm-font-name": "useEmbedded"
        },

        initialize: function () {
            console.log("Views.SelectToolbar.initialize");
            _.bindAll(this);
        },

        render: function () {
            console.log("Views.SelectToolbar.render");
            var self = this;
            //$(this.el).html("test");

            // init preview icon size selection
            for (var i=0, len=cfg.preview_icon_sizes.length; i<len; i++) {
                var tpl = $(cfg.template.icon_size_button.tpl).clone();
                tpl.toggleClass("active", i == 0);
                tpl.val(cfg.preview_icon_sizes[i]);
                tpl.text(cfg.preview_icon_sizes[i] + "px");
                $(cfg.id.icon_size).append(tpl);
            }

            // FIXME: workaround, because dragover/drag events don't work
            if (env.filereader) {
                // init file drag and drop
                $(cfg.id.file_drop_zone).on("dragover", function (event) {
                    self.fileDragOver(event);
                });
                $(cfg.id.file_drop_zone).on("drop", function (event) {
                    self.fileDrop(event);
                });
            }

            for (var i=0, len=fm_embedded_fonts.length; i<len; i++) {
                var tpl = $(cfg.template.embedded.tpl).clone();
                var is_added = fm_embedded_fonts[i].is_added;
                var item = tpl.find(".fm-font-name");
                item.toggleClass("disabled", is_added)
                    .data("embedded_id", i).
                    text(fm_embedded_fonts[i].fontname);
                $(cfg.id.use_embedded).append(tpl);
            }

            return this;
        },

        updateUseEmbedded: function () {
            console.log("Views.SelectToolbar.updateUseEmbedded");
            $("#fm-file-drop-zone").find(".fm-font-name").each(function () {
                var e_id = $(this).data("embedded_id"),
                    is_added = fm_embedded_fonts[e_id].is_added;
                $(this).toggleClass("disabled", is_added)
                    .text(fm_embedded_fonts[e_id].fontname);
            });
        },

        fileBrowse: function (event) {
            event.preventDefault();
            if (env.filereader) {
                $(cfg.id.file).click();
            } else {
                util.notify_alert("File upload is not supported by your"
                    + " browser, use embedded fonts instead");
            }
        },

        fileUpload: function (event) {
            App.mainview.addUploadedFonts(event.target.files);
        },

        fileDragOver: function (event) {
            //console.log("fileDragOver");
            if (env.filereader) {
                event.stopPropagation();
                event.preventDefault();
                event.originalEvent.dataTransfer.dropEffect = 'copy';
            }
        },

        fileDrop: function (event) {
            console.log("fileDrop");
            if (env.filereader) {
                event.stopPropagation();
                event.preventDefault();
                App.mainview.addUploadedFonts(
                    event.originalEvent.dataTransfer.files
                );
            }
        },

        useEmbedded: function (event) {
            console.log("click Use Embedded");
            var e_id = $(event.target).data("embedded_id");
            if (!fm_embedded_fonts[e_id].is_added) {
                console.assert(fm_embedded_fonts[e_id]);
                if (fm_embedded_fonts[e_id])
                    App.mainview.addEmbeddedFonts([fm_embedded_fonts[e_id]]);
            }
        },

        changeIconSize: function (event) {
            console.log("Views.SelectToolbar.changeIconSize event=", event);
            event.preventDefault();
            var size = parseInt($(event.target).val()) || 32;
            console.log('size='+size);
            $(cfg.class.glyph_group).removeClass(cfg.icon_size_classes)
                .addClass(cfg.icon_size_prefix+size);
            $(cfg.id.font_list).find(".gd").each(function (i) {
                var size_x = $(this).data("glyph_sizes")[size][0],
                    size_y = $(this).data("glyph_sizes")[size][1];

                $(this).css({
                        width: size_x + "px",
                        height: size_y + "px",
                        "margin-left": "-" + Math.round(size_x/2) + "px",
                        "margin-top": "-" + Math.round(size_y/2) + "px"
                    })
                    .find("svg").css({
                        width: size_x + "px", 
                        height: size_y + "px"
                    });
            });

            $(cfg.id.generated_font).removeClass(cfg.icon_size_classes)
                .addClass(cfg.icon_size_prefix+size);
            $(cfg.id.generated_font).find(".rg-icon").each(function (i) {
                var glyph_id = $(this).parent().siblings(".fm-glyph-id")
                    .val();

                var size_x = size,
                    size_y = size;

                if (glyph_id != "") {
                    size_x = $(this).data("glyph_sizes")[size][0],
                    size_y = $(this).data("glyph_sizes")[size][1];
                }

                $(this).css({
                        width: size_x + "px",
                        height: size_y + "px",
                        "margin-left": "-" + Math.round(size_x/2) + "px",
                        "margin-top": "-" + Math.round(size_y/2) + "px"
                    })
                    .css({width: "100%", left: "0px", "margin-left": "0px"})
                    .find("svg").css({
                        width: size_x + "px",
                        height: size_y + "px"
                    });
            });
        }
    });

    return fm;
})(fm || {});
