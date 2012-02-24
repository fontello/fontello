Fontomas - iconic fonts scissors
================================

[Run right now in your browser!](http://nodeca.github.com/fontomas/) This tool
helps to combine iconic webfonts for your project. With fontomas you can:

1. make a limited symbols subset, with reduced font size
2. merge symbols from several sources to single file
3. remap symbol codes & even make them compatible with book readers

No installation needed - only modern browser. Now it's trivial to customise
fonts for your needs with 3 simple step. At first, you select needed symbols
on source fonts. Then rearrange those on destination font. After that, you can
download SVG font and make webpack via [fontsquirrel generator](http://www.fontsquirrel.com/fontface/generator)
or other services.

(*) Currently we support loading only SVG fonts & [Cufon files](http://cufon.shoqolate.com/generate/).
Other formats will be available, when we implement server-side scripts.

## Embedded Fonts

For your convenience, Fontomas comes with wonderful embedded iconic fonts:

- __Entypo__ (rescaled) - http://www.entypo.com/ (CC BY-SA license)
- __Iconic__ - https://github.com/somerandomdude/Iconic (SIL OFL)
- __Web Symbols__ - http://www.justbenicestudio.com/studio/websymbols/ (SIL OFL)

See details on fonts homepages. Of cause, you can add more fonts if you wish.
Entypo is rescaled to ascent/descent, to have the same allignement as other fonts.


## We need your help!

We like idea to use iconic fonts on web, and we try to make convenient font
tools for end users. But we are not designers. If you can help us with creating
high quality iconic fonts, please, contact vitaly@rcdesign.ru .


## Discuss

- User's questions: [Google group](https://groups.google.com/group/fontomas-project/)
- Bug reports: [Issue tracker](https://github.com/nodeca/fontomas/issues)


## Authors

- Roman Shmelev ([shmelev](https://github.com/shmelev))
- Vitaly Puzrin ([puzrin](https://github.com/puzrin))

This progect is sponsored by [Nodeca](https://github.com/nodeca) - open source
forum software on node.js engine.


## License

Fontomas code (all files, except fonts) is distributed under MIT licence. See
[LICENSE](https://github.com/nodeca/fontomas/blob/master/LICENSE) file for details.

Embedded fonts are distributed unter their primary licences (SIL OFL / CC BY-SA).
See section `Embedded Fonts` above for credits & links to fonts homepages.

Generated fonts are intended for web usage, and should not be
considered/distributed as `independed` artwork. Please, credit original font authors.
Credits to Fontomas not required :)
