# alias node:version as node, so we only need to change it in one place
FROM node:12-buster-slim AS node

#
# Stage 1 - ttfautohint
#
FROM node AS make-ttfautohint

RUN apt-get update
# separate command to install git, so it will be re-used from cache for fontello
RUN apt-get install -y --no-install-recommends git ca-certificates
RUN apt-get install -y --no-install-recommends make gcc g++ libc6-dev curl xz-utils file

WORKDIR /root/ttfautohint-build-script
RUN git clone -b v1.8.3.1 -c advice.detachedHead=false \
      https://github.com/source-foundry/ttfautohint-build.git \
      /root/ttfautohint-build-script
RUN make

#
# Stage 2 - install fontello,
# make separate stage so we can rebuild it individually
#
FROM node AS make-fontello

RUN apt-get update
RUN apt-get install -y --no-install-recommends git ca-certificates

WORKDIR /root/fontello
ENV NODE_ENV=production
ENV NODECA_ENV=production

# `add` command busts docker cache for subsequent `git clone` when there's a new commit
ADD https://api.github.com/repos/fontello/fontello/git/refs/heads/master /root/version.json
RUN git clone https://github.com/fontello/fontello.git /root/fontello

RUN npm i
RUN ./server.js assets
RUN rm -rf /root/fontello/.git

#
# Stage 3 - final image
#
FROM node AS fontello

COPY --from=make-ttfautohint /root/ttfautohint-build/local /usr
COPY --from=make-fontello /root/fontello /app
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

ENV NODECA_ENV=production
WORKDIR /app
EXPOSE 80
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ./server.js
