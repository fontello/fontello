FONTS         += fontelico.font
FONTS         += awesome-uni.font
FONTS         += entypo
FONTS         += typicons.font
FONTS         += iconic-uni.font
FONTS         += modernpics.font
FONTS         += meteocons.font
FONTS         += mfglabs.font
FONTS         += maki.font
FONTS         += zocial.font
FONTS         += brandico.font
FONTS         += elusive.font
FONTS         += linecons.font
FONTS         += websymbols-uni.font
FONT_CONFIGS   = $(foreach f,$(FONTS),src/${f}/config.yml)

FONT_DIR 			= ./client/lib/embedded_fonts/font

help:
	echo "make help           - Print this help"
	echo "make dev-server     - Run dev server with autoreleat on files change"
	echo "make rebuild        - Rebuild embedded fonts"
	echo "make lint           - Lint sources with JSHint"
	echo "make gh-pages       - Build and push the project into gh-pages branch"


rebuild:
	rm -rf $(FONT_DIR)
	mkdir -p $(FONT_DIR)
	# build single font
	./build_embedded_fonts.js \
		-i $(foreach f,$(FONTS), ./src/${f}) \
		-o $(FONT_DIR)/fontello.svg \
		-c lib/embedded_fonts/client_config.js \
		-s lib/embedded_fonts/server_config.js

	# convert to other formats
	./node_modules/.bin/svg2ttf "$(FONT_DIR)/fontello.svg" "$(FONT_DIR)/fontello.ttf"
	./node_modules/.bin/ttf2woff "$(FONT_DIR)/fontello.ttf" "$(FONT_DIR)/fontello.woff"
	./node_modules/wawoff/bin/woff2_compress.js "$(FONT_DIR)/fontello.ttf" "$(FONT_DIR)/fontello.woff2"
	rm "$(FONT_DIR)/fontello.ttf"
	rm "$(FONT_DIR)/fontello.svg"


repl:
	rlwrap socat ./repl.sock stdin


lint:
	./node_modules/.bin/eslint .


test: lint
	@NODECA_ENV=test NODECA_NOMINIFY=1 ./server.js test


todo:
	grep 'TODO' -n -r ./lib 2>/dev/null || test true




#FONTELLO_HOST ?= http://fontello.com
FONTELLO_HOST ?= http://localhost:3000
FONTELLO_DIR  ?= ./client/lib/icons/src


fontopen:
	@if test ! `which curl` ; then \
		echo 'Install curl first.' >&2 ; \
		exit 128 ; \
		fi
	curl --silent --show-error --fail --output .fontello \
		--form "config=@${FONTELLO_DIR}/config.json" \
		${FONTELLO_HOST}
	x-www-browser ${FONTELLO_HOST}/`cat .fontello`


fontsave:
	@if test ! `which unzip` ; then \
		echo 'Install unzip first.' >&2 ; \
		exit 128 ; \
		fi
	@if test ! -e .fontello ; then \
		echo 'Run `make fontopen` first.' >&2 ; \
		exit 128 ; \
		fi
	rm -rf .fontello.src .fontello.zip
	curl --silent --show-error --fail --output .fontello.zip \
		${FONTELLO_HOST}/`cat .fontello`/get
	unzip .fontello.zip -d .fontello.src
	rm -rf ${FONTELLO_DIR}
	mv `find ./.fontello.src -maxdepth 1 -name 'fontello-*'` ${FONTELLO_DIR}
	rm -rf .fontello.src .fontello.zip



.PHONY: help rebuild dev-setup lint gh-pages todo dev-server repl fontopen
.SILENT: help rebuild dev-setup lint todo
