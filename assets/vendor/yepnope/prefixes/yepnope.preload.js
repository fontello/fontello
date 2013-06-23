/**
 * yepnope.js preload prefix
 *
 * by Alex Sexton
 *
 * Use the prefix! modifier to cache content but not execute it
 */
yepnope.addPrefix( 'preload', function ( resource ) {
  resource.noexec = true;
  return resource;
});
