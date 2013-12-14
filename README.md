pinf
====

*Status: DEV*

  * Code License: [UNLICENSE](http://unlicense.org/)
  * Docs License: [Creative Commons Attribution-NonCommercial-ShareAlike 3.0](http://creativecommons.org/licenses/by-nc-sa/3.0/)
  * Mailing list: [groups.google.com/group/pinf](http://groups.google.com/group/pinf)

The `pinf` command implementation used for hoisting PINF-based programs. [NodeJS](http://nodejs.org/) is used as the runtime engine for `pinf`.

### What is PINF?

PINF is a set of specific tools and conventions combined to create a platform that allows for the creation of portable programs implemented by orchestrating diverse packages and services contributed and operated by a distributed community. The `pinf` command is an application used to call PINF-based programs.

PINF enables collaboratively built systems of arbitrary complexity.


Setup
-----

Requirements:

  * OSX `>= 10.8`
  * [NodeJS](http://nodejs.org/) `>= 0.10`
  * [git](http://git-scm.com/) `>= 1.8`

Install:

    sudo npm install -g pinf --tag pre

Test:

    npm install
    export DEBUG=debug  # Optionally enable debug logging
    export TEST=02      # Run only the matching (prefix) test group
    npm test


Usage
-----

Calling local PINF *Programs* (see: [01-SimpleCommandLinePiping](https://github.com/pinf/pinf/tree/master/test/01-SimpleCommandLinePiping)):

    # Output Redirection
    $ pinf say 'Fred:' > fred.txt && pinf color 36 < fred.txt | pinf append ' hello'
    > Fred: hello

    # Streaming
    $ pinf send 3 Hello | pinf color 36 | pinf collect
    > collected: Hello
    > collected: Hello
    > collected: Hello

Calling cloned PINF *Programs* (see: [02-SimpleProvisionFromGithub](https://github.com/pinf/pinf/tree/master/test/02-SimpleProvisionFromGithub)):

    # Clone once and use cached tag on every subsequent run
    $ pinf github.com/pinf/pinf/v1.0.0-pre.3?test/01-SimpleCommandLinePiping/programs/say Hello
    > Hello

    # Clone once and fetch from branch on every subsequent run
    $ pinf github.com/pinf/pinf/master?test/01-SimpleCommandLinePiping/programs/say Hello
    > Hello

    # Automatically buffer streams while provisioning programs
    $ pinf github.com/pinf/pinf/v1.0.0-pre.3?test/01-SimpleCommandLinePiping/programs/send 3 Hello \
    $ | pinf github.com/pinf/pinf/v1.0.0-pre.4?test/01-SimpleCommandLinePiping/programs/color 36 \
    $ | pinf github.com/pinf/pinf/v1.0.0-pre.3?test/01-SimpleCommandLinePiping/programs/collect
    > collected: Hello
    > collected: Hello
    > collected: Hello


TODO
====

Integrate
---------

  * Sample test adapter: https://github.com/vesln/hippie
  * Deploy app: https://github.com/yyx990803/pod
