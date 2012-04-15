module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "preview-glyph",


  initialize: function () {
    _.bindAll(this);

    this.model.on("change",  this.render, this);
    this.model.on("destroy", this.remove, this);

    this.render();
  },


  render: function () {
    var src = this.model.get('source_glyph'), css = 'icon-' + src.css;

    this.$el.addClass('fm-embedded-' + src.embedded_id);
    this.$el.empty().append('<div><i class="' + css + '"></i> ' + css + '</div>');

    return this;
  },


  remove: function () {
    this.$el.remove();
    this.trigger("remove", this);
  }
});
