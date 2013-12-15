
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
			id: uri.id,
			did: uri.did,
			uid: uri.uid,
			selector: uri.selector,
			streamid: uri.streamid,
			dstreamid: uri.dstreamid
		});

		exports.clone = function(callback) {

			return require.async("../clone/git.js", function(adapter) {

				var gitUri = "git@github.com:" + uri.uid.split("/").slice(1).join("/") + ".git";

				// TODO: Put `gitUri` into `context.cloneUri` instead of extra argument.
				return adapter.clone(context, gitUri, callback);
			}, callback);
		}

		exports.export = function(callback) {

			return require.async("../export/git.js", function(adapter) {

				return adapter.export(context, callback);
			}, callback);
		}

		exports.install = function(callback) {

			return require.async("../install/npm.js", function(adapter) {

				return adapter.for(context).install(callback);
			}, callback);
		}

		exports.distribute = function(callback) {

			return require.async("../distribute/program.js", function(adapter) {

				return adapter.for(context).distribute(callback);
			}, callback);
		}

		return exports;
	}

	return callback(null, uri);
}
