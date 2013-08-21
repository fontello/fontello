Fontello installation instruction
=================================

This project requires Ubuntu 12.04 LTS. But it probabply can work on
more fresh version, Debian and other OS-es. Hovever, it's not tested anywhere else,
and support is not provided. If you wish, you can send patches, that improve compatibility.


## MongoDB

http://docs.mongodb.org/manual/tutorial/install-mongodb-on-debian-or-ubuntu-linux/

Follow instructions on link above. Then edit `/etc/mongodb.conf`,
add `bind_ip = 127.0.0.1` to the start.

    restart mongodb

If you don't use db auth - no mode actions needed. If you plan to use
it - create database and set login/password.


## node.js

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
    make dependencies

Rename example configs in `./config/` folder to real files, and edit, if needed.

Note(!) `make dependencies` just try to install ttfautohint. That's for Ubuntu and Debian.
For mac & win - just install manually from original website http://www.freetype.org/ttfautohint/
and make sure, that it's in your PATH.


## Run Fontello server

In dev, with auto-restart on files change:

    make dev-server

Now you can point your browser to the page http://localhost:3000


## Rebuilding embedded fonts

Detailed description will be added soon.

    make rebuild
