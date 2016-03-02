Fontello installation instruction
=================================

This project requires Ubuntu 12.04 LTS, but it can probably work on a
more recent version, Debian and other OS-es. However, it's not tested anywhere else
and support is not provided. If you wish, you can send patches that improve compatibility.


## MongoDB

https://docs.mongodb.org/master/tutorial/install-mongodb-on-ubuntu/

Follow instructions from link above.

If you don't use db auth - no mode actions needed. If you plan to use
it - create database and set login/password.


## node.js

You need node.js 4.+. Instructions below are for Ubuntu.

Install build dependencies of node:

    sudo apt-get install build-essential libssl-dev
    sudo apt-get install git curl
    git clone git://github.com/creationix/nvm.git ~/.nvm

Install nvm https://github.com/creationix/nvm

Reopen terminal. Install node (long), and set default version:

    nvm install 4
    nvm alias default 4


## Fontello

Install fontello sources & dependencies:

    sudo apt-get install zip
    git clone git://github.com/fontello/fontello.git
    cd fontello
    git submodule init
    git submodule update
    npm install

Rename appropriate example configs in `./config/` folder to real files,
and edit, if needed.


## ttfautohint

This is optional. Fontello will work without ttfautohint, just don't enable
hinting options in font settings (it's off by default).

You need ttfautohint v1.1, searchable via PATH.

For MAC install, look info at http://www.freetype.org/ttfautohint/#download

For Ubuntu 12.04, run this script from fontello folder:

   ./support/ttfautohint-ubuntu-12.04.sh


## Run Fontello server

From command line, in fontello folder:

    ./fontello.js

Now you can point your browser to the page http://localhost:3000


## Rebuilding embedded fonts

If you update fonts in `./support` folder, run

    make rebuild
