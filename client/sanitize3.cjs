const fs = require('fs');
const path = require('path');

const directoriesToScan = ['./src/pages', './src/components'];

const replacements = [
  // Text colors
  { regex: /\btext-(gray|slate|zinc)-(100|200|300|800|900)\b/g, replacement: 'text-foreground' },
  { regex: /\btext-(gray|slate|zinc)-(400|500|600|700)\b/g, replacement: 'text-muted-foreground' },
  // Background colors
  { regex: /\bbg-(gray|slate|zinc)-\d+(?:\/\d+)?\b/g, replacement: 'bg-secondary' },
  // Border colors
  { regex: /\bborder-(gray|slate|zinc)-\d+(?:\/\d+)?\b/g, replacement: 'border-border' },
  // Ring colors
  { regex: /\bring-(gray|slate|zinc)-\d+(?:\/\d+)?\b/g, replacement: 'ring-border' },
  
  // Specific fixes for Walllet.jsx and others
  { regex: /\bbg-blue-\d+\b/g, replacement: 'bg-primary' },
  { regex: /\bhover:bg-blue-\d+\b/g, replacement: 'hover:bg-primary/90' },
  { regex: /\btext-blue-\d+\b/g, replacement: 'text-primary' },
  
  // Any lingering bg-black or text-white variants
  { regex: /\btext-white\/(10|20|30|40|50|60|70|80|90)\b/g, replacement: 'text-muted-foreground' },
  { regex: /\bbg-black\/(10|20|30|40|50|60|70|80|90)\b/g, replacement: 'bg-secondary' },
  
  // Fix button inline styles that might override tailwind
  { regex: /style=\{\{\s*background:\s*"linear-gradient[^}]*\}\}/g, replacement: '' }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      // Clean up multiple spaces
      content = content.replace(/className="([^"]*)"/g, (match, classes) => {
        return `className="${classes.replace(/\s+/g, ' ').trim()}"`;
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

for (const dir of directoriesToScan) {
  processDirectory(dir);
}

console.log('Sanitization 3 complete.');
