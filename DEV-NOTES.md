Developers Notes
----------------

You can run font generator manually from command line:

    ./bin/generate_font.sh FONTNAME TMPDIR ZIPBALL

- `FONTNAME`: generated font filename
- `TMPDIR`:   path where `config.json` (with user config) is placed
- `ZIPBALL`:  output archive with generated font and demo


If you are debugging font merger or builder, you might want to generate
*generator config* manually on base of user config (you can get it from the
generated zipball):

    ./fontello.js font_config --input config.json --output builder-config.json
