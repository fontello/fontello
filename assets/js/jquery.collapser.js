/**
* ndCollapser : jQuery plugin
*/
;(function ($, undefined) {
  // internal
  // finds element given by data-`name` selector or n-th parent
  var get_related_el = function get_related_el($this, name) {
    var value = $this.data(name);

    // using lossy comparison as empty values
    // should be treaten as 0 for us
    if (value != +value) {
      return $(value);
    }

    // make no difference between -1 and 1
    value = Math.abs(value);

    // reduce value by one, if value is higher than 0
    // as first parent index is 0
    if (0 < value) { value--; }

    return $this.parents().eq(value);
  };


  // Applies collapser to each matching element.
  //
  // Configuration for each collapser is taken directly from element's data
  // attributes (optional), which are:
  //
  //  - toggle (String): Selector of data that should become collapsable.
  //    If not given, then next sibling element of toggler's parent will be
  //    used, e.g.:
  //
  //      <h1> Collapsable thing <span id="t">O</span></h1>
  //      <div id="foobar">...</div>
  //      <div id="xoxoxo">...</div>
  //
  //    In the example above, calling `$('#t').NodecaCollapser()` will make
  //    span#t become toggler for div#foobar, so it will collapse/uncollapse
  //    when clicked. But you may want to make it collapse div#xoxoxo instead,
  //    so you may add `toggle` attribute like so:
  //
  //      <span id="t" data-toggle="#xoxoxo">O</span>
  //
  //    Or even both divs:
  //
  //      <span id="t" data-toggle="#foobar, #xoxoxo">O</span>
  //
  //  - notify (Number|String): Specifies element that will be notified (via
  //    toggling CSS class "_collapsed". "-2" by default.
  //
  //    When given as a String, element will be found by selector, e.g.:
  //
  //      <span id="t" data-notify="#foobar">...
  //
  //    will add `_collapsed` class to element found by #foobar, when span#t
  //    will collapse container (see toggle), and remove this class on
  //    uncollapse.
  //
  //    When given as a Number, n-th parent of `toggler` will be used, e.g.
  //
  //      <div id="abc">
  //      <h1> ... <span id="t" data-notify=2>...
  //
  //    will add `_collapsed` to div#abc, when span#t is clicked.
  //
  //    By default, equals 2.
  //
  //  - extra-toggler (Number|String): Specifies element that should act as
  //    "alias" of toggler. See exaplanation of `notify` about possible types
  //    of values.
  //
  //    By default, no extra-togglers will be used.
  //
  //
  // ##### Examples:
  //
  // jQuery('span.show-hide-trigger').ndCollapser();
  //
  $.fn.ndCollapser = function () {
    return this.each(function () {
      var $this = $(this),
          $togglers = $this, // by default bind click on toggler only
          $notify = (undefined === $this.data('notify'))
                    ? $this.parent().parent()
                    : get_related_el($this, 'notify'),
          $slave = $this.data('toggle')
                    ? $($this.data('toggle'))
                    : $this.parent().next();

      if (undefined !== $this.data('extra-toggler')) {
        (function ($extra_toggler) {
          $extra_toggler.css('cursor', 'pointer');
          $togglers = $this.add($extra_toggler);
        })(get_related_el($this, 'extra-toggler'));
      }

      $togglers.click(function (evt) {
        $notify.toggleClass('_collapsed');
        $slave.slideToggle();
        return false;
      });
    });
  };
  $.fn.ndExpander = function () {
    return this.each(function () {
      var $this = $(this),
          $togglers = $this, // by default bind click on toggler only
          $notify = (undefined === $this.data('notify'))
                    ? $this.parent().parent()
                    : get_related_el($this, 'notify'),
          $slave = $this.data('toggle')
                    ? $($this.data('toggle'))
                    : $this.parent().next();

      if (undefined !== $this.data('extra-toggler')) {
        (function ($extra_toggler) {
          $extra_toggler.css('cursor', 'pointer');
          $togglers = $this.add($extra_toggler);
        })(get_related_el($this, 'extra-toggler'));
      }

      $togglers.click(function (evt) {
        $notify.toggleClass('_expanded');
        $slave.slideToggle();
        return false;
      });
    });
  };

})(jQuery);

