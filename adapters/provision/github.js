
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


	function makeRequest(credentials, uri, options, callback) {
		if (/\?/.test(uri)) {
			if (!/&$/.test(uri)) uri += "&";
		} else {
			uri += "?";
		}
		var url = "https://api.github.com" + uri + "per_page=100&access_token=" + credentials.token;
		function fetchPage(url, callback) {
			var data = [];
			return REQUEST({
				url: url,
				headers: {
					"User-Agent": "nodejs/request"
				},
				json: true
			}, function (err, res, body) {
				if (err) return callback(err);
				var links = {};
				if (res.headers.link) {
					res.headers.link.split(",").map(function(link) {
						var m = link.match(/^<([^>]*)>; rel="([^"]*)"$/);
						if (m) {
							links[m[2]] = m[1];
						}
					});
				}
				if (body) {
					if (res.statusCode !== 200) {
						console.error("RESPONSE", body);
						var err = new Error("Url '" + url + "' returned with status: " + res.statusCode);
						err.code = res.statusCode;
						return callback(err);
					}
					data.push(body);
				} else {
					console.error(body);
				}
				if (data.length === options.pages) {
					return callback(null, data[0]);
				}
				if (links.next) {
					return fetchPage(links.next, function(err, _data) {
						if (err) return callback(err);
						data = data.concat(_data);
						return callback(null, data);
					});
				}
				return callback(null, data);
			});
		}
		return fetchPage(url, callback);
	}


	function ensureAuthorized(callback) {
		var credentialsPath = PATH.join(context.getAbsolutePath("cachePath"), "credentials.json");
		function getCredentials(callback) {
			return FS.exists(credentialsPath, function(exists) {
				if (!exists) return callback(null, null);
				return FS.readJson(credentialsPath, callback);
			});
		}
		return getCredentials(function(err, credentials) {
			if (err) return callback(err);
			if (credentials) return callback(null, credentials);
			return Q.fcall(function() {
				// Ask user to authenticate with github using browser.
				var deferred = Q.defer();
		        var shasum = CRYPTO.createHash("sha1");
		        shasum.update(Math.random() + ":" + Date.now());
		        var id = shasum.digest("hex");
				var profile = "pinf";
		        console.log("Opening 'auth.sourcemint.org' in browser to authenticate profile '" + profile + "'.");
				HELPERS.exec("open 'http://auth.sourcemint.org/request?service=github&profile=" + profile + "&id=" + id + "'").fail(deferred.reject);
				var checkCount = 0;
				function check() {
					if (Q.isFulfilled(deferred.promise)) return;
					checkCount += 1;
					REQUEST("http://auth.sourcemint.org/token?id=" + id, function (err, response, body) {
						if (err) {
							console.error(err);
							return deferred.reject(err);
						}
						if (response.statusCode === 403) {
							// Stop trying if we have been for 2 mins.
							if (checkCount > 60 * 2) {
								return deferred.reject(new Error("Authentication is taking too long (> 2 mins). Try again."));
							}
							// Try again in one second.
							setTimeout(check, 1000);
						} else
						if (response.statusCode === 200) {
							try {
								var json = JSON.parse(body);
								console.log("Authentication successful.");
								return deferred.resolve(json);
							} catch(err) {
								err.message += " while parsing: " + body;
								return deferred.reject(err);
							}
					  	} else {
					  		console.error(response);
							return deferred.reject(new Error("Invalid response."));
					  	}
					});
				}
				check();
				return deferred.promise.then(function(credentials) {
					return Q.nfcall(FS.outputFile, credentialsPath, JSON.stringify(credentials, null, 4)).then(function() {
						return credentials;
					});
				});
			}).then(function(credentials) {
				return callback(null, credentials);
			}).fail(callback);
		});
	}


	return exports;
}
