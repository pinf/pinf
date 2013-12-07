
process.stdin.on('readable', function() {
	var chunk;
	while (null !== (chunk = process.stdin.read())) {
		process.stdout.write("collected: " + chunk.toString());
	}
});
