# Assuming `PINF_EPOCH === "default"`.
# This will setup the default environment used as a base for each individual temporary test environment.
pinf say ArBiTrArY
# This will clone a test repository into the default environment so each individual temporary test environment does not need to clone it again.
pinf github.com/pinf/pinf/v0.6.0-pre.1?test/01-SimpleCommandLinePiping/programs/say ArBiTrArY