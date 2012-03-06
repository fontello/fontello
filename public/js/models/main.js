var Fontomas = (function (Fontomas) {
    "use strict";

    var app = Fontomas.app,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug,
        Backbone = window.Backbone;

    app.models.Main = Backbone.Model.extend({
        fonts: new app.collections.Font,
        genfont: new app.models.GeneratedFont,
        next_font_id: 1,
        xml_template: null,
        myfiles: []
    });

    return Fontomas;
}(Fontomas || {}));
