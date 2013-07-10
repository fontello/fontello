`responders:<name>` chain unifies incoming data streams, to make
futher processing via generic interface. Generig activities are:

1. Prepare incoming data (http/rpc/bin)
2. Select appripriate way to process (`server_chain` or `server_bin`)
3. Post-process result (serialize, compress and so on)
