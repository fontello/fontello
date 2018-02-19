/* eslint no-alert: 0 */

'use strict';


const _            = require('lodash');
const StateMachine = require('javascript-state-machine');

let lastPageData;
let navigateCallback;
// Incremented request ID
let requestID = 0;

let fsm = StateMachine.create({
  initial: 'IDLE',
  error(eventName, from, to, args, errorCode, errorMessage) {
    let errorReport = `Navigator error: ${errorMessage}`;

    window.alert(errorReport);
    return errorReport;
  },

  events: [
    // return to initial state from any one
    { name: 'reset',         to: 'IDLE' },
    // back/forward buttons + hash change
    { name: 'historyNav',    to: 'HISTORY_NAV' },
    // link click
    { name: 'link',          to: 'LOAD' },
    // handle pop history state on anchor change
    { name: 'changeHash',    to: 'HASH_CHANGE' }
  ]
});


///////////////////////////////////////////////////////////////////////////////
// Local functions

function normalizeURL(url) {
  let a = document.createElement('a');
  a.href = url;
  return a.href.toString();
}


// Parse navigation options
//
// - options
//   - href (required if `apiPath` is not set)
//   - apiPath (required if `href` is not set)
//   - params
//   - anchor
//   - force (reloads the page even if new url matches the old one)
//
// `force` flag is internal, consider using `navigate.reload` in other modules instead
//
function parseOptions(options) {
  let match, href, anchor, apiPath, params, errorReport, force;

  if (typeof options === 'string') {
    options = { href: options };
  }

  force = !!options.force;

  if (options.href) {
    href = normalizeURL(options.href).split('#')[0];
    anchor = normalizeURL(options.href).slice(href.length) || '';

    // Filter out methods that we can't get with RPC. Currently, responder
    // may have 'bin' or 'http' value, and only 'http' corresponds 1x1 to rpc.
    //
    // For example, static files (favicon.ico), attachments and assets
    // shouldn't be handled by the navigator.
    //
    match = _.find(
      N.router.matchAll(href),
      match => _.has(match.meta.methods, 'get') && match.meta.responder !== 'bin'
    );

    if (match) {
      apiPath = match.meta.methods.get;
      params = match.params || {};
    }

  } else if (options.apiPath) {
    apiPath = options.apiPath;
    params = options.params || {};
    href = normalizeURL(N.router.linkTo(apiPath, params));
    anchor = options.anchor || '';

    if (!href) {
      errorReport = 'Invalid parameters passed to `navigate.to` event: ' +
                    JSON.stringify(options);

      window.alert(errorReport);
      return null;
    }

  } else {
    errorReport = 'Not enough parameters for `navigate.to` event. ' +
                  'Need `href` or `apiPath` at least: ' +
                  JSON.stringify(options);

    window.alert(errorReport);
    return null;
  }

  // Add anchor hash-prefix if not exists.
  if (anchor && anchor.charAt(0) !== '#') {
    anchor = '#' + anchor;
  }

  return { apiPath, params, href, anchor, force };
}


function loadData(options, callback) {
  let id = ++requestID;

  // History is enabled - try RPC navigation.
  N.io.rpc(options.apiPath, options.params).then(res => {

    // Page loading was terminated by new operation
    if (id !== requestID) return;

    return N.loader.loadAssets(options.apiPath.split('.')[0]).then(function () {

      // Page loading was terminated by new operation
      if (id !== requestID) return;

      let state = {
        apiPath: options.apiPath,
        params: options.params,
        anchor: options.anchor,
        view: options.apiPath,
        locals: res || {}
      };

      callback(state);
    });

  }).catch(err => {

    // Page loading is terminated or request was canceled
    if (id !== requestID || err === 'CANCELED') return;

    if (err && N.io.REDIRECT === err.code) {
      let redirectUrl = document.createElement('a');

      // Tricky way to parse URL.
      redirectUrl.href = err.head.Location;

      // Note, that we try to keep anchor, if exists.
      // That's important for moved threads and last pages redirects.
      let hash = options.anchor || window.location.hash;

      // Skip on empty hash to avoid dummy '#' in link
      if (hash) redirectUrl.hash = hash;

      // If protocol is changed, we must completely reload the page to keep
      // Same-origin policy for RPC.
      // - port check not required, because port depends on protocol.
      // - domain check not required, because RPC is available on all domains
      //   (it uses relative path)
      if (redirectUrl.protocol !== location.protocol) {
        window.location = redirectUrl.href;
        return;
      }

      callback(redirectUrl.href);
      return;
    }

    if (err && N.io.INVALID_CSRF_TOKEN === err.code) {
      // We are here if CSRF token is incorrect AND rpc call failed to
      // auto-refresh it. It could happen if cookies are disabled.
      //
      // In this case we fallback to navigation via page reload to make
      // site work somehow.
      //
      // If cookies are disabled, user will see a warning about it on
      // the next page anyway.
      //
      window.location = options.href + options.anchor;
      return;
    }

    if (err && N.io.EWRONGVER === err.code) {
      // Server-side code is updated, and it should work fine after a reload
      //
      window.location = options.href + options.anchor;
      return;
    }

    // Checks for a non-system error which should be passed to the callback.
    function isNormalCode(code) {
      return (200 <= code && code <= 299) ||
        (300 <= code && code <= 399) ||
        code === N.io.FORBIDDEN ||
        code === N.io.NOT_FOUND ||
        code === N.io.CLIENT_ERROR;
    }

    if (isNormalCode(err.code)) {
      // Can't load via RPC - show error page.
      //
      // This is a generic error, e.g. forbidden / not found / client error.

      let data = {
        apiPath: null,
        params: {},
        anchor: '',
        view: '',
        locals: {
          err,
          head: { title: err.code + ' ' + err.message }
        }
      };

      // Here we can customize error behaviour (update apiPath/view)
      N.wire.emit('navigate.error', data, () => {
        if (!data.apiPath) {
          window.location = options.href + options.anchor;
          return;
        }

        callback(data);
      });

      return;
    }

    N.wire.emit('io.error', err);
    fsm.reset();
  });
}


