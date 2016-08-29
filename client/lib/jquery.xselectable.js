/*
  Copyright (c) 2011 Riccardo Govoni

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*
 * A jQuery plugin that mimics jQuery UI 'selectable' (see
 * http://jqueryui.com/demos/selectable/) while adding significant extras:
 *
 * - Selection works over Flash embeds. Flash embeds would normally swallow
 *   click events, causing the selection gesture not to terminate if the mouse
 *   were to be released within the Flash embed. This plugin separates the
 *   selection box from the selectable elements via glass panels to fix that.
 *
 * - Scrolling support. When the selectable container overflows the window
 *   viewport or the selectable elements overflow the selectable viewable
 *   viewport (causing scrollbars to appear on it) and the selection box is
 *   dragged toward the viewport borders, the viewport (either the document
 *   or the selectable) is scrolled accordingly to let the selection gesture
 *   continue until the viewport scrolling limits are hit.
 *   Scrolling management is pluggable, which allows for different scrolling
 *   implementations (in addition to the default one which relies on native
 *   browser scrolling functionality). For example, a Google Maps-like endless
 *   scrolling can be easily implemented.
 *
 * - Selection does not inadvertently trigger when the mouse down event
 *   occurs over scrollbars. See http://bugs.jqueryui.com/ticket/4441.
 *
 * - The plugin doesn't require any of jQuery UI machinery, but can be used
 *   directly on top of jQuery, possibly reducing the javascript payload used in
 *   the hosting page.
 *
 * The plugin semantics are similar to jQuery UI 'selectable' ones but not the
 * same. While it's fairly straightforward to replace jQuery UI plugin for
 * this, this pluging is not 100% compatible drop-in replacement due to a number
 * of differences:
 *
 * - The plugin deals only with box-selection. Single element selection by
 *   clicking on a selectable element must be implemented externally.
 *
 * - Multiple non-adjacent selections are not supported.
 *
 * - Not all of jQuery UI 'selectable' options are supported -- e.g. 'delay',
 *   'tolerance:fit' and refresh management.
 *
 * - Only event-based notification of plugin actions (selection start and stop,
 *   change in selected elements) is supported. Callback-based notification is
 *   not supported.
 *
 * - Only one 'selected' and 'unselected' event pair is fired at the end of the
 *   selection gesture, pointing to an array of all selected, unselected
 *   elements (contrary to jQuery UI plugin firing a separate event for each
 *   selected, unselected item).
 *
 * - Manual refresh management is delegated to external functionality (if the
 *   delevoper wants to adopt it) for better granularity: the developer becomes
 *   responsible for tracking the positions of all selectable elements (contrary
 *   to the jQuery UI plugin which only allows the developer to trigger a manual
 *   refresh, that will recompute all selectable elements' positions in bulk).
 *
 * - Different class prefixes are used for selectable statuses.
 *
 * Refer to http://github.com/battlehorse/jquery-xselectable for further info,
 * documentation and demos.
 */

