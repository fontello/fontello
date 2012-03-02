var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    App.Views.RearrangeToolbar = Backbone.View.extend({
        tagName: "form",
        id: "fm-form-charset",
        className: "well form-horizontal",
        template: _.template($('#fm-rearrange-toolbar-template').html()),

        events: {
            "click .fm-charset": "changeCharset"
        },

        initialize: function () {
            console.log("Views.RearrangeToolbar.initialize");
            _.bindAll(this);
        },

        render: function () {
            console.log("Views.RearrangeToolbar.render");
            $(this.el).html(this.template());

            return this;
        },

        changeCharset: function (event) {
            console.log("Views.RearrangeToolbar.changeCharset");
            var charset_list = ["basic_latin", "unicode_private"],
                charset = event.target.value;

            // FIXME
            if (_.indexOf(charset_list, charset) != -1) {
                App.main.genfont.setCharset(charset);
            }
        }
    });

    return fm;
})(fm || {});
