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

    nvm install v0.6.14
    nvm alias default 0.6

## Install Fontomas

    git clone git://github.com/nodeca/fontomas.git fontomas
    cd fontomas

Then, depending on your installation type, run:

- `npm install` for production
- `make dev-setup` for development

## Run Fontomas server

    make app-start

Now you can point your browser to the page http://localhost:3000

## Rebuilding embedded fonts

Detailed description will be added soon.

    make rebuild_fonts
