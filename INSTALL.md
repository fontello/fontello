Fontello installation instruction
=================================

This project requires Ubuntu 12.04 LTS, but it can probably work on a
more recent version, Debian and other OS-es. However, it's not tested anywhere else
and support is not provided. If you wish, you can send patches that improve compatibility.


## MongoDB

http://docs.mongodb.org/manual/tutorial/install-mongodb-on-debian-or-ubuntu-linux/

Follow instructions on link above. Then edit `/etc/mongodb.conf`,
add `bind_ip = 127.0.0.1` to the start.

    restart mongodb

If you don't use db auth - no mode actions needed. If you plan to use
it - create database and set login/password.


## node.js

You need node.js 0.10.xx. Unstructions below are for Ubuntu.

Install build dependencies of node:

    sudo apt-get install build-essential libssl-dev
    sudo apt-get install git curl
    git clone git://github.com/creationix/nvm.git ~/.nvm

Add following code into the end of your shell startup script (`.bashrc` for BASH):

    if [ -s "$HOME/.nvm/nvm.sh" ] ; then
        . ~/.nvm/nvm.sh # Loads NVM into a shell session.
    fi

Reopen terminal. Install node (long), and set default version:

    nvm install 0.10
    nvm alias default 0.10


## Fontello

Install fontello sources & dependencies:

    sudo apt-get install zip inotify-tools
    git clone git://github.com/fontello/fontello.git
    cd fontello
    git submodule init
    git submodule update
    npm install

Rename example configs in `./config/` folder to real files, and edit, if needed.


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

In dev, with auto-restart on files change:

    make dev-server

Now you can point your browser to the page http://localhost:3000


## Rebuilding embedded fonts

If you update fonts in `./support` folder, run

    make rebuild
