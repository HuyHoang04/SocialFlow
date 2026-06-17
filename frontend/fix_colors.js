const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts') || dirPath.endsWith('.css')) {
      callback(path.join(dir, f));
    }
  });
}

let changedFiles = 0;
walkDir('src', file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    content = content.replace(/rgba\(255,\s*255,\s*255,/g, 'rgba(var(--text-rgb),');
    content = content.replace(/color:\s*'#e2e8f0'/g, "color: 'var(--text-primary)'");
    content = content.replace(/color:\s*'#94a3b8'/g, "color: 'var(--text-secondary)'");
    content = content.replace(/color:\s*'rgba\(255,\s*255,\s*255,\s*0\.65\)'/g, "color: 'var(--text-muted)'");
    content = content.replace(/color:\s*'rgba\(255,\s*255,\s*255,\s*0\.5\)'/g, "color: 'var(--text-muted)'");
    content = content.replace(/color:\s*'rgba\(255,\s*255,\s*255,\s*0\.3\)'/g, "color: 'var(--text-muted)'");
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    changedFiles++;
    console.log('Updated ' + file);
  }
});

let globalsFile = 'src/app/globals.css';
let globals = fs.readFileSync(globalsFile, 'utf8');
if (!globals.includes('--text-rgb: 244, 233, 215;')) {
  globals = globals.replace(/:root\s*\{/, ":root {\n  --text-rgb: 244, 233, 215;");
  globals = globals.replace(/\.light-theme\s*\{/, ".light-theme {\n  --text-rgb: 26, 27, 27;");
  fs.writeFileSync(globalsFile, globals);
  console.log('Updated globals.css');
}

console.log('Total files updated:', changedFiles);
