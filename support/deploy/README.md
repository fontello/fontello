### Install fontello

```sh
# install docker & tools
sudo apt-get update
sudo apt-get install docker.io docker-compose git mc

# enable docker service for auto restarts
sudo systemctl enable docker

# create empty directory for docker-compose
git clone https://github.com/fontello/fontello.git

# start server
cd fontello/support/deploy
docker-compose up -d
```

### Update sources

```sh
cd fontello/support/deploy

docker-compose build
docker-compose down
docker-compose up -d

# Cleanup:
# - remove anonymous volumes (but keep named), 3 currently used volumes will error out
# - remove all stopped containers (they are usually removed automatically)
# - remove all unused and untagged images

docker volume rm $(docker volume ls -q | awk '$0 !~ /[^0-9a-f]/ && length($0) == 64 { print }')
docker container prune
docker image prune
```

### Run on localhost

Fontello binds on `https://fontello.com` by default, override it using env variables like this:

```sh
PROTO=http HOST=localhost docker-compose up
```
