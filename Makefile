PROJECT     :=  $(notdir ${PWD})
TMP_PATH    := /tmp/${PROJECT}-$(shell date +%s)

REMOTE_NAME ?= origin
REMOTE_REPO ?= $(shell git config --get remote.${REMOTE_NAME}.url)

FONT_COPY        = bin/font_copy_to_assets.py
BUILD_JS         = bin/build_embedded_fonts_js.py
BUILD_CSS        = bin/build_embedded_fonts_css.py

FONTS_PATH        = assets/fonts
FONTS             = awesome-uni.font entypo iconic-uni.font websymbols-uni.font
SRCFONT_SUBDIRS   = $(addprefix src/,$(FONTS))
SRCFONT_CONFIGS   = $(addsuffix /config.yml,$(SRCFONT_SUBDIRS))
EMBEDDEDJS_PATH   = assets/js/fontomas/embedded_fonts.js
EMBEDDEDJSON_PATH = assets/js/fontomas/embedded_fonts.json
EMBEDDEDCSS_PATH  = assets/css/fontface-embedded.css

help:
	echo "make help		- Print this help"
	echo "make app-start		- Run Fontomas server"
	echo "make rebuild-fonts	- Rebuild embedded fonts"
	echo "make dev-setup		- Install deps for development"
	echo "make lint		- Lint sources with JSHint"
	echo "make gh-pages		- Build and push the project into gh-pages branch"


app-start:
	node ./index.js


rebuild-fonts:
	for subdir in $(SRCFONT_SUBDIRS); do \
		$(FONT_COPY) -c "$${subdir}/config.yml" -o "$(FONTS_PATH)"; \
	done;
	$(BUILD_JS) -i $(FONTS_PATH) \
		-o $(EMBEDDEDJS_PATH) \
		$(SRCFONT_CONFIGS)
	$(BUILD_JS) -i $(FONTS_PATH) \
		-o $(EMBEDDEDJSON_PATH) \
		--json \
		$(SRCFONT_CONFIGS)
	$(BUILD_CSS) -o $(EMBEDDEDCSS_PATH) \
		$(SRCFONT_CONFIGS)

dev-setup:
	rm -rf node_modules
	npm install
	npm install -g jshint


lint:
	if test ! `which jshint` ; then \
		echo "You need 'jshint' installed in order to run lint." >&2 ; \
		exit 128 ; \
		fi
	jshint . --show-non-errors


gh-pages:
	@if test -z ${REMOTE_REPO} ; then \
		echo 'Remote repo URL not found' >&2 ; \
		exit 128 ; \
		fi
	cp -r ./ ${TMP_PATH} && \
		touch ${TMP_PATH}/.nojekyll
	cd ${TMP_PATH} && \
		git init && \
		git add . && \
		git commit -q -m 'refreshed at gh-pages'
	cd ${TMP_PATH} && \
		git remote add remote ${REMOTE_REPO} && \
		git push --force remote +master:gh-pages 
	rm -rf ${TMP_PATH}

todo:
	grep 'TODO' -n -r ./lib 2>/dev/null || test true


.PHONY: help app-start rebuild-fonts dev-setup lint gh-pages todo
.SILENT: help app-start rebuild-fonts dev-setup lint todo
