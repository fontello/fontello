8.0.0 / WIP
------------------

- Requires node.js 8+ now (with webassembly support).
- Nodeca core resync.
- ttf2woff2 -> wawoff2.


7.1.0 / 2017-05-27
------------------

- svg2ttf bump, #607.
- fontello.js -> server.js.
- Resync nodeca core (new loader.js + minor changes).
- FontAwesome update to 4.7.
- formidable -> built-in multipart POST data parser.
- jade -> pug.
- Fix CSS 3-ditits codes, #521.
- relax api tests - remove copyright year before svg compare.
- Various code cleanups.


7.0.0 / 2016-10-20
------------------

- Reduce requirements - replaced MondoDB with local leveldb.
- Use leveldb to stoge generated files.
- Autoclear old data (generated results & sessions).
- Do not support forking (it was not used anyway).
- Replace jquery-ui `selectable` with `xselectable`, drop jquery-ui.
- Use only woff/woff2 for site icons.
- Resync nodeca core.


6.0.0 / 2016-08-04
------------------

- Resync core with fresh nodeca sources + deps bump. Now use
  node.js 6.+.
- Added WOFF2 support, #388.
- Added glyphs reorder support, #283, #240.
- Assorted `svg2ttf` (TTF generator) updates: lineGap -> 0, fsType -> 0.
- Accessibility improve, #468.
- Fixed zip import, #426.
- Fixed icon custom codes load from localstore, #500
- Fixed custom glyph unselect on edit call, #497
- Font Awesome update to 4.6.3
- Reorganized configs & folders.


5.3.0 / 2015-11-20
------------------

- Added font smoothing as in TWBS
- Make demo icons "copypasteable".
- Fixed custom icons size in UI if adfanced settings changed.
- FA update to 4.3.0.
- Improved SVG import - transforms & paths merge are applyed automatically.
- Fixed import of empty glyphs (space).
- Use ttfautohint v1.1.


5.2.0 / 2014-06-22
------------------

- FontAwesome update to 4.1.0
- Added font version display if exists
- Other minor fonts updates
- Nodeca core sync
- Dependencies update
- Removed security headers due cross issues


5.1.0 / 2014-02-18
------------------

- Fixed generated CSS with base64 encoded fonts for big files
- Fixed UI inconsistency after config import (improved locks logic)
- Improved drag & drop handling
- Fonts refresh
- Better message on attempt to import TTF/WOFF/OTF
- DB config format change - now use single URI
- Different internal engine & dependencies updates


5.0.1 / 2013-11-02
------------------

- Removed almost all interface animation effects, to make it more responsive
- Fixed config defaults, that caused API problems with old config formats
- Rewritten selected glyphs tracker, now keep glyphs order by selection time
- Updated FontAwesome to 4.0.1
- Glyph options dialog for custom icons
- Added `Help` link
- Changed way to track selection - keep order now
- Increased input width for char codes
- Spelling fixes
- regressions fixes


5.0.0 / 2013-10-07
------------------

- (!) Added custom SVG import support
- Reorganized settings, font metrics can be changed now
- Don't use `fontforge` anymore (build fonts with node js packages)
- Woff fix for uncompressed tables
- Improved restart time (use new `mincer` with better cache)
- Moved client models to separate block
- Migrated to Twitter Bootstrap 3.0
- Code refactoring/cleanup


4.0.1 / 2013-06-26
------------------

- Updated FontAwesome to 3.2.1
- Updated MFG Labs font
- Updated Typicons font to 2.0
- Switched to node v0.10
- Added styles cache (improved restart time)


4.0.0 / 2013-06-02
------------------

- Added easy encoding switch (private use area / text / unicode)
- Added developers API to do scripting for config upload and font download
- Added configurable prefixes fir icon names
- Added persistanse for glyphs size
- Permalinks for search results
- Focus on search field after load
- Added count of selected/searched glyphs for each font
- Added message, when nothing found in search
- Search field now can be cleared by escape
- Better file name filtering (replace invalid chars inplace)
- Improved persistance for all app/font settings
- You can now import config.json without unzipping first
- Import can be done by dropping file to fontello page
- IE8 regressions fixes
- Updated to new (wire-based) nodeca architectire


3.0.0 / 2013-04-01
------------------

- Updated Entypo to 2.0
- Updated Font Awesome to 3.0
- Added Meteocons font
- Added Fontelico font
- Added Elusive font
- Tuned fonts baseline
- Added glyphs tooltips on selector panel
- Added delete buttons on codes editor and names editor
- Improved generated demo (show glyph codes now)
- Added css with base64 woff & ttf fonts, to workaround CORS issues in FF & IE9,
  when you don't wish to set `Access-Control-Allow-Origin` server headers.
- Removed default opacity
- Rearranged toolbar controls, to show `search` better
- Added random number to generated CSS font paths, to avoid cache issues (#127)
- Font collapse state now remembered
- Added `font-variant` & `text-transforms` styles reset (#135)
- New modularized architecture (all as `blocks` + knockout.js on client side)


2.0.4 / 2012-11-06
------------------

- Moved font info from popup to main page, to better credit authors
- Updated brandico with couple of icons
- Minor fixes


2.0.3 / 2012-09-07
------------------

- Preview tab content now resizeable too
- You can edit glyph names
- Codes edit improved
- Fixed EOT fonts generation for customised font names
- Added switchable '3D' shadow effect for icons
- Fixed work with Opera 12
- Tweaked styles again :)
- Improved work with proxies (switched back data exchange from realtime to ajax)
- Optimized page loading speed - merged all embedded fonts into single file
- Synked libraries codebase with nodeca mainstream


2.0.2 / 2012-06-27
------------------

- Added configuration import/export
- Improved CSS generation
  - use escaped chars when possible (for codes <= 0xFFFF)
  - add encoding (first line) only when needed
  - ie7 support
  - plains css with codes only, for automated asset build systems
- Added README & LICENSE files to generated webfonts
- Demo data bundled to single file now
- Minor UI tweaks (inputs, buttons)
- Fixed server stability issues (increased open file descriptors limit)
- Migrated to node.js v0.8


2.0.1 / 2012-06-03
------------------

- Reworked interface logic & look
- Added search
- Added multiselect (click+drag)
- Added field to select file name
- Autosave for all changes
- Number of small fixes
- Internal refactoring (continue switching to new nodeca libraries)
- Returned back WebSymbols font
- Added Modern Pictograms font
- Added Typicons font


2.0.0 / 2012-05-08
------------------

- Uses new [Font Builder](https://github.com/fontello/font-builder) system
  - All your files in single archive - no needs to use fontsquirrel generator.
  - Better glyphs mapping: follow Unicode 6.1 standard where possible.
  - Embedded fonts realligned to middleline of small letters.
  - Integrated ttfautohint, to significantly improve hinting.
- Added `Font Awesome`
- Added `Brandico`
- Removed `WebSymbols`
- Editable glyph codes.
- Auto-generated CSS for bootstrap.
- Nice preview tab & auto-generated demo-page.
- Using @fonf-face instead of cufon to display glyths - mush better quality.
- Removed external font loading, until we do something better.


0.0.1 / 2012-02-23
------------------

- First release
