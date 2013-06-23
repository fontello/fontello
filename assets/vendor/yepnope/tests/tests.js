if ( ! window.console ) {
  window.console = {
    log : function( msg ) {
    }
  };

};
(function( w ) {

  var rgbRegex = /rgb\((\d+),\s?(\d+),\s?(\d+)\)/;

  function cssIsLoaded(rgb, cb) {
    var $elem = $('#item_' + rgb.join(''));

    if (!$elem.length) {
      $elem = $('<div id="item_' + rgb.join('') + '">&nbsp;</div>');
      $('#cssTests').append($elem);
    }

    // Let the reflow occur, or whatever it would be called here.
    setTimeout(function(){
      // Right now we took this out of core. So just fake these for now.
      // We'll add in logic soon for if the plugin is there to actually test this.

      var color = $elem.css('color'),
          matches = rgbRegex.exec( color ),
          result = true;
      if ( matches ) {
        matches.shift();
        $.each(matches, function( i, v ) {
          if ( result ) {
            result = rgb[i] == matches[i];
          }
        });
        cb(result);
      } else if (/#(\w+)/.test( color )) {
        cb( color.toLowerCase() == '#' + ($.map(rgb, function( v, i ) {
          return  v.toString(16);
        }).join('').toLowerCase()) );

      } else {
        cb(false);
      }
    }, 0);
  }

  var timeout   = 25000,
      rgb       = function (){
        return (function( i ){
          var a = [];
          while ( i-- ) a.push( Math.floor( Math.random() * 255 ) );
          return a;
        })(3);
      },
      u         = (+new Date);

  module("Input Support")
  asyncTest("Accept as many input types as possible", 8, function() {
    ++u;

    // single string
    yepnope("js/a"+u+".js");
    // since we'd like to test just single string input, give the test for the existence of this one a long
    // wait time and then a check. This isn't foolproof (could show false-positives), but worthwhile for making
    // sure that a common practice is well-supported. Increase the timeout if you have slow internet connection, etc.
    setTimeout(function(){
      ok( w['a'+u], "Single string*");
    }, 3000); // 3 seconds of leeway

    // array of strings
    yepnope(['js/b'+u+'.js', 'js/c'+u+'.js']);
    setTimeout(function(){
      ok( w['b'+u] && w['c'+u], "Array of strings*");
    }, 3000);

    // single object
    yepnope({
      load: 'js/d'+u+'.js',
      callback: function() {
        ok(w['d'+u], "Single Object (with `load` keyword)");
      }
    });

    // single object (with both keyword instead)
    yepnope({
      both: 'js/e'+u+'.js',
      callback: function() {
        ok(w['e'+u], "Single Object (with `both` keyword)");
      }
    });

    // single object with array of strings inside
    yepnope({
      load: ['js/f'+u+'.js', 'js/g'+u+'.js'],
      complete: function() {
        ok(w['f'+u] && w['g'+u], "Single object with array of strings inside");
      }
    });

    // array of objects
    yepnope([{
      load: 'js/sleep-1/h'+u+'.js'
    },
    {
      load: 'js/i'+u+'.js',
      callback: function() {
        ok(w['h'+u] && w['i'+u], "Array of objects (forces order)");
      }
    }]);

    // mixed array of strings and objects
    yepnope(['js/j'+u+'.js', {
      load: 'js/sleep-1/k'+u+'.js', // use the sleep like the crappy timeout hack to test the string
      callback: function() {
        ok(w['j'+u] && w['k'+u], "Mixed array of strings and objects*");
      }
    }]);

    // array of objects with array of strings inside
    yepnope([{
      load: ['js/l'+u+'.js', 'js/m'+u+'.js'],
      complete: function() {
        ok(w['l'+u] && w['m'+u], "Array of objects with array of strings inside");
      }
    }]);

    // We do not intentionally support any deeper nesting than this of arrays and objects, but won't actively prevent it.

    // Since we're using crappy logic to test the single string loads, we have to start the tests crappily as well
    setTimeout(function(){
      start();
    }, 6000);
  });

  module("Asynchronous Script Loading")
  asyncTest("Execution Order", 1, function() {
    ++u;

    // In this case we'd want d to wait for c before executing, most user friendly default
    // use 'immediate' flag to avoid
    yepnope([{
      load: 'js/sleep-3/c'+u+'.js'
    },
    {
      load: 'js/d'+u+'.js',
      callback: function() {
        ok(w['c'+u] && w['d'+u], "d waited for c to complete.");
      },
      complete: function() {
        start();
      }
    }]);
  });

  asyncTest("Don't reexecute scripts (after onload has fired)", 8, function() {
    ++u;
    yepnope({
      load: 'js/c'+u+'.js',
      callback : function (url, res, idx) {
        ok(w['c'+u], 'c exists as expected');
        ok(url === 'js/c'+u+'.js', 'url returned correctly.');
        ok(res === false, 'res returned correctly.');
        ok(idx === 0, 'idx returned correctly.');
        // set it to something else
        w['c'+u] = -5;
        // load the same thing again
        yepnope({
          load: 'js/c'+u+'.js',
          callback : function (rl, r, i) {
            ok(w['c'+u] === -5, 'c wasnt overwritten again in the second include.');
            ok(rl === 'js/c'+u+'.js', 'rl returned correctly.');
            ok(r === false, 'r returned correctly.');
            ok(i === 0, 'i returned correctly.');
          }
        });
      },
      complete : function () {
        start();
      }
    });
  });

  asyncTest("Don't reexecute scripts (between onload and injection)", 8, function() {
    ++u;
    // inject a script that takes 2 seconds
    yepnope({
      load: 'js/sleep-2/c'+u+'.js',
      test : true,
      callback : function (url, res, idx) {
        ok(w['c'+u], 'c exists as expected');
        ok(url === 'js/sleep-2/c'+u+'.js', 'url returned correctly.');
        ok(res === true, 'res returned correctly.');
        ok(idx === 0, 'idx returned correctly.');
        // set it to something else
        w['c'+u] = -4;
        // load the same thing again
      }
    });
    // Inject it again right away (while it's preloading)
    yepnope({
      load: {
        lol: 'js/sleep-2/c'+u+'.js'
      },
      callback : {
        lol : function (url, res, idx) {
          ok(w['c'+u] === -4, 'c exists as expected');
          ok(url === 'js/sleep-2/c'+u+'.js', 'url returned correctly.');
          ok(res === false, 'res returned correctly.');
          ok(idx === 'lol', 'idx returned correctly.');
        }
      },
      complete: function () {
        start();
      }
    });
  });

  asyncTest("injectJs doesn't fall for the no-reinject", 2, function() {
    ++u;
    // inject a script that takes 2 seconds
    yepnope({
      yep: 'js/sleep-1/x'+u+'.js',
      test : true,
      callback : function (url, res, idx) {
        ok(w['x'+u] > 0, 'x exists as expected');
        // set it to something else
        w['x'+u] = -3;
        // load the same thing again
      }
    });
    setTimeout(function(){
      // Inject it again right away (while it's preloading)
      yepnope.injectJs('js/sleep-1/x'+u+'.js', function () {
        ok( w['x'+u] !== -3 , 'x gets overwritten as expected.');
        start();
      });
    }, 2000);

  });

  asyncTest("Non-recursive loading of a &rarr; b &rarr; c", 3, function() {
    // Increment the unique value per test, so caching doesn't occur between tests
    ++u;

    yepnope([
      {
        load : 'js/sleep-2/a'+u+'.js',
        callback : function( id ) {
          ok( w['a'+u] && !w['b'+u] && !w['c'+u], "a has loaded; not b or c");
        }
      },
      {
        load : 'js/b'+u+'.js',
        callback : function( id ) {
          ok( w['a'+u] && w['b'+u] && !w['c'+u], "a & b have loaded; not c");
        }
      },
      {
        load : 'js/c'+u+'.js',
        callback : function( id ) {
          ok( w['a'+u] && w['b'+u] && w['c'+u], "a, b, and c have loaded");
        },
        complete: function() {
          start();
        }
      }
    ]);
    stop(timeout);
  });

  asyncTest("Recursive loading of d &rarr; e &rarr; f &rarr; g &rarr; h", 5, function() {
    ++u;

    yepnope([
      {
        load : 'js/d'+u+'.js',
        callback : function(url, res, key) {

          ok( w['d'+u] && !w['e'+u] && !w['f'+u] && !w['g'+u] && !w['h'+u], "d has loaded; e,f,g,h have not.");

          yepnope({
            load : 'js/sleep-3/e'+u+'.js',
            callback : function(url, res, key){

              ok( w['d'+u] && w['e'+u] && !w['f'+u] && !w['g'+u] && !w['h'+u], "d,e have loaded; f,g,h have not.");

              yepnope({
                load : 'js/f'+u+'.js',
                callback : function(url, res, key) {

                  ok( w['d'+u] && w['e'+u] && w['f'+u] && !w['g'+u] && !w['h'+u], "d,e,f have loaded; g,h have not.");

                  yepnope({
                    load : 'js/g'+u+'.js',
                    callback : function() {

                      ok( w['d'+u] && w['e'+u] && w['f'+u] && w['g'+u] && !w['h'+u], "d,e,f,g have loaded; h has not.");

                    } // g
                  });
                } // f
              });
            } // e
          });
        } // d
      },
      {
        load : 'js/h'+u+'.js',
        callback : function() {
          // if there was a problem, e would likely not exist yet here, if it does, this likely waited for it.
          ok( w['d'+u] && w['e'+u] && w['f'+u] && w['g'+u] && w['h'+u], "d,e,f,g,h have all loaded");
        },
        complete: function(){
          start();
        }
      }
    ]);
    stop(timeout);
  });

  asyncTest("Yepnope calls within loaded files", 2, function() {
    yepnope({
      load: 'file1.js',
      callback: function(){
        ok( w.file1, 'file1.js has loaded.');
      }
    })
  });


  /** /
  asyncTest("CSS Callback Timing", 4, function() {
    var startTime = (+new Date),
        myrgb = rgb();
    // For good measure, make sure this is always true
    cssIsLoaded(myrgb, function(result) {
      ok(!result, 'CSS is not already loaded.');
    });

    yepnope([
      {
        load : 'css/sleep-3/' + myrgb.join(',') + '.css',
        callback : function() {
          cssIsLoaded(myrgb, function(result) {

            ok(result, 'CSS is loaded at callback runtime.');

          });

        }
      },
      {
        load: "http://ajax.googleapis.com/ajax/libs/jqueryui/1.7.0/themes/trontastic/jquery-ui.css",
        callback: function() {
          console.log( (+new Date) - startTime);
          ok( ((+new Date) - startTime) < 8000, "jQuery UI loaded without fallback");
        },
        complete: function() {
            start();
        }
      }
    ]);

    // Since the load is slept for 3 seconds, it should not exist after 1.5 seconds
    setTimeout(function() {
      cssIsLoaded(myrgb, function(result) {
        ok(!result, 'CSS is not loaded before callback.');
      });
    }, 1500);

    stop(timeout);
  });
  /**/

  asyncTest("Handle resources with request parameters", 2, function() {
    ++u;
    var reqRGB = rgb();

    yepnope({
        load : "js/request" + u + ".js?abc=123",
        callback : function() {
            ok( window["request" + u], "Request parameters ignored on JS successfully");
        }
    });

    yepnope({
        load : 'css/' + reqRGB.join( ',' ) + '.css?abc=456',
        callback : function() {
            cssIsLoaded( reqRGB, function( result ) {
              ok( result, "Request parameters ignored on CSS successfully");
              start();
            });
        }
    });
  });

  module("Caching");
  asyncTest("Don't Load JS Twice", 1, function(){
    ++u;

    yepnope('js/sleep-3/a'+u+'.js');

    // If it caches, it will take 3 seconds and change, if not, it'll take 6 seconds
    setTimeout(function(){
      ok(w['a'+u], "a exists already (was cached)");
      start();
    }, 5500);
  });

  asyncTest("Don't Load CSS Twice", 1, function(){
    ++u;
    var myrgb = rgb();

    yepnope('css/sleep-3/' + myrgb.join( ',' ) + '.css');

    // If it caches, it will take 3 seconds and change, if not, it'll take 6 seconds
    setTimeout(function(){
      cssIsLoaded( myrgb, function( result ) {
        ok( result, "CSS was cached.");
        start();
      });
    }, 5400);
  });

  module("Inner api");
  asyncTest("Key Value Callbacks", 2, function() {
    ++u;

    yepnope([
      {
        load : {
          'myscript-a': 'js/a'+u+'.js',
          'myscript-b': 'js/b'+u+'.js'
        },
        callback : {
          'myscript-a': function() {
            ok( w['a'+u], "a has loaded");
          },
          'myscript-b': function() {
            ok( w['b'+u], "b has loaded");
          }
        },
        complete: function() {
          start();
        }
      }
    ]);
    stop(timeout);
  });



  asyncTest("404 Fallback with callback", 2, function() {
    ++u;
    yepnope([
      {
        load : 'iDoesNotExist',
        callback : function(url, res, key){

          ok( ! w['i'+u], "i returned a 404");

          yepnope({
            load : 'js/i'+u+'.js',
            callback: function() {

              ok( w['i'+u], "i has loaded" );

            },
            complete: function(){
              start();
            }
          })
        }
      }
    ]);
    stop(timeout);
  });

  asyncTest("404 Fallback with complete", 2, function() {
    ++u;
    yepnope([
      {
        // speed this up just a little bit
        load : 'timeout=1000!iDoesNotExist2',
        complete : function(){

          ok( ! w['i'+u], "i returned a 404");

          yepnope({
            load : 'js/i'+u+'.js',
            callback: function() {

              ok( w['i'+u], "i has loaded" );

            },
            complete: function(){
              start();
            }
          })
        }
      }
    ]);
    stop(timeout);
  });

  asyncTest("key/val custom timeout", 3, function() {
    ++u;
    var keyvalStart = (+new Date);
    yepnope([
      {
        load : 'timeout=100!iDoesNotExist3',
        callback : function(url, res, key){

          ok( ! w['i'+u], "i returned a 404");

          yepnope({
            load : 'js/i'+u+'.js',
            callback: function() {

              ok( w['i'+u], "i has loaded" );
              ok( (+new Date) < (keyvalStart + yepnope.errorTimeout), "It took less time than the default timeout." )

            },
            complete: function(){
              start();
            }
          })
        }
      }
    ]);
    stop(timeout);
  });

  
  asyncTest("protocoless urls supported", 1, function() {
    ++u;
    yepnope([
      {
        load : '//' + w.location.hostname + (w.location.port ? ':'+w.location.port : '') + (w.location.pathname.replace('index.html', '')) + 'js/a'+u+'.js',
        callback : function(url, res, key, yepnope){
          ok( w['a'+u], "The correct script was loaded with the // prefix");
        },
        complete: function() {
          start();
        }
      }
    ]);
    stop(timeout);
  });

  module("Supported Plugins")
  asyncTest("Data Attributes", 2, function() {
    ++u;
    yepnope.addPrefix('dataAttr', function (resourceObj, vals){
      if ( vals.length > 1 ) {
        resourceObj.attrs = resourceObj.attrs || {};
        resourceObj.attrs[ 'data-'+vals[0] ] = vals[1];
      }
      return resourceObj;
    });

    // crazay in my nazay
    yepnope({
      load: 'dataAttr=lol=5!js/r'+u+'.js',
      complete: function (){
        ok(w['r'+u], 'It loaded');
        var scr = $('script[src="js/r'+u+'.js"]').not("[type]");
        ok( scr.data('lol') === 5 ,'The script element has the data attribute as described.');
        start();
      }
    });

  });
  asyncTest("IE prefix test", 2, function() {
    ++u;
    yepnope([
      {
        load: 'ie!js/a'+u+'.js',
        callback : function(url, res, key, yepnope){
          // The script uses IE conditionals, so we'll cross check with user-agent... could be bad, idk, good enough for now.
          if ($.browser.msie) {
            ok( w['a'+u], "The browser is IE, and the script was loaded");
          }
        }
      },
      {
        // we need to load another script that _would_ wait if the ie one loaded, and wont wait if it doesn't.
        load: 'js/b'+u+'.js',
        callback: function() {
          // Might as well make sure this script loaded, even though that's already in another test
          ok(w['b'+u], "Other scripts still load after an ie prefixed script.");
          if (!$.browser.msie) {
            ok(!w['a'+u], "The browser is not IE, but the complete callback was called an no script was loaded.");
          }
        },
        complete: function() {
          start();
        }
      }
    ]);
    stop(timeout);
  });
/*
  asyncTest("Preload only", 8, function () {
    var myrgb = rgb();

    ++u;

    ok( !w[ 'a' + u ], "JS Not in the page before hand" );

    cssIsLoaded(myrgb, function(result) {
      ok(!result, 'CSS is not already loaded.');
    });

    yepnope([
    // Do this with JS
    {
      load: "preload!js/sleep-3/a" + u + ".js",
      callback: function () {
        ok( !w[ 'a' + u ], "After callback, js still not executed in the page." );
        var timeStart = (+new Date);
        yepnope({
          load: "js/sleep-3/a" + u + ".js",
          callback: function () {
            var diff = (+new Date) - timeStart;
            ok( diff < 3000, "The js callback didn't have to wait" );
            ok( w[ 'a' + u ], "a successfully executed." );
          }
        });
      }
    } ,
    // Now with CSS
    {
      load: "preload!css/sleep-3/" + myrgb.join(',') + '.css',
      callback: function () {
        cssIsLoaded(myrgb, function(result) {
          ok(!result, 'CSS is not in the page after callback.');
          // force a async, as if it was like a later injection
          setTimeout(function () {
            var timeStart = (+new Date);
            yepnope({
              load: "css/sleep-3/" + myrgb.join(',') + '.css',
              callback: function () {
                var diff = (+new Date) - timeStart;
                ok( diff < 3000, "The css callback didn't have to wait" );
                cssIsLoaded(myrgb, function(result) {
                  ok( result, 'CSS was successfully injected.');
                });
              },
              complete: function () {
                start();
              }
            });
          }, 800 );
        });
      }
    } ]);
    stop(timeout);
  });
*/
  module('Exposed Raw Functions');
  asyncTest("InjectJs", 2, function () {
    ++u;

    ok( ! w['a'+u], 'Script not ' );
    yepnope.injectJs( 'js/a' + u + '.js', function () {
      ok( w['a'+u], 'The script was injected successfully' );
      start();
    });
    stop(timeout);
  });
  asyncTest("InjectCss", 1, function () {
    var myrgb = rgb();
    cssIsLoaded( myrgb, function ( result ) {
      //ok( !result, 'The stylesheet was not previously there.' );
      yepnope.injectCss( 'css/' + myrgb.join( ',' ) + '.css', function () {

        // Putting this test in a setTimeout because we stripped out the
        // CSS callback stuff and moved it to a plugin. The styles are 
        // no longer guaranteed to be applied in the callback, without the
        // plugin.
        setTimeout(function() {
          cssIsLoaded( myrgb, function( result ) {
            ok( result, 'The stylesheet was injected successfully' );
            start();
          });
        }, 100);

      });
    });
    stop(timeout);
  });

  module("CSS Plugin");
  // Load up the plugin
  asyncTest("InjectCss", 2, function () {
    yepnope({
      load : "../plugins/yepnope.css.js",
      complete: function() {
        var myrgb2 = rgb();

        cssIsLoaded( myrgb2, function ( resultA ) {
          ok( !resultA, 'The stylesheet was not previously there.' );
          yepnope({
            load : 'css/' + myrgb2.join( ',' ) + '.css',
            callback : function () {
              cssIsLoaded( myrgb2, function( resultB ) {
                ok( resultB, 'The stylesheet was injected successfully' );
                start();
              });
            }
          });
        });
      }
    });
  });

  module('Last Calls');
  asyncTest("Complete Fires When No Resources Are Loaded", 2, function () {
    ++u;
    var count = 0,
        complete_run = false;

    yepnope({
      test: false,
      yep : 'js/a' + u + '.js',
      callback : function () {
        count++;
      },
      complete : function () {
        complete_run = true;
        ok( !count, 'No callbacks were run on the object with no resources to load.' );
        ok( !w['a'+u], 'The file wasnt loaded. But the complete callback fired anyways.' );
        start();
      }
    });
    stop(timeout/2); // we shouldn't need very long on this one, and it's annoying
  });
})( window )
