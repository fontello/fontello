var Fontomas = (function (Fontomas) {
    var App = Fontomas.App,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

    App.Views.RearrangeToolbar = Backbone.View.extend({
        events: {
            "click .fm-charset": "changeCharset"
        },

        initialize: function () {
            console.log("Views.RearrangeToolbar.initialize");
            _.bindAll(this);
        },

        render: function () {
            console.log("Views.RearrangeToolbar.render");
            return this;
        },

        changeCharset: function (event) {
            console.log("Views.RearrangeToolbar.changeCharset");
            var charset = event.target.value;
            App.main.genfont.setCharset(charset);
        }
    });

    return Fontomas;
})(Fontomas || {});
