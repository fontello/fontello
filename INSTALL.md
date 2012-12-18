installation instruction

## Install node.js

Install build dependencies of node:

    sudo apt-get install build-essential libssl-dev
    sudo apt-get install git curl
    git clone git://github.com/creationix/nvm.git ~/.nvm

Add following code into the end of your shell startup script (`.bashrc` for BASH):

    if [ -s "$HOME/.nvm/nvm.sh" ] ; then
        . ~/.nvm/nvm.sh # Loads NVM into a shell session.
    fi

Reopen terminal. Install node (long), and set default version:

    nvm install v0.8.16
    nvm alias default 0.8

## Install Fontello

Install fontello sources & dependencies:

    sudo apt-get install zip inotify-tools
    git clone git://github.com/fontello/fontello.git
    cd fontello
    git submodule init
    git submodule update
    npm install

Compile font-builder binaries (ttf2eot & ttfautohint), and install dependencies

    cd support/font-builder
    sudo make dev-deps
    make support

Rename example configs in `./config/` folder to real files, and edit, if needed.


## Run Fontomas server

In dev, with auto-restart on files change:

    make dev-server

Now you can point your browser to the page http://localhost:3000


## Rebuilding embedded fonts

Detailed description will be added soon.

    make rebuild-fonts
