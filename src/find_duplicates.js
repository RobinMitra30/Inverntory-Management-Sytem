
const fs = require('fs');
const path = 'src/data/product-catalog.ts';
const content = fs.readFileSync(path, 'utf8');

const regex = /name: "([^"]*)"/g;
const matches = [];
let match;
while ((match = regex.exec(content)) !== null) {
  matches.push(match[1]);
}

const counts = {};
const duplicates = [];
matches.forEach(name => {
    counts[name] = (counts[name] || 0) + 1;
    if (counts[name] === 2) duplicates.push(name);
});

console.log('Duplicates:', duplicates);
