
require("colors");
const UTIL = require("util");
const PATH = require("path");
const URL = require("url");
const STREAM = require("stream");
const EXEC = require("child_process").exec;
const Q = require("q");


exports.for = function(module) {

	var exports = {};

	exports.getRootPath = function(defaultPath) {
		return (
			// See if a custom home directory is desired.
			process.env.PINF_HOME ||
			// If not, we keep everything on a OS user level.
			(process.env.HOME && PATH.join(process.env.HOME, ".pinf")) ||
			defaultPath ||
			// In case we run without a user context we keep data centrally in OS.
			"/usr/local/lib/pinf"
		);
	}

	exports.parsePointerUri = function(uri) {
		var uriParsed = URL.parse("http://" + uri);
		var pathnameParts = uriParsed.pathname.split("/").slice(1);
		var info = {
			id: null,
			uid: null,
			did: null,
			selector: pathnameParts.pop(),
			hostname: uriParsed.hostname,
			path: uriParsed.query || null
		};
		info.uid = [uriParsed.hostname].concat(pathnameParts).join("/");
		info.duid = info.uid.replace(/\//g, "~");

		// Supported version selectors and their resulting version streams:
		//   1 -> 1
		//   1.2 -> 1.2
		//   1.2.3 -> 1.2.3
		//   v1.2.3 -> 1.2.3
		//   ~1.2 -> 1
		//   ~1.2+build -> 1
		//   ~1.2.3 -> 1.2
		//   1.2.3-alpha -> 1.2.3-alpha
		//   1.2.3-alpha.1 -> 1.2.3-alpha.1
		//   ~1.2.3-alpha -> 1.2-alpha
		//   ~1.2.3-alpha.1 -> 1.2-alpha
		//   ~1.2.3-alpha+build -> 1.2-alpha
		//   ~1.2.3-alpha.1+build -> 1.2-alpha
		var versionSelector = info.selector.match(/^v?(~?)(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(\w+)[\d\.]*)?(?:\+.+)?$/);
		var versionStream = null;
		if (versionSelector) {
			versionStream = [];
			if (versionSelector[1] === "~") {
				if (versionSelector[2] && versionSelector[3]) {
					versionStream.push(versionSelector[2]);
					if (versionSelector[4]) {
						versionStream.push(versionSelector[3]);
					}
				}
			} else {
				versionStream.push(versionSelector[2]);
				versionStream.push(versionSelector[3]);
				versionStream.push(versionSelector[4]);
			}
			versionStream = versionStream.join(".");
			if (versionSelector[5]) {
				versionStream += "-" + versionSelector[5];
			}
		}
		if (versionStream) {
			info.id = info.uid + "/" + versionStream;
		} else {
			info.id = info.uid + "/" + info.selector;
		}
		info.did = info.id.replace(/\//g, "~");
		return info;
	}

	exports.uriToPath = function(uri) {
		var uri = uri.replace(/[:@#]/g, "/").replace(/[\?&=]/g, "+").replace(/\/+/g, "/").replace(/\/$/, "+");
	    uri = uri.split("/").map(function(segment) {
	        if (segment.length > 256) {
	            // TODO: Use a faster hashing algorithm?
				var shasum = CRYPTO.createHash("md5");
		        shasum.update(segment);
		        segment = shasum.digest("hex");
	        }
	        return segment;
	    }).join("/");
	    return uri;
	}

	exports.runMainAndExit = function(main) {
		if (require.main === module) {
			return main(function(err) {
				if (err) {
					if (err !== true && err.stack) {
						console.error( (""+err.stack).red );
					}
					return process.exit(1);
				}
				return process.exit(0);
			});
		}
	}

	exports.exec = function(command, options, callback) {
		if (typeof options === "function" && typeof callback === "undefined") {
			callback = options;
			options = null;
		}
		options = options || {};
		var deferred = Q.defer();
		if (callback) {
			deferred.promise.then(function(ret) {
				return callback(null, ret);
			}, callback);
		}
		EXEC(command, options, function(err, stdout, stderr) {
			if (err) {
				process.stderr.write(stdout);
				process.stderr.write(stderr);
				return deferred.reject(err);
			}
			return deferred.resolve({
				stdout: stdout,
				stderr: stderr
			});
		});
		return deferred.promise;
	}

	var InputStreamProxy = exports.InputStreamProxy = function InputStreamProxy(stdin, buffer, bufferEnded) {
		var self = this;
		STREAM.Readable.call(self);
		self._buffer = buffer;
		self._notify = null;
		self._ended = bufferEnded;
		self._stdin = stdin;
		self._ready = null;
		if (self._ended === false) {
			self._stdin.on('end', function() {
				self._ended = true;
				if (self._notify) {
					self._notify();
				}
			});
		}
		self.pause();
		self.on("resume", function() {
			if (self._buffer.length > 0) {
				while(self._buffer.length > 0) {
					self.emit("data", self._buffer.shift());
				}
			}
			if (self._buffer.length === 0 && self._ended) {
				self.emit("end");
			}
		});
	}
	UTIL.inherits(InputStreamProxy, STREAM.Readable);
	InputStreamProxy.prototype.buffer = function(chunk) {
		this._buffer.push(chunk);
		if (this._notify) {
			this._notify();
		} else
		if (this._ready === false) {
			this._ready = true;
			this.emit("readable");
		}		
	}
	InputStreamProxy.prototype._read = function(size) {
		var self = this;
		function pushNextInBuffer() {
		    if (self.push(self._buffer.shift()) === false) {
				self._stdin.pause();
		    }
		}
		if (self._buffer.length > 0) {
			pushNextInBuffer();
		} else
		if (self._ended === true) {
		    self.push(null);
		    self.emit("ended");
		} else {
			self._notify = function() {
				self._notify = null;
				pushNextInBuffer();
			}
		}
	};
	InputStreamProxy.prototype.ready = function() {
		if (this._buffer.length > 0) {
			this._ready = true;
			this.emit("readable");
		} else
		if (this._ended) {
			this._ready = null;
			this.emit("ended");
		} else {
			this._ready = false;
		}
	}

	var OutputStreamProxy = exports.OutputStreamProxy = function OutputStreamProxy(stdout) {
		var self = this;
		STREAM.Writable.call(self);
		self._stdout = stdout;
//		self.on("data", function(chunk) {
// TODO: Log output data to file.
//		});
	}
	UTIL.inherits(OutputStreamProxy, STREAM.Writable);
	OutputStreamProxy.prototype._write = function(chunk, encoding, callback) {
		// WORKAROUND: If `encoding === "buffer"`, `this._stdout.write` throws.
		if (chunk instanceof Buffer && encoding === "buffer") {
			encoding = null;
		}
		return this._stdout.write(chunk, encoding, callback);
	}

	return exports;
}
