
require("colors");
const UTIL = require("util");
const STREAM = require("stream");


exports.for = function(module) {

	var exports = {};

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