// Requirejs-compatible plugin definition, from https://github.com/umdjs/umd
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD Registration
        define(['jquery'], factory);
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

  var pluginName = 'xselectable';

  /**
   * Default configuration options. Can be overriden at plugin initialization
   * time or later using the 'option' method.
   */
  var defaultOptions = {

    // Tolerance, in pixels, for when selecting should start. If specified,
    // selecting will not start until after mouse is dragged beyond distance.
    distance: 0,

    // Whether the selectable behavior is enabled or not.
    disabled: false,

    // Prevents selecting if you start on elements matching the selector.
    cancel: ':input,option',

    // The matching child elements will be made able to be selected.
    filter: '*',

    // The minimum pixel distance, from the scrolling viewport border that
    // should trigger scrolling.
    scrollingThreshold: 100,

    // A multiplier to increase/decrease scrolling speed.
    scrollSpeedMultiplier: 1,

    // Custom scroller implementation. If null, the default one is used.
    //
    // The default scroller relies on native browser scrolling functionality
    // and deals with two specific cases (possibly concurrently):
    // - the selection container overflows the browser window viewport: the
    //   browser window is scrolled to let the selection box expand until it
    //   hits the selection container margins.
    // - the selectable content overflows the selection container viewport
    //   (causing the container to have scrollbars): the selectable content is
    //   scrolled to let the selection box expand until it hits the selectable
    //   content  margins.
    // Both conditions can happen at the same time, in which case the former
    // is addressed first, then the latter.
    //
    // If provided, it must be a function that accepts the element upon which
    // the plugin is applied and returns an object implementing the required
    // scroller methods (getScrollableElement, getScrollableDistance, scroll,
    // getScrollOffset, getScrollBorders). See 'contentScroller' for details.
    scroller: null,

    // Custom positioner implementation. The positioner is responsible for
    // computing selectable elements' positions when the selection gesture
    // starts, in order to correctly compute when the selection box touches
    // a selectable element.
    //
    // The default implementation computes selectables' positions via offset
    // measurement. This works accurately if the element the plugin applies to
    // (the selection container) is their offset parent.
    //
    // The default implementation recomputes selectables' positions every time
    // the selection gesture starts. This may be inefficient when many
    // selectable elements are present.
    //
    // Custom implementations may be provided to overcome the above
    // limitations. If provided, it must be a function that accepts a
    // selectable element (i.e. any element matching the 'filter' option) and
    // return an object containing the 'top', 'left', 'width', and 'height'
    // properties.
    //
    // 'top' and 'left' must define the distance, in pixels, of the top-left
    // corner of the selectable from the top-left corner of the selection
    // container, accurate at the time the call is made. 'width' and 'height'
    // must define the outer width and height (including border, but not
    // margin) of the selectable element.
    positioner: null
  };

  /**
   * A scroller to handle native document (browser window) scrolling when the
   * selection container overflows the window viewport. It triggers when the
   * selection box comes close to the browser window borders.
   *
   * @param {!Element} el The selection container, i.e. the element to which the
   *     plugin is applied to.
   */
  var documentScroller = function(el) {

    // Dimensions of the selection container
    var containerDimensions = $(el).data(pluginName).containerDimensions;

    // Browser window viewport dimensions
    var width = typeof(window.innerWidth) == 'number' ?
        window.innerWidth : document.documentElement.clientWidth;
    var height = typeof(window.innerHeight) == 'number' ?
        window.innerHeight : document.documentElement.clientHeight;

    // Browser document length
    var documentWidth = document.documentElement.scrollWidth,
        documentHeight = document.documentElement.scrollHeight;

    /**
     * @return {!Element} The DOM element which is scrolled when this scroller
     *     operates. For this scroller it's the documentElement or body.
     */
    function getScrollableElement() {
      return document.documentElement;
    }

    /**
     * Returns the top, right, bottom and left positions of the viewport
     * borders that should trigger scrolling when the selection box is dragged
     * close to them.
     *
     * @return {!Array.<number>} Positions of the scrolling viewport borders,
     *     respectively in the following order: top, right, bottom, left. All
     *     positions are relative to the top-left corner of the document.
     */
    function getScrollBorders() {
      var scrollTop = typeof(window.pageYOffset) == 'number' ?
          window.pageYOffset : document.documentElement.scrollTop;
      var scrollLeft = typeof(window.pageXOffset) == 'number' ?
          window.pageXOffset : document.documentElement.scrollLeft;

      return [scrollTop, scrollLeft + width, scrollTop + height, scrollLeft];
    }

    /**
     * Returns the available distance the scrolling viewport can still be
     * scrolled before reaching the selection container margins: even if the
     * document could scroll further past the selection container margins,
     * dragging the selection box does not cause further scrolling once the
     * selection container margins are in view.
     *
     * @return {!Array.<number>} Available scrolling distances (in px),
     *     respectively from the following margins: top, right, bottom, left.
     */
    function getScrollableDistances() {
      var scrollTop = typeof(window.pageYOffset) == 'number' ?
          window.pageYOffset : document.documentElement.scrollTop;
      var scrollLeft = typeof(window.pageXOffset) == 'number' ?
          window.pageXOffset : document.documentElement.scrollLeft;
      return [
          Math.max(scrollTop - containerDimensions.top, 0), 
          Math.max(
              containerDimensions.left + containerDimensions.width
              - scrollLeft - width, 0),
          Math.max(
              containerDimensions.top + containerDimensions.height
              - scrollTop - height, 0),
          Math.max(scrollLeft - containerDimensions.left, 0)];
    }

    /**
     * Scrolls the browser window viewport by the required amount.
     *
     * @param {string} scrollAxis The scrolling axis, either 'vertical' or
     *     'horizontal'.
     * @param {number} shift The scrolling amount, in pixels. If positive the
     *     scrolling direction should be downward / rightward. If negative,
     *     upward / leftward.
     */
    function scroll(scrollAxis, shift) {
      if (scrollAxis == 'vertical') {
        window.scrollBy(0, shift);
      } else {
        window.scrollBy(shift, 0);
      }
    }

    /**
     * Returns the offset, in pixels, that should be added to selectable
     * elements' positions (as computed by the plugin 'positioner'), to take
     * into account scrolling. This is not relevant when native browser
     * scrolling is used.
     *
     * @return {!Object.<string, number>} An object containing the 'top' and
     *     'left' properties, pointing respectively to the top and left offset
     *     to add.
     */
    function getScrollOffset() {
      return {top: 0, left: 0};
    }

    return {
      getScrollableElement: getScrollableElement,
      getScrollBorders: getScrollBorders,
      getScrollableDistances: getScrollableDistances,
      scroll: scroll,
      getScrollOffset: getScrollOffset,

      // Chain this scroller to the contentScroller, so that it starts
      // triggering as soon as document scrolling terminates.
      next: contentScroller(el)
    };
  };

  /**
   * Content scroller. It scrolls the selection container viewport using
   * native browser scrolling mechanisms whenever the selection box comes
   * close to the viewport borders and the selectable content overflows the
   * selection container viewport.
   *
   * @param {!Element} el The selection container, i.e. the element to which the
   *     plugin is applied to.
   */
  var contentScroller = function(el) {

    var containerDimensions = $(el).data(pluginName).containerDimensions;

    /**
     * Returns the available distance the selection container viewport can
     * still be scrolled before reaching the selection container margins.
     *
     * @return {!Array.<number>} Available scrolling distances, respectively
     *     from the following borders: top, right, bottom, left.
     */
    function getScrollableDistances() {
      return [
        el.scrollTop,
        el.scrollWidth - el.scrollLeft - containerDimensions.width,
        el.scrollHeight - el.scrollTop - containerDimensions.height,
        el.scrollLeft
      ];
    }

    /**
     * Scrolls the selection container viewport by the required amount.
     *
     * @param {string} scrollAxis The scrolling axis, either 'vertical' or
     *     'horizontal'.
     * @param {number} shift The scrolling amount, in pixels. If positive the
     *     scrolling direction should be downward / rightward. If negative,
     *     upward / leftward.
     */
    function scroll(scrollAxis, shift) {
      var property = scrollAxis == 'vertical' ? 'scrollTop' : 'scrollLeft';
      el[property] += shift;
    }

    /**
     * Returns the offset, in pixels, that should be added to selectable
     * elements' positions (as computed by the plugin 'positioner'), to take
     * into account scrolling.
     *
     * This is not relevant when native browser scrolling is used, but comes
     * into play when scrolling is emulated via container offsets (for Google
     * Maps-like scrolling behavior).
     *
     * @return {!Object.<string, number>} An object containing the 'top' and
     *     'left' properties, pointing respectively to the top and left offset
     *     to add.
     */
    function getScrollOffset() {
      return {top: 0, left: 0};
    }

    return {
      getScrollableDistances: getScrollableDistances,
      scroll: scroll,
      getScrollOffset: getScrollOffset
    };
  };

  /**
   * @return {!Element} The default DOM element which is assumed to be
   *     scrolled when this scroller operates, if the scroller does not
   *     specify any in its 'getSrollableElement' method. The default is the
   *     the selection container itself.
   */
  var getDefaultScrollableElement = function() {
    return this;
  };

  /**
   * Returns the default top, right, bottom and left positions of the viewport
   * borders that should trigger scrolling when the selection box is dragged
   * close to them, if the scroller does not specify any in its
   * 'getScrollBorders' method.
   *
   * @return {!Array.<number>} Positions of the scrolling viewport borders,
   *     respectively in the following order: top, right, bottom, left. All
   *     positions are relative to the top-left corner of the document. The
   *     default are the border positions of the selection container itself.
   */
  var getDefaultScrollBorders = function() {
    var containerDimensions = $(this).data(pluginName).containerDimensions;
    return [
        containerDimensions.top,
        containerDimensions.left + containerDimensions.width,
        containerDimensions.top + containerDimensions.height,
        containerDimensions.left];
  };

  /**
   * Default positioner. It computes selectable elements' positions, necessary
   * to identify selected elements as the selection box is dragged around.
   *
   * This default implementation computes selectables' positions via offset
   * measurement. This works accurately if the element the plugin applies to
   * (the selection container) is their offset parent.
   *
   * @param {!Element} selectable A selectable element, i.e. any element
   *     matching the plugin 'filter' option.
   * @return {!Object.<string, number>} An object containing the 'top', 'left',
   *     'width' and 'height' properties. 'top' and 'left' define the distance,
   *     in pixels, of the top-left corner of the selectable from the top-left
   *     corner of the selection container, accurate at the time the call is
   *     made. 'width' and 'height' define the outer width and height
   *     (including border, but not margin) of the selectable element.
   */
  var defaultPositioner = function(selectable) {
    return {
      'top': selectable.offsetTop,
      'left': selectable.offsetLeft,
      'width': selectable.offsetWidth,
      'height': selectable.offsetHeight
    };
  };

  var sign = function(i) {
    return i > 0 ? 1 : i < 0 ? -1 : 0;
  };

  /**
   * Creates the selection box and the glass panel that isolates selectable
   * elements from the selection gesture events (required to prevent Flash
   * grabbing mouseup events for selections ending on top of Flash embeds).
   */
  var createSelectionBox = function() {
    var $this = $(this),
        data = $this.data(pluginName);

    data.selectionGlass = $(
      '<div />', {'class': pluginName + '-glass'}).css({
      'position': 'absolute',
      'top': 0,
      'left': 0,
      'height': this.scrollHeight,
      'width': this.scrollWidth,
      'overflow': 'hidden'}).appendTo($this);
    data.selectionBox = $(
      '<div />', {'class': pluginName + '-box'}).css({
      'position': 'absolute'
      }).appendTo(data.selectionGlass);
  };

  /**
   * Initializes all the selectable elements' when the selection gesture
   * starts. This includes caching their current position and clearing any
   * previous selection.
   */
  var initSelectablesOnGestureStart = function() {
    var self = this,
        $this = $(this),
        data = $this.data(pluginName);

    var selectables = [];
    $this.find(data.options.filter).each(function() {
      var selectable =
        (data.options.positioner || defaultPositioner).call(self, this);
      selectable.element = this;
      selectable.selected = false;
      selectables.push(selectable);
    }).removeClass(pluginName + '-selected');
    data.selectables = selectables;
  };

  /**
   * Updates the selection box position and sizing to match the distance
   * travelled from the position where the selection gesture started and
   * the current mouse position.
   */
  var updateSelectionBox = function(evt) {
    var data = $(this).data(pluginName);
    data.selectionBoxExtents = {
      // pageX, pageY positions are relative to the document, so they need
      // to be converted to the selection container reference frame.
      'top':
          Math.min(data.startPosition.pageY, evt.pageY) -
          data.containerDimensions.top +
          this.scrollTop,
      'left':
          Math.min(data.startPosition.pageX, evt.pageX) -
          data.containerDimensions.left +
          this.scrollLeft,
      'height': Math.abs(data.startPosition.pageY - evt.pageY),
      'width': Math.abs(data.startPosition.pageX - evt.pageX)
    };
    data.selectionBox.css(data.selectionBoxExtents);
  };

  /**
   * Triggers the selection container viewport scrolling, if the selection
   * box is being dragged too close to the viewport borders.
   *
   * @param {!Event} evt The last mousemove event received.
   * @param {!Object} scroller A scroller implementation, for example
   *     'documentScroller' or 'contentScroller'.
   * @param {number?} scrollTimestamp The timestamp at which the last scrolling
   *     operation was performed. Undefined if a mouse movement occurred in
   *     between.
   */
  var updateViewportScrolling = function(evt, scroller, scrollTimestamp) {
    var $this = $(this),
        data = $this.data(pluginName),
        containerDimensions = data.containerDimensions,
        threshold = data.options.scrollingThreshold,
        scrollSpeedMultiplier = data.options.scrollSpeedMultiplier;

    if (data.scrollingTimeout) {
      window.clearTimeout(data.scrollingTimeout);
      delete data.scrollingTimeout;
    }

    // Compute a multiplier based on the actual amount of time that
    // passed since the last scrolling update, to keep scrolling speed
    // constant as if scrolling occurred at exactly 60fps.
    var scrollLagMultiplier = scrollTimestamp ?
        (new Date().getTime() - scrollTimestamp) / 16 : 1;
    var tickTimestamp = scrollTimestamp;

    var scrolled = false;
    var scrollableDistances = scroller.getScrollableDistances();
    var scrollBorders = scroller.getScrollBorders ?
        scroller.getScrollBorders() : getDefaultScrollBorders.call(this);
    var scrollableElement = scroller.getScrollableElement ?
        scroller.getScrollableElement() :
        getDefaultScrollableElement.call(this);

    var scrollMetrics = [
      { // top
        distance: Math.max(evt.pageY - scrollBorders[0], 0),
        direction: -1,
        scrollAxis: 'vertical',
        positionProperty: 'pageY'
      },
      { // right
        distance: Math.max(scrollBorders[1] - evt.pageX, 0),
        direction: 1,
        scrollAxis: 'horizontal',
        positionProperty: 'pageX'
      },
      { // bottom
        distance: Math.max(scrollBorders[2] - evt.pageY, 0),
        direction: 1,
        scrollAxis: 'vertical',
        positionProperty: 'pageY'
      },
      { // left
        distance: Math.max(evt.pageX - scrollBorders[3], 0),
        direction: -1,
        scrollAxis: 'horizontal',
        positionProperty: 'pageX'
      }
    ];

    for (var i = scrollMetrics.length - 1; i >= 0; i--) {
      var metric = scrollMetrics[i];
      var available = scrollableDistances[i];

      if (
          // We are within a minimum threshold distance from the viewport
          // border, and
          metric.distance < threshold &&

          // We still have room for scrolling, and
          available > 0 &&

            // We are moving toward the viewport border
            sign(
                data.curPosition[metric.positionProperty] -
                data.lastPosition[metric.positionProperty]) ==
                    metric.direction
        ) {

        // Compute the scrolling shift: the closer we push the mouse toward the
        // viewport border, the bigger the shift.
        var shift = metric.direction * Math.round(Math.min(
            available,
            Math.ceil((threshold - metric.distance) / 10) *
                scrollLagMultiplier * scrollSpeedMultiplier));

        // Scroll in the desired direction
        scroller.scroll(metric.scrollAxis, shift);

        if (scrollableElement == this) {
          // If we scrolled the content of the selection container, move the
          // selection box starting position in the opposite direction by the
          // same amount, to keep its origin fixed (with respect to the
          // selection container top-left corner).
          data.startPosition[metric.positionProperty] -= shift;
          data.curPosition[metric.positionProperty] -= shift;
        } else {
          // Otherwise, if a wrapping element was scrolled (assuming it wraps
          // the selection container), advance the mouse position by the same
          // amount.
          evt[metric.positionProperty] += shift;
        }

        scrolled = true;
      }
    }

    if (scrolled) {
      // If scrolling started, continue scrolling until another mouse movement
      // is detected (to handle the case when the mouse is moved toward a
      // viewport border and left stationary for the scrolling to continue at a
      // constant speed).
      data.scrollingTimeout = window.setTimeout($.proxy(
          function() { tick.call(this, evt, tickTimestamp); }, this),
          16);  // try to keep scrolling at 60fps.
    } else if (scroller.next) {
      // Delegate to a chained scroller, if present.
      updateViewportScrolling.call(this, evt, scroller.next, scrollTimestamp);
    }
  };


  /**
   * Update the selection status of all selectable elements', depending on
   * whether the selection box currently touches them or not. Triggers
   * 'selecting' and 'unselecting' events.
   */
  var markSelected = function(scroller) {
    var $this = $(this),
        data = $this.data(pluginName);

    var offset = {top: 0, left: 0};
    var scrollerChain = scroller;
    while (!!scrollerChain) {
      var scrollerOffset = scrollerChain.getScrollOffset();
      offset.top += scrollerOffset.top;
      offset.left += scrollerOffset.left;
      scrollerChain = scrollerChain.next;
    }

    for (var i = data.selectables.length - 1; i >=0 ; i--) {
      var selectable = data.selectables[i];
      if (overlap(data.selectionBoxExtents, selectable, offset)) {
        if (!selectable.selected) {
          $(selectable.element).addClass(pluginName + '-selected');
          selectable.selected = true;
          $this.trigger(
              pluginName + 'selecting',
              {'selecting': selectable.element});
        }
      } else if (selectable.selected) {
        $(selectable.element).removeClass(pluginName + '-selected');
        selectable.selected = false;
        $this.trigger(
            pluginName + 'unselecting',
            {'unselecting': selectable.element});
      }
    }
  };

  var overlap = function(rectangle1, rectangle2, offset) {
    return (
      overlap1D(rectangle1.top, rectangle1.height,
                rectangle2.top + offset.top, rectangle2.height) &&
      overlap1D(rectangle1.left, rectangle1.width,
                rectangle2.left + offset.left, rectangle2.width));
  };

  var overlap1D = function(start1, width1, start2, width2) {
    var end1 = start1 + width1, end2 = start2 + width2;
    return ((start2 >= start1 && start2 <= end1) ||
        (end2 >= start1 && end2 <= end1) ||
        (start2 <= start1 && end2 >= end1));
  };

  /**
   * Reacts to the user pressing the mouse down inside the selectable container
   * viewport, possibly initiating a selection gesture.
   */
  var onMouseDown = function(evt) {
    var $this = $(this),
        data = $this.data(pluginName);

    // Do not start selection if it's not done with the left button.
    if (evt.which != 1) {
      return;
    }

    // Prevent selection from starting on any element matched by
    // or contained within the selector specified by the 'cancel'
    // option.
    var selector =
        [data.options.cancel, data.options.cancel + ' *'].join(',');
    if (!!data.options.cancel &&
        $(evt.target).is(selector)) {
      return;
    }

    // Prevent selection if the mouse is being pressed down on a scrollbar
    // (which is still technically part of the selectable element).
    if (evt.pageX > $this.offset().left + this.clientWidth ||
        evt.pageY > $this.offset().top + this.clientHeight) {
      return;
    }

    // Record the initial position of the container, with respect to the
    // document. Also include the current border size (assuming equal
    // top/bottom and right/left border sizes).
    data.containerDimensions = {
      'top': $this.offset().top +
             ($this.outerHeight(false) - $this.innerHeight())/2,
      'left': $this.offset().left +
              ($this.outerWidth(false) - $this.innerWidth())/2,
      'width': this.clientWidth,
      'height': this.clientHeight
    };

    // Record the initial position of the mouse event, with respect to the
    // document (_not_ including the scrolling position of the selection
    // container).
    data.startPosition = {'pageX': evt.pageX, 'pageY': evt.pageY};
    data.curPosition = {'pageX': evt.pageX, 'pageY': evt.pageY};

    // Init the scroller
    data.scroller = (data.options.scroller || documentScroller).
        call(this, this);

    // Start listening for mouseup (to terminate selection), movement and
    // wheel scrolling. Mouseups and movement can occur everywhere in the
    // document, if the user moves the mouse outside the selection container.
    data.mouseupHandler = $.proxy(onMouseUp, this);
    $(document).bind('mouseup.' + pluginName, data.mouseupHandler);
    $(document).bind('mousemove.' + pluginName, $.proxy(tick, this));

    // Disable mousewheel scrolling during box selections.
    $this.bind('mousewheel.' + pluginName, function(evt) {
      evt.preventDefault(); return false;
    });

    // Prevent the default browser dragging to occur.
    evt.preventDefault();
  };

  /**
   * Updates the plugin state during a selection operation in response either to
   * mouse dragging by the user, or repeated scrolling updates because the
   * selection box is skimming the scrolling container viewport borders.
   *
   * @param {!Event} evt The last mousemove event received.
   * @param {number?} scrollTimestamp The timestamp at which the last scrolling
   *     operation was performed. Undefined if this function is being invoked
   *     in response to mouse dragging.
   */
  var tick = function(evt, scrollTimestamp) {
    var $this = $(this),
        data = $this.data(pluginName),
        scroller = data.scroller,
        distance = data.options.distance;

    // Do nothing if we haven't yet moved past the distance threshold.
    if (!data.selectionBox &&
        Math.abs(data.startPosition.pageX - evt.pageX) < distance &&
        Math.abs(data.startPosition.pageY - evt.pageY) < distance) {
      return;
    }

    data.lastPosition = data.curPosition;
    data.curPosition = {'pageX': evt.pageX, 'pageY': evt.pageY};

    if (!data.selectionBox) {
      // Trigger the selection 'start' event.
      $this.trigger(pluginName + 'start');

      // Create the selection box if we haven't created it yet.
      createSelectionBox.apply(this);

      // Compute the initial position and sizing of each selectable
      // object.
      initSelectablesOnGestureStart.apply(this);
    }

    // scroll the viewport if the mouse moves near the viewport boundaries.
    updateViewportScrolling.call(this, evt, scroller, scrollTimestamp);

    // update the selection box position and size.
    updateSelectionBox.call(this, evt);

    // mark elements as selected / deselected based on the current
    // selection box extent.
    markSelected.call(this, scroller);
  };

  /**
   * Terminates a selection gesture.
   */
  var onMouseUp = function(evt) {
    var $this = $(this),
        data = $this.data(pluginName);

    if (data.scrollingTimeout) {
      window.clearTimeout(data.scrollingTimeout);
      delete data.scrollingTimeout;
    }

    $this.unbind('mousewheel.' + pluginName);
    $(document).unbind('mousemove.' + pluginName);
    $(document).unbind('mouseup.' + pluginName, data.mouseupHandler);
    data.mouseupHandler = undefined;

    if (!!data.selectionBox) {
      data.selectionBox.remove();
      delete data.selectionBox;

      data.selectionGlass.remove();
      delete data.selectionGlass;

      var selected = [], unselected = [];
      for (var i = data.selectables.length - 1; i >= 0; i--) {
        (data.selectables[i].selected ? selected : unselected).push(
            data.selectables[i].element);
      }
      delete data.selectables;

      // If selection ever started (we moved past the threshold distance),
      // fire the completion events.
      $this.trigger(pluginName + 'selected', {'selected': selected});
      $this.trigger(pluginName + 'unselected', {'unselected': unselected});
      $this.trigger(pluginName + 'stop');
    }
  };

  // Public plugin methods.
  var methods = {

    /**
     * Actives the plugin on the given set of elements.
     *
     * @param {Object} options The plugin options.
     */
    init: function(options) {
      this.each(function() {
        $(this).data(
            pluginName,
            {'options': $.extend({}, defaultOptions, options)});
      });
      if (!!this.data(pluginName).options.disabled) {
        return this;
      }
      return methods.enable.apply(this);
    },

    /**
     * Deactives the plugin on the given set of elements, clearing any
     * additional data structures and event listeners created in the process.
     *
     * Note that deactivating the plugin while a selection operation is in
     * progress will lead to undefined results.
     */
    destroy: function() {
      methods.disable.apply(this);
      return this.removeData(pluginName);
    },

    /**
     * Enables selection gestures.
     */
    enable: function() {
      return this.each(function() {
        var $this = $(this),
            data = $this.data(pluginName);

        data.options.disabled = false;
        $this.bind('mousedown.' + pluginName, onMouseDown);
      });
    },

    /**
     * Disables selection gestures.
     */
    disable: function() {
      return this.each(function() {
        var $this = $(this),
            data = $this.data(pluginName);

        data.options.disabled = true;
        $this.unbind('.' + pluginName);
      });
    },

    /**
     * Get or set any selectable option. If no value is specified, will act as
     * a getter.
     *
     * @param {string} key The option key to get or set.
     * @param {Object=} opt_value If undefined, the method will act as a
     *     getter, otherwise the option value will be set to the given one
     *     (null values may be used to reset certain properties to their
     *     default status).
     * @return {Object?} Either the request option value (when acting as
     *     getter, or 'this' for chainability when acting as setter.
     */
    option: function(key, opt_value) {
      var options = this.first().data(pluginName).options;
      if (opt_value === undefined) {
        return options[key];
      } else {
        options[key] = opt_value;
        if (key == 'disabled') {
          (!!opt_value) ?
              methods.disable.apply(this) : methods.enable.apply(this);
        }
        return this;
      }
    }
  };

  // Method dispatcher.
  $.fn[pluginName] = function( method ) {

    if ( methods[method] ) {
      return methods[ method ].apply(
          this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error('Method ' +  method + ' does not exist on jQuery.' + pluginName);
    }

  };
}));
