
const FS = require("fs");
const PATH = require("path");

FS.writeFileSync(PATH.resolve("package.json"), JSON.stringify({
	"name": "test-package",
	"version": "0.0.0"
}, null, 4));
