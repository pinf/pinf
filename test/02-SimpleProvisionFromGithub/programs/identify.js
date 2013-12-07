
const PATH = require("path");

process.stdout.write(require(PATH.join(__dirname, "../../../package.json")).version);
