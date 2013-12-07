
process.stdin.on('readable', function() {
	var chunk;
	while (null !== (chunk = process.stdin.read())) {
		process.stdout.write('\033[' + process.argv[2] + 'm' + chunk.toString() + '\033[0m');
	}
});
