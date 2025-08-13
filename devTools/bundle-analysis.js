#!/usr/bin/env bun

import { statSync } from 'fs';

console.log('📦 Argi Bundle Analysis\n');

const getSize = file => {
	try {
		return statSync(file).size;
	} catch {
		return 0;
	}
};

const srcFiles = ['src/argi.js', 'src/utils.js', 'index.js'];

let totalSize = 0;
srcFiles.forEach(file => {
	const size = getSize(file);
	totalSize += size;
	console.log(`${file.padEnd(20)} ${(size / 1024).toFixed(1)} KB`);
});

console.log('─'.repeat(30));
console.log(`Total Source:        ${(totalSize / 1024).toFixed(1)} KB`);

console.log(`\n🏃‍♂️ Runtime footprint:`);
console.log(`  Source code:     ~${(totalSize / 1024).toFixed(1)} KB`);
console.log(`  Dependencies:    0 KB`);
console.log(`  Total:           ~${(totalSize / 1024).toFixed(1)} KB`);
