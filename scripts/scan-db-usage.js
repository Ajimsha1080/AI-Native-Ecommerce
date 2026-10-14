const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(getFiles(file));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = getFiles('./src');
const patterns = {};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const matches = line.match(/db\.([a-zA-Z0-9_]+)/g);
    if (matches) {
      matches.forEach(m => {
        if (!patterns[m]) patterns[m] = [];
        patterns[m].push(`${f}:${idx + 1}`);
      });
    }
  });
});

Object.keys(patterns).sort().forEach(k => {
  console.log(`${k}: ${patterns[k].length} occurrences`);
});
