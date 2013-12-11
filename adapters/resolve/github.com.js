
;require("require.async")(require);

const HELPERS = require("../../lib/helpers").for(module);


exports.canResolve = function(uri) {
	if (/(?:^|\.)github\./.test(uri.hostname)) {
		return true;
	}
	return false;
}

exports.resolve = function(uri, callback) {
	if (!exports.canResolve(uri)) {
		return callback(new Error("Cannot resolve uri '" + uri + "'!"));
	}

	uri.for = function(context) {
		var exports = {};

		// Add a package context.
		context = context.copy({
			uid: uri.uid,
			did: uri.did
		});

		exports.clone = function(callback) {
			return require.async("../clone/git.js", function(adapter) {

				var gitUri = "git@github.com:" + uri.id.split("/").slice(1).join("/") + ".git";

				return adapter.clone(context, gitUri, callback);
			});
		}

		return exports;
	}

	return callback(null, uri);
}
