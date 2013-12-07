
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs");
const WAITFOR = require("waitfor");
const HELPERS = require("../lib/helpers");
const SPAWN = require("child_process").spawn;


const WRITE = false;


HELPERS.for(module).runMainAndExit(function(callback) {

	function getMajorTests(callback) {
		return FS.readdir(__dirname, function(err, filenames) {
			if (err) return callback(err);
			return callback(null, filenames.filter(function(filename) {
				return /^\d{2}-/.test(filename);
			}));
		});
	}

	function getMinorTests(majorTest, callback) {
		return FS.readdir(PATH.join(__dirname, majorTest, "tests"), function(err, filenames) {
			if (err) return callback(err);
			return callback(null, filenames.filter(function(filename) {
				return /^\d{2}-/.test(filename);
			}));
		});
	}

	function runMinorTest(majorTest, minorTest, done) {

//if (minorTest!=="04-StreamingPipe.sh") return done(null);		

		console.log(("[" + majorTest + "][" + minorTest + "] START").white);

		function callback(err) {
			if (err) {
				console.log(("[" + majorTest + "][" + minorTest + "] ERROR").red);
			} else {
				console.log(("[" + majorTest + "][" + minorTest + "] END").white);
			}
			return done.apply(null, arguments);
		}

		if (/\.sh$/.test(minorTest)) {

			var command = "sh " + PATH.join(__dirname, majorTest, "tests", minorTest);

			console.log(("[" + majorTest + "][" + minorTest + "] Run: " + command));

			command = command.split(" ");

			var log = [];

			var proc = SPAWN(command.shift(), [ command.join(" ") ], {
				cwd: PATH.join(__dirname, majorTest, "tests"),
				env: {
					PATH: PATH.join(__dirname, "../bin") + ":" + process.env.PATH,
					PINF_PROGRAMS: PATH.join(__dirname, majorTest, "programs"),
					HOME: PATH.join(__dirname, majorTest, ".tmp", minorTest)
				}
			});
			proc.stdout.on('data', function (data) {
				if (process.env.DEBUG) {
					process.stdout.write(data);
				}
				log.push(data.toString());
			});
			proc.stderr.on('data', function (data) {
				if (process.env.DEBUG) {
					process.stderr.write(data);
				}
				log.push(data.toString());
			});
			proc.on('close', function (code) {
				if (code !== 0) {
					return callback(new Error("Command '" + command + "' exited with code: " + code));
				}
				if (WRITE) {
					return FS.writeFile(PATH.join(__dirname, majorTest, "results",  minorTest + ".log"), log.join("\n"), callback);
				} else {
					return FS.readFile(PATH.join(__dirname, majorTest, "results",  minorTest + ".log"), function(err, data) {
						if (err) return callback(err);
						ASSERT.equal(data.toString(), log.join("\n"));
						return callback(null);
					});
				}
			});

		} else {
			return callback(new Error("Test file '" + minorTest + "' not supported!"));
		}
	}

	function runMajorTest(majorTest, callback) {
		console.log(("[" + majorTest + "] START").bold);
		return getMinorTests(majorTest, function(err, tests) {
			if (err) return callback(err);
			var waitfor = WAITFOR.serial(function(err) {
				if (err) return callback(err);
				console.log(("[" + majorTest + "] END").bold);
				return callback(null);
			});
			tests.forEach(function(minorTest) {
				waitfor(majorTest, minorTest, runMinorTest);
			});
			return waitfor();
		});
	}

	return getMajorTests(function(err, tests) {
		if (err) return callback(err);
		var waitfor = WAITFOR.serial(function(err) {
			if (err) return callback(err);
			console.log("OK".green);
			return callback(null);
		});
		tests.forEach(function(majorTest) {
			waitfor(majorTest, runMajorTest);
		});
		return waitfor();
	});
});