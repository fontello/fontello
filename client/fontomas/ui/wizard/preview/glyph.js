module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "preview-glyph span2",


  initialize: function () {
    _.bindAll(this);

    this.model.on("change",  this.render, this);
    this.model.on("destroy", this.remove, this);

    this.render();
  },


  render: function () {
    var src = this.model.get('source_glyph'),
        css = 'icon-' + src.css,
        fnt = 'fm-embedded-' + src.embedded_id,
        chr = nodeca.client.fontomas.util.fixedFromCharCode(src.code);

    this.$el.empty();
    this.$el.append('<span class="' + fnt + '">' + chr + '</span> ' + css);

    return this;
  },


  remove: function () {
    this.$el.remove();
    this.trigger("remove", this);
  }
});
