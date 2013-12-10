
const PATH = require("path");
const FS = require("fs-extra");
const EXEC = require("child_process").exec;
const Q = require("q");
const CRYPTO = require("crypto");


exports.authorize = function(context, callback) {

	var privateKeyPath = PATH.join(context.getAbsolutePathFromProperty("pinfHome", context.authEpoch), "id_rsa");

	function generatePassword(callback) {
		return CRYPTO.randomBytes(256, function(err, buf) {
			if (err) return callback(err);
			return callback(null, buf.toString("hex"));
		});
	}

/*
DEPRECATED: If this is needed it must be facilitated by customizing default
            behavior using configuration from the outside.
	// If our *authorize* epoch is a temporary one it only exists for one execution.
	if (/^tmp-/.test(context.pinfEpoch)) {
		return generatePassword(function(err, superSecretPassword) {
			if (err) return callback(err);

			context.adapterMethods.authorize.getSuperSecretPassword = function(callback) {
				return callback(null, superSecretPassword);
			}

			return callback(null);
		});
	}
*/

	function callKeychain(action, args, callback) {
		// NOTE: We are using an absolute path to ensure we get the correct binary.
		return EXEC("/usr/bin/security -q " + action + " " + args.join(" "), function(error, stdout, stderr) {
			if (action === "find-generic-password") {
				if (/The specified item could not be found in the keychain/.test(stderr)) {
					return callback(null, false);
				} else {
					return callback(null, stderr);
				}
			} 
			if (error) {
				return callback(new Error("Error calling `security`: " + stderr));
			}
			return callback(null, stdout);
		});
	}

	function get(key, callback) {
		return callKeychain("find-generic-password", [
			"-g",
			"-a", "pinf-epoch-key",
			"-s", key
		], function(err, result) {
			if (err) return callback(err);
			if (result === false) return callback(null, null);
			var password = result.match(/password: "([^"]*)"/);
			if (!password) return callback(null, null);
			return callback(null, password[1]);
		});
	}

	function set(key, value, callback) {
		return callKeychain("add-generic-password", [
			"-a", "pinf-epoch-key",
			"-s", key,
			"-l", "pinf-epoch-key:" + context.pinfEpoch + ":" + context.getAbsolutePathFromProperty("pinfHome", context.pinfEpoch),
			"-w", '"' + value + '"'
		], function(err, result) {
			if (err) return callback(err);
			return callback(null, true);
		});
	}

	function ensureSuperSecretPassword(callback, repeat) {
		var key = [context.authEpoch, context.authUid].join(":");
		return get(key, function(err, superSecretPassword) {
			if (err) return callback(null);
			if (superSecretPassword) return callback(null, superSecretPassword);
			if (repeat) return callback(new Error("Could not fetch key '" + context.pinfHomeUid + "' after setting it!"));
			return generatePassword(function(err, superSecretPassword) {
				if (err) return callback(err);
				return set(key, superSecretPassword, function(err) {
					if (err) return callback(null);
					return ensureSuperSecretPassword(callback, true);
				});
			});
		});
	}

	return ensureSuperSecretPassword(function(err, superSecretPassword) {
		if (err) return callback(err);

		context.adapterMethods.authorize.getSuperSecretPassword = function(callback) {
			return callback(null, superSecretPassword);
		}

		context.adapterMethods.authorize.encryptData = function(ns, data, callback) {
			var key = CRYPTO.createHash("sha256").update(ns + ":" + superSecretPassword).digest();
			var time = Date.now();
			return CRYPTO.randomBytes(128, function(err, buf) {
				if (err) return callback(err);
				var iv = CRYPTO.createHash("md5").update("iv:" + time + ":" + buf.toString("hex")).digest();
				var encipher = CRYPTO.createCipheriv("aes-256-cfb", key, iv);
			    var encryptdata = encipher.update(data, "utf8", "hex");
			    encryptdata += encipher.final("hex");
			    return callback(null, iv.toString("hex") + "\n" + encryptdata);
			});
		}

		context.adapterMethods.authorize.decryptData = function(ns, data, callback) {
			var key = CRYPTO.createHash("sha256").update(ns + ":" + superSecretPassword).digest();
			var iv = new Buffer(data.slice(0, 32).toString(), "hex");
			var encryptdata = new Buffer(data.slice(33).toString(), "hex");
		    var decipher = CRYPTO.createDecipheriv("aes-256-cfb", key, iv);
			var decoded = decipher.update(encryptdata);
			decoded += decipher.final();
			return callback(null, decoded);
		}

		return callback(null);
	});
}
