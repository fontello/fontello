2.0.2 / Rolling on website
--------------------------

* Added configuration import/export
* Improved CSS generation
  - use escaped chars when possible (for codes <= 0xFFFF)
  - add encoding (first line) only when needed
* Added README & LICENCE files to generated webfonts
* Added css file without fontface, for automated assets build systems
* Optimized demo (reduced files count)
* Minor UI tweaks (inputs, buttons)
* Fixed server stability issues (increased open descriptors limit)
* Migrated to node.js v0.8

2.0.1 / 2012-06-03
--------------------------

* Reworked interface logic & look
* Added search
* Added multiselect (click+drag)
* Added field to select file name
* Autosave for all changes
* Number of small fixes
* Internal refactoring (continue switching to new nodeca libraries)
* Returned back WebSymbols font
* Added Modern Pictograms font
* Added Typicons font


2.0.0 / 2012-05-08
------------------

* Uses new [Font Builder](https://github.com/fontello/font-builder) system
  - All your files in single archive - no needs to use fontsquirrel generator.
  - Better glyphs mapping: follow Unicode 6.1 standard where possible.
  - Embedded fonts realligned to middleline of small letters.
  - Integrated ttfautohint, to significantly improve hinting.
* Added `Font Awesome`
* Added `Brandico`
* Removed `WebSymbols`
* Editable glyph codes.
* Auto-generated CSS for bootstrap.
* Nice preview tab & auto-generated demo-page.
* Using @fonf-face instead of cufon to display glyths - mush better quality.
* Removed external font loading, until we do something better.


0.0.1 / 2012-02-23
------------------

* First release
