#!/usr/bin/env node

const fs = require('fs');

const code = fs.readFileSync('index.js', 'utf-8');

const repls = {};

let i = 1;

const newCode = code.replace(/_?op\d+/g, m => {
    if (!repls.hasOwnProperty(m)) {
        repls[m] = i;
        i++;
    }
    return `op${repls[m]}`;
});

console.log(newCode);
