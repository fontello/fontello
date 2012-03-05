var Fontomas = (function (Fontomas) {
    var app = Fontomas.app,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

    app.models.Font = Backbone.Model.extend({
        defaults: function () {
            return {
                fontname:   "unknown",
                is_loaded:  false,
                is_ok:      false,
                is_added:   false
            };
        },

        // FIXME: the model isn't sync()ed to server yet
        sync: function () {
            console.log("app.models.Font.sync()");
        }
    });

    return Fontomas;
})(Fontomas || {});
