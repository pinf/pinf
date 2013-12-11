
const PATH = require("path");
const FS = require("fs-extra");
const EXEC = require("child_process").exec;


exports.authorize = function(context, callback) {

	var privateKeyPath = PATH.join(context.getAbsolutePathFromProperty("pinfHome", context.authEpoch), "id_rsa");
	var publicKeyPath = privateKeyPath + ".pub";

	return context.adapterMethods.authorize.getSuperSecretPassword(function(err, superSecretPassword) {
		if (err) return callback(err);

		// NOTE: Do not allow anyone else to call this method!
		delete context.adapterMethods.authorize.getSuperSecretPassword;

		context.adapterMethods.authorize.getSshAskpassEnvVars = function(callback) {
			// @see http://pentestmonkey.net/blog/ssh-with-no-tty
			var env = {
				DISPLAY: ":0",
				SSH_ASKPASS: PATH.join(__dirname, "publicprivatekey-askpass.js"),
				// TODO: Use temporary use token instead of actual password.
				SSH_ASKPASS_PASS: superSecretPassword
			};
			return callback(null, env);
		}

		context.adapterMethods.authorize.getGitSshEnvVars = function(callback) {
			var env = {
				GIT_SSH: PATH.join(__dirname, "git-ssh.sh")
			};
			return callback(null, env);
		}

		context.adapterMethods.authorize.getPublicKey = function(callback) {
			return FS.readFile(publicKeyPath, function(err, data) {
				if (err) return callback(err);
				return callback(null, data.toString("ascii").replace(/\s\S+\n$/, ""));
			});
		}

		context.adapterMethods.authorize.isPublicKeyAdded = function(alias, callback) {			
			var path = publicKeyPath + "+added-to-" + alias;
			return FS.exists(path, function(exists) {
				return callback(null, (exists)? path : false, function(data, callback) {
					return FS.outputFile(path, data, callback);
				});
			});
		}

		function call(bin, args, options, callback) {
			options = options || {};
			// NOTE: `bin` should be an absolute path to ensure we get the correct binary.
			return EXEC(bin + " " + args.join(" "), {
				env: options.env || process.env
			}, function(error, stdout, stderr) {
				if (error) {
					if (/The agent has no identities/.test(stdout)) {
						return callback(null, stdout);
					}
					process.stdout.write(stdout);
					process.stdout.write(stderr);
					return callback(new Error("Error calling `" + bin + " " + args.join(" ") + "`: " + stderr));
				}
				return callback(null, stdout);
			});
		}

		function createPrivateKey(callback) {
			// @see https://developer.apple.com/library/mac/#documentation/Darwin/Reference/ManPages/man1/ssh-add.1.html
			return call("/usr/bin/ssh-keygen", [
				"-t", "rsa",
				'-b','2048',
				'-C', context.pinfHomeUid,
				// TODO: Don't provide password here as it will show up in process list. Provide at prompt instead.
				"-N", superSecretPassword,
				"-f", privateKeyPath
			], {}, function(err) {
				if (err) return callback(err);
				return FS.chmod(privateKeyPath, 0400, callback);
			});
		}

		function ensurePublicKey(callback) {
			return FS.exists(publicKeyPath, function(exists) {
				if (!exists) {
					return callback(new Error("TODO: Get public key from private key!"));
				}
				return callback(null);
			});
		}

		function ensureKeys(callback) {
			return FS.exists(privateKeyPath, function(exists) {
				if (exists) return ensurePublicKey(callback);
				return createPrivateKey(callback);
			});
		}

		return ensureKeys(callback);
	});
}