function render(data, scroll) {
  let preload = [];

  return Promise.resolve()
    .then(() => N.wire.emit('navigate.exit:' + lastPageData.apiPath, lastPageData))
    .then(() => N.wire.emit('navigate.exit', lastPageData))
    .then(() => N.wire.emit('navigate.preload:' + data.apiPath, preload))
    .then(() => N.loader.loadAssets(preload))
    .then(() => {
      data.state = window.history.state;

      N.runtime.page_data = {};

      let content = $(N.runtime.render(data.view, data.locals, {
        apiPath: data.apiPath
      }));

      document.title = data.locals.head.title;

      $('#content').replaceWith(content);
    })
    .then(() => N.wire.emit('navigate.done', data))
    .then(() => N.wire.emit('navigate.done:' + data.apiPath, data))
    .then(() => {
      if (scroll && !data.no_scroll) {
        // Without this delay firefox on android fails to scroll on long pages
        setTimeout(() => {
          $(window).scrollTop((data.anchor && $(data.anchor).length) ? $(data.anchor).offset().top : 0);
        }, 50);
      }
    })
    .catch(err => N.wire.emit('error', err));
}


///////////////////////////////////////////////////////////////////////////////
// FSM handlers

fsm.onreset = function () {
  // Call callback from previous operation (navigate.to)
  // to resolve pending promise
  if (navigateCallback) {
    navigateCallback();
    navigateCallback = null;
  }
  // Ensure pending requests will be dropped
  requestID++;
};

fsm.onlink = function (event, from, to, params) {
  // If previous request in progress - cleanup and reenter state
  if (from !== 'IDLE') {
    fsm.reset();
    fsm.link(params);
    return;
  }

  let options = parseOptions(params),
      same_url = (options.href === (location.protocol + '//' + location.host + location.pathname + location.search));

  // If errors while parsing
  if (!options) {
    fsm.reset();
    return;
  }

  let target = document.createElement('a');

  target.href = options.href;

  // Target origin (protocol, host) different -> nаviagate by url, via http
  if ((target.protocol && target.protocol !== location.protocol) || (target.host && target.host !== location.host)) {
    window.location = options.href + options.anchor;
    return;
  }

  // It's an external link or 404 error if route is not matched. So perform
  // regular page requesting via HTTP.
  if (!options.apiPath) {
    window.location = options.href + options.anchor;
    return;
  }

  // Fallback for old browsers.
  if (!window.history || !window.history.pushState) {
    window.location = options.href + options.anchor;
    return;
  }

  // Stop here if base URL (all except anchor) haven't changed.

  if ((same_url && !options.force) &&
      // `location.hash = ''` ads # at the end,
      // we should avoid such case: /foo#bar => /foo
      !(location.hash && !options.anchor)) {

    // Update anchor if it's changed.
    if (location.hash !== options.anchor) {
      fsm.changeHash();
      // that will cause `popstate` event
      location.hash = options.anchor;
      return;
    }

    // Nothing changed - finish to IDLE state
    fsm.reset();
    return;
  }

  loadData(options, result => {
    // Redirect url
    if (typeof result === 'string') {

      // Go back to `IDLE` and to `LOAD` again, otherwise `onLOAD` will not emitted
      fsm.reset();
      fsm.link(result);
      return;
    }

    if (same_url) {
      window.history.replaceState(null, result.locals.head.title, options.href + options.anchor);
    } else {
      window.history.pushState(null, result.locals.head.title, options.href + options.anchor);
    }

    render(result, !params.no_scroll).then(() => {
      fsm.reset();
    });
  });
};


