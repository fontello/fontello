var Fontomas = (function (Fontomas) {
  "use strict";

  var app = Fontomas.app,
    Backbone = window.Backbone,
    _ = window._;

  app.views.RearrangeToolbar = Backbone.View.extend({
    events: {
      "click .fm-charset": "changeCharset"
    },

    initialize: function () {
      console.log("app.views.RearrangeToolbar.initialize");
      _.bindAll(this);
    },

    render: function () {
      console.log("app.views.RearrangeToolbar.render");
      return this;
    },

    changeCharset: function (event) {
      console.log("app.views.RearrangeToolbar.changeCharset");
      var charset = event.target.value;
      app.main.genfont.setCharset(charset);
    }
  });

  return Fontomas;
}(Fontomas || {}));
