
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
			duid: uri.duid,
			selector: uri.selector
		});

		exports.clone = function(callback) {

			return require.async("../clone/git.js", function(adapter) {

				var gitUri = "git@github.com:" + uri.uid.split("/").slice(1).join("/") + ".git";

				return adapter.clone(context, gitUri, callback);
			}, callback);
		}

		return exports;
	}

	return callback(null, uri);
}