// Listen after<event>, not after<state>. Because
// if we reenter the same state, after<state> is not emited.
fsm.onhistoryNav = function (event, from) {
  if (from === 'HASH_CHANGE') {
    // We are here after hash update, then should finish
    fsm.reset();
    return;
  }

  // If previous request in progress - cleanup and reenter state
  if (from !== 'IDLE') {
    fsm.reset();
    fsm.historyNav();
    return;
  }

  let options = parseOptions(document.location);

  // It's an external link or 404 error if route is not matched. So perform
  // regular page requesting via HTTP.
  if (!options.apiPath) {
    window.location = options.href + options.anchor;
    return;
  }

  loadData(options, result => {
    window.history.replaceState(window.history.state, result.locals.head.title, options.href + options.anchor);

    render(result, false).then(() => {
      fsm.reset();
    });
  });
};


///////////////////////////////////////////////////////////////////////////////
// statechange handler

if (window.history && window.history.pushState) {
  // called on back/forward buttons and go() js method call
  // TODO: check if this works correctly if we're changing url for popups
  window.addEventListener('popstate', () => { fsm.historyNav(); });
}


///////////////////////////////////////////////////////////////////////////////
// Wire handlers


// Get current page data from local cache or from server
//
// params:
// - data - (output) current page data
//
N.wire.on('navigate.get_page_raw', function get_page_raw(params) {

  // All needed data already loaded
  if (lastPageData.locals) {
    params.data = lastPageData.locals;
    return Promise.resolve(lastPageData.locals);
  }

  // We should load data from server
  return N.io.rpc(lastPageData.apiPath, lastPageData.params).then(data => {
    // Save response in local cache
    lastPageData.locals = data;

    params.data = lastPageData.locals;

    return data;
  });
});


// Performs RPC navigation to the specified page. Allowed options:
//
//    options.href
//    options.apiPath
//    options.params
//
// `href` and `apiPath` parameters are calculated from each other.
// So they are mutually exclusive.
//
N.wire.on('navigate.to', function navigate_to(options, callback) {
  fsm.reset();

  navigateCallback = callback;
  fsm.link(options);
});


// Reload current page.
//
N.wire.on('navigate.reload', function navigate_reload(__, callback) {
  fsm.reset();

  navigateCallback = callback;
  fsm.link({ href: location.href, force: true, no_scroll: true });
});


// Replace current History state without data fetching and rendering.
//
//   options.href  - full url of new history state.
//                   If not set - use current href. (optional)
//   options.title - new page title.
//                   If not set - use current title. (optional)
//   options.state - additional metadata to store (optional)
//
N.wire.on('navigate.replace', function navigate_replace(options, callback) {
  let url = options.href ? normalizeURL(options.href) : normalizeURL(location.href);
  let title = options.title || document.title;
  let state = options.state || null;

  if (document.title !== title || normalizeURL(location.href) !== url || !_.isEqual(state, window.history.state)) {
    window.history.replaceState(state, title, url);
    document.title = title;
  }

  callback();
});


N.wire.on('navigate.done', { priority: -999 }, function apipath_set(data) {
  lastPageData = data;
});


N.wire.once('navigate.done', { priority: 999 }, function navigate_click_handler() {
  $(document).on('click', 'a', function (event) {
    let $this = $(this);

    if ($this.attr('target') || event.isDefaultPrevented()) {
      // skip links that have `target` attribute specified
      // and clicks that were already handled
      return;
    }

    // Continue as normal for cmd clicks etc
    if (event.which !== 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    let href = $this.attr('href');

    if (href.indexOf('data:') === 0) {
      // Skip data URIs.
      return;
    }

    if (href === '#') {
      // Prevent clicks on special "button"-links.
      event.preventDefault();
      return;
    }

    N.wire
      .emit('navigate.to', href)
      .catch(err => { N.logger.error('%s', err); });

    event.preventDefault();
  });
});


// Insert new content into the current page
//
//   options.$        - content to insert
//   options.$before  - insert before this element
//   options.$after   - insert after this element
//   options.$replace - replace this element
//
// Only one of `$before`, `$after` and `$replace` options should be present.
//
N.wire.after('navigate.update', { priority: 999 }, function navigate_update(options) {
  if (options.$replace) {
    options.$replace.replaceWith(options.$);

  } else if (options.$before) {
    options.$before.before(options.$);

  } else if (options.$after) {
    options.$after.after(options.$);
  }

  return N.wire.emit('navigate.update.done', options);
});
