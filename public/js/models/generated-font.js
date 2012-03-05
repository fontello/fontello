var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    App.Models.Glyph = Backbone.Model.extend({
        // FIXME: the model isn't sync()ed to server yet
        sync: function () {
            console.log("Models.Font.sync()");
        }
    });

    App.Collections.Glyph = Backbone.Collection.extend({
        model: App.Models.Glyph
    });

    App.Models.GeneratedFont = Backbone.Model.extend({
        defaults: {
            charset: "basic_latin",
            glyph_count: 0
        },

        initialize: function () {
            console.log("Models.GeneratedFont.initialize");
            this.glyphs = new App.Collections.Glyph;

            for (var i=0, len=cfg.basic_latin.str.length; i<len; i++) {
                var char = cfg.basic_latin.str[i];
                this.glyphs.add({
                    num: i,
                    char: this.toCharRef(char),
                    top: (char != " " ? char : "space"),
                    bottom: this.toUnicode(char)
                });
            }
            this.setCharset(this.get("charset"));
        },

        incCounter: function () {
            this.set("glyph_count", this.get("glyph_count") + 1);
        },

        decCounter: function () {
            this.set("glyph_count", this.get("glyph_count") - 1);
            console.assert(this.get("glyph_count") >= 0);
        },

        setCharset: function (charset) {
            var self = this;
            switch (charset) {
            case "basic_latin":
                _.each(this.glyphs.models, function (glyph, i) {
                    var char = cfg.basic_latin.str[i],
                        values = {
                            char: self.toCharRef(char),
                            top: (char != " " ? char : "space"),
                            bottom: self.toUnicode(char)
                        };
                    glyph.set(values);
                });
                this.set("charset", charset);
                break;

            case "unicode_private":
                _.each(this.glyphs.models, function (glyph, i) {
                    var code = (cfg.unicode_private.begin+i).toString(16)
                        .toUpperCase(),
                        values = {
                            char: "&#x" + code + ";",
                            top: "&#x" + code + ";",
                            bottom: "U+" + code
                        };
                    glyph.set(values);
                });
                this.set("charset", charset);
                break;

            default:
                console.log("Models.GeneratedFont.setCharset: bad charset");
                break;
            }
        },

        // return char in CharRef notation
        toCharRef: function (char) {
            return "&#x" + char.charCodeAt(0).toString(16) + ";";
        },

        // return char in U+ notation
        toUnicode: function (char) {
            var c = char.charCodeAt(0).toString(16).toUpperCase();
            if (c.length < 4)
                c = "0000".substr(0, 4 - c.length) + c;
            return "U+" + c;
        },

        //FIXME
        toEntityAndCss: function (char) {
            var code = char.charCodeAt(0);
            if (32 <= code && code <= 127)
                return {
                    entity: char,
                    css: "content: '"+char+"';"
                };
            else
                return {
                    entity: this.toCharRef(char),
                    css: "content: '\\"+code.toString(16)+"';"
                };  
        },

        // FIXME: the model isn't sync()ed to server yet
        sync: function () {
            console.log("Models.GeneratedFont.sync()");
        }
    });

    return fm;
})(fm || {});
