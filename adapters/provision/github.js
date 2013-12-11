
const PATH = require("path");
const FS = require("fs-extra");
const Q = require("q");
const HELPERS = require("../../lib/helpers").for(module);
const CRYPTO = require("crypto");
const REQUEST = require("./github/node_modules/request");
const GIT = require("./git");


exports.for = function(context) {

	var exports = {};

	exports.provide = function(uri, callback) {

		var ns = uri.id.split("/").slice(1).join("/");

//		return ensureAuthorized(function(err, credentials) {
//			if (err) return callback(err);

			// Ensure we have a local clone of the repository.
			function ensureClone(callback) {
				return FS.exists(context.getAbsolutePath("clonePath"), function(exists) {
					if (exists) return callback(null);
					return GIT.for(context).clone("git@github.com:" + ns + ".git", callback);
				});
			}

			// Ensure we have an exported copy of the repository at the requested selector.
			function ensureInstall(callback) {
				return FS.exists(context.getAbsolutePath("installPath"), function(exists) {
					if (exists) return callback(null);
					return GIT.for(context).export(uri.selector, function(err) {
						if (err) return callback(err);
						return callback(null);
					});
				});
			}

			return ensureClone(function(err) {
				if (err) return callback(err);

				return ensureInstall(function(err) {
					if (err) return callback(err);

					var programPath = PATH.join(context.getAbsolutePath("installPath"), uri.path);
					if (uri.path) {
						return FS.exists(programPath + ".js", function(exists) {
							if (exists) return callback(null, programPath + ".js");
							return callback(null, programPath);
						});
					} else {
						return callback(null, programPath);
					}

/*
			return makeRequest(credentials, "/repos/" + ns + "/branches", {
				pages: 1
			}, function(err, data) {
				if (err) return callback(err);
console.log("data", data);
				return callback(null);
			});
*/
				});
			});
//		});
	}

	return exports;
}
