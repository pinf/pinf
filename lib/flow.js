
const UTIL = require("util");
const EVENTS = require("events");
const WAITFOR = require("waitfor");

// Needs to support skipping of steps, logging, exceptions, repeat until success.


var Node = exports.Node = function Node(name, handler) {
	var self = this;
	self.name = name;
	self.nodes = [];
	self.handler = handler;
}
UTIL.inherits(Node, EVENTS.EventEmitter);

Node.prototype.add = function(node) {
	this.nodes.push(node);
}

Node.prototype.start = function(context, callback) {
	var self = this;
	var waitfor = WAITFOR.serial(function(err) {
		if (err) return callback(err);
		self.emit("end", self.name);
		return callback(null);
	});
	self.emit("start", self.name);
	function runHandler(done) {
		function callback(err) {
			if (err) {
				self.emit("error", self.name, err);
			}
			return done.apply(null, arguments);
		}
		if (!self.handler) return callback(null);
		try {
			return self.handler(context, callback);
		} catch(err) {
			return callback(err);
		}
	}
	return runHandler(function(err) {
		if (err) return callback(err);
		self.nodes.forEach(function(node) {
			return waitfor(function(done) {
				return node.start(context, done);
			});
		});
		return waitfor();
	});
};


var Harness = exports.Harness = function Harness() {
	var self = this;
	Node.apply(self, arguments);
	self.logger = null;
}
UTIL.inherits(Harness, Node);

Harness.prototype.setLogger = function(logger) {
	var self = this;
	if (!self.logger) {
		function log(event, severity) {
			return function() {
				self.logger[severity].apply(null, ["[flow]", event].concat(Array.prototype.slice.call(arguments)));
			}
		}
		self.on("error", log("error", "error"));
		self.on("start", log("start", "info"));
		self.on("end", log("end", "info"));
	}
	self.logger = logger;
}

Harness.prototype.add = function(node) {
	var self = this;
	[
		"error",
		"start",
		"end"
	].forEach(function(type) {
		return node.on(type, function() {
			return self.emit(type, [self.name].concat(Array.prototype.slice.call(arguments)).join("."));
		});
	});
	return Node.prototype.add.apply(self, arguments);
}



var Task = exports.Task = function Task() {
	var self = this;
	Node.apply(self, arguments);
}
UTIL.inherits(Task, Node);
