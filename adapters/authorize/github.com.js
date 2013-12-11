
const PATH = require("path");
const FS = require("fs-extra");
const Q = require("q");
const HELPERS = require("../../lib/helpers").for(module);
const CRYPTO = require("crypto");
const REQUEST = require("request");


exports.authorize = function(context, callback) {

	function makeRequest(uri, args, callback) {
		return context.adapterProperties.authorize.github.getCredentials(function(err, credentials) {
			if (err) return callback(err);

			var postBody = null;
			var method = "GET";
			if (/^POST:/.test(uri)) {
				method = "POST";
				uri = uri.substring(5);
				postBody = {};
				for (var name in args) {
					postBody[name] = args[name];
				}
				delete postBody.pages;
				postBody = JSON.stringify(postBody);
			}

			if (/\?/.test(uri)) {
				if (!/&$/.test(uri)) uri += "&";
			} else {
				uri += "?";
			}
			var url = "https://api.github.com" + uri + "per_page=100&access_token=" + credentials.token;
			function fetchPage(url, callback) {
				var data = [];
				return REQUEST({
					method: method,
					url: url,
					headers: {
						"User-Agent": "nodejs/request"
					},
					json: true,
					body: postBody
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
						if (
							(method === "GET" && res.statusCode !== 200) ||
							(method === "POST" && res.statusCode !== 201)
						) {
							if (method === "POST") {
								console.error("REQUEST BODY", postBody);
							}
							console.error("RESPONSE HEADERS", res.headers);
							console.error("RESPONSE BODY", body);
							var err = new Error(method + " Url '" + url + "' returned with status: " + res.statusCode);
							err.code = res.statusCode;
							return callback(err);
						}
						data.push(body);
					} else {
						console.error(body);
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
		});
	}


	function ensureAuthorized(callback) {

		return context.adapterMethods.authorize.getFromRegistry("github.com/credentials", function(err, credentials) {
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
					return Q.nfcall(context.adapterMethods.authorize.setInRegistry, "github.com/credentials", credentials).then(function() {
						return credentials;
					});
				});
			}).then(function(credentials) {
				return callback(null, credentials);
			}).fail(callback);
		});
	}

	function ensureSshKey(callback) {

		return context.adapterMethods.authorize.isPublicKeyAdded("github", function(err, isAdded, notifyAdded) {
			if (err) return callback(err);
			if (isAdded) return callback(null);
			return context.adapterMethods.authorize.getPublicKey(function(err, publicKey) {
				if (err) return callback(err);
				return makeRequest("/user/keys", {}, function(err, data) {
					if (err) return callback(err);
					if (
						data[0].filter(function(key) {
							return (key.key === publicKey);
						}).length >= 1
					) {
						return notifyAdded(callback);
					}
					return makeRequest("POST:/user/keys", {
						"title": "pinf-epoch:" + context.authUid + ":" + context.getAbsolutePathFromProperty("pinfHome", context.pinfEpoch),
						"key": publicKey
					}, function(err, data) {
						if (err) return callback(err);
						return notifyAdded(JSON.stringify(data[0], null, 4), callback);
					});
				});
			});
		});
	}

	return ensureAuthorized(function(err, credentials) {
		if (err) return callback(err);

		context.adapterProperties.authorize.github = {
			getCredentials: function(callback) {
				return callback(null, credentials);
			},
			makeRequest: makeRequest
		}

		return ensureSshKey(callback);
	});

	return callback(null);
}

