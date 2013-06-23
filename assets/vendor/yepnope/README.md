#yepnope.js#

A Conditional Script Loader For Your Polyfills, or Regressive Enhancement With Style.

A small script loader to help use feature detection to load exactly the scripts that your _user_ needs, not just all the scripts that you _think_ they might need.

More docs, etc at: [http://yepnopejs.com](http://yepnopejs.com)

By:

Alex Sexton - AlexSexton [at] gmail

Ralph Holzmann - RalphHolzmann [at] gmail


Follow: [@SlexAxton](http://twitter.com/SlexAxton) and [@ralphholzmann](http://twitter.com/ralphholzmann) on Twitter for more updates.

##A simple example (assuming modernizr is there):##

    yepnope([
      {
        test : Modernizr.indexeddb,
        yep  : ['/js/indexeddb-wrapper.js', '/css/coolbrowser.css'],
        nope : ['/js/polyfills/lawnchair.js', '/js/cookies.js', '/css/oldbrowser.css']
      }
    ]);

Any forks and stuff are welcome.

##Current Released Version##

1.5.4

(NOTE:: there were some problems with 1.5.0 in IE, we strongly suggest an upgrade to 1.5.3+)

Changes in 1.5+ :

* Scripts with the same url don't reexecute, but their callbacks fire in the correct order.
* The `complete` function behaves much more like the `callback` function with respect to 'recursive yepnope'.
* CSS load callbacks were taken out by default and put in an official plugin. Too few people used it. Old code will still work, callbacks just fire immediately on CSS (unless css load plugin is included).
* We exposed `yepnope.injectJs` and `yepnope.injectCss` in order to give you direct access to the injection functions.
* We added the ability to use key/value pairs in prefixes.
* We added a builtin prefix for overriding the global `yepnope.errorTimeout` with a specific timeout per script. `yepnope('timeout=5000!script.js');`
* We smarten'd up detection of CSS files even if there are query parameters (without the use of the `css` prefix plugin)
* We added the ability to write filters and prefixes that add arbitrary attributes on the eventual script and link tags.
* We removed the old and busted `demo/` folder since we just use the `tests` folder for everything.
* We just assume you have uglifyjs if you're running our `compress` script.

NOTE: the code in the github repository is considered in development. Use at your own risk. The download buttons will link to our current release version.

##License##

All of the yepnope specific code is under the WTFPL license. Which means it's also MIT and BSD (or anything you want). However, the inspired works are subject to their own licenses.

All contributions to yepnope should be code that you wrote, and will be subject to the Dojo CLA. By sending a pull request, you agree to this. All commits thus far have also been committed under this license.

##Thanks##

Dave Artz       - A.getJS was a huge code-inspiration for our loader. So he's responsible for a ton of awesome techniques here.

Kyle Simpson    - He is the creator of LABjs of which a lot of this is inspired by.

Stoyan Stefanov - His work on resource preloading has been awesome: (http://www.phpied.com/preload-cssjavascript-without-execution/)[http://www.phpied.com/preload-cssjavascript-without-execution/]

Steve Souders   - His evangelism and work in the space (ControlJS) have brought light to the issues at hand, he is the father of front-end performance.

Paul Irish      - Thanks or whatever.
