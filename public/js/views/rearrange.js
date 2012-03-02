var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

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

    return fm;
})(fm || {});
