pinf
====

*Status: DEV*

  * Code License: [UNLICENSE](http://unlicense.org/)
  * Docs License: [Creative Commons Attribution-NonCommercial-ShareAlike 3.0](http://creativecommons.org/licenses/by-nc-sa/3.0/)
  * Mailing list: [groups.google.com/group/pinf](http://groups.google.com/group/pinf)
  * Test Coverage: Striving for 100%

The `pinf` command implementation used for hoisting PINF-based programs. [NodeJS](http://nodejs.org/) is used as the runtime engine for `pinf`.

### What is PINF?

PINF is a set of specific tools and conventions combined to create a platform that allows for the creation of portable programs implemented by orchestrating diverse packages and services contributed and operated by a diverse community. The `pinf` command is an application used to call PINF-based programs.

PINF enables collaboratively built systems of arbitrary complexity.


Install
-------

	sudo npm install -g pinf --tag pre

Test:

	npm test


Usage
-----

Calling PINF *Programs* (see: [01-SimpleCommandLinePiping](https://github.com/pinf/pinf/tree/master/test/01-SimpleCommandLinePiping)):

	$ pinf say 'Fred:' > fred.txt && cat fred.txt | pinf color 36 | pinf append ' hello'
	> Fred: hello


TODO
====

Integrate
---------

  * Sample test adapter: https://github.com/vesln/hippie
  * Deploy app: https://github.com/yyx990803/pod
