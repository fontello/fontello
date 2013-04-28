Fontello - icon font scissors
=============================

[![Build Status](https://travis-ci.org/fontello/fontello.png)](https://travis-ci.org/fontello/fontello)

Website: [fontello.com](http://fontello.com/)

This tool lets you combine icon webfonts for your own project. With fontello you can:

1. shrink glyph collections, minimizing font size
2. merge symbols from several fonts into a single file
3. access large sets of professional-grade open source icons

Now it's trivial to make a custom icon webfont, exactly for your needs.
First, select the icons you like. Then update glyph codes (optional), and
download your webfont bundle. We generate everything you need, ready for publishing
on your website!

Don't forget about donations :)


## Compatibility

1. Desktop is fully supported. IE6-7 requires alternate CSS.
2. Mobiles - all modern systems work without problems. There are limits on very old androids
   and rare browsers. Also, Windows Mobile IE9 sucks, as IE  usually does :) . See
   [details](http://blog.kaelig.fr/post/33373448491/testing-font-face-support-on-mobile-and-tablet).


## Embedded Fonts <a name="embedded"></a>

Fontello comes with the following embedded set of icon fonts:

- [__Entypo__](http://www.entypo.com/) by Daniel Bruce (CC BY-SA license)
- [__Font Awesome__](http://fortawesome.github.com/Font-Awesome//) by Dave Gandy (CC BY-SA license)
- [__Iconic__](https://github.com/somerandomdude/Iconic) by P.J. Onori (SIL OFL)
- [__Typicons__](http://typicons.com/) by Stephen Hutchings (CC BY-SA 3.0 license)
- [__Modern Pictograms__](http://thedesignoffice.org/project/modern-pictograms/) by John Caserta (SIL OFL)
- [__Meteocons__](http://www.alessioatzeni.com/) by Alessio Atzeni (SIL OFL)
- [__Fontelico__](https://github.com/fontello/fontelico.font) by... all :) (SIL OFL)
- [__Web Symbols__](http://www.justbenicestudio.com/studio/websymbols/) by Just Be Nice studio (SIL OFL)
- [__Brandico__](https://github.com/fontello/brandico.font) by... all :) (SIL OFL)

Please, note that these embedded fonts differ from the original files. We did some
modifications to unify characteristics such as scale, ascent/descent and alignment.


## Developers API

Fontello allows easy scripting, to simplify opening you fonts from your existing projects.
Here is example for `Makefile`:

```makefile
FONTELLO_HOST := http://fontello.com
FONT_DIR      := ./assets/vendor/fontello/src

fontopen:
	@if [ ! `which curl` ]; then \
		echo 'Install curl first.' >&2; \
	fi

	curl -s -S -o .fontello -d @${FONT_DIR}/config.json ${FONTELLO_HOST}/
	x-www-browser ${FONTELLO_HOST}/`cat .fontello`

fontsave:
	echo 'coming soon...'
```

### API methods

1. POST request with config.json to `http://fontello.com/` creates session and
   return you `session_id`. Session is stored for 24h. Every POST request creates
   new session.
2. Opening page at address to `http://fontello.com/<session_id>` gives you fontello
   with config, that you posted before. 

Download support will be added soon.


## Contacts

- Questions: [Google group](https://groups.google.com/group/fontello/)
- Bug reports: [Issue tracker](https://github.com/nodeca/fontomas/issues)
- Suggestion for adding your OFL fonts or other collaborations: vitaly@rcdesign.ru


## Authors

- Roman Shmelev ([shmelev](https://github.com/shmelev))
- Vitaly Puzrin ([puzrin](https://github.com/puzrin)).
  [Follow](https://twitter.com/puzrin) on twitter.
- Aleksey Zapparov ([ixti](https://github.com/ixti)).
  [Follow](https://twitter.com/zapparov) on twitter.
- Evgeny Shkuropat ([shkuropat](https://github.com/shkuropat)).


## License

Fontello's code (all files, except fonts) is distributed under MIT license. See
[LICENSE](https://github.com/fontello/fontello/blob/master/LICENSE) file for details.

Embedded fonts are distributed under their primary licenses (SIL OFL / CC BY / CC BY-SA).
See section [Embedded Fonts](#embedded) above for credits & links to font homepages.

Generated fonts are intended for web usage, and should not be
considered/distributed as independent artwork. Consider fontello a
font archiver and credit original font creators according to their respective license.

Crediting fontello is not required :)
