var Fontomas = (function (Fontomas) {
    "use strict";

    var app = Fontomas.app,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

    app.models.Glyph = Backbone.Model.extend({
        // FIXME: the model isn't sync()ed to server yet
        sync: function () {
            console.log("app.models.Font.sync()");
        }
    });

    return Fontomas;
}(Fontomas || {}));
