var Fontomas = (function (Fontomas) {
    var App = Fontomas.App,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

    App.Models.Main = Backbone.Model.extend({
        fonts: new App.Collections.Font,
        genfont: new App.Models.GeneratedFont,
        next_font_id: 1,
        xml_template: null,
        myfiles: []
    });

    return Fontomas;
})(Fontomas || {});
