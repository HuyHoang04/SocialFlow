const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx')) {
      callback(path.join(dir, f));
    }
  });
}

let changedFiles = 0;
walkDir('src', file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/color:\s*'white'/g, "color: 'var(--text-primary)'");
  content = content.replace(/color:\s*'#fff'/g, "color: 'var(--text-primary)'");
  content = content.replace(/color:\s*'#ffffff'/g, "color: 'var(--text-primary)'");
  
  // Revert the ones that have background: 'var(--accent)' or 'var(--primary)' or '#ef4444'
  content = content.replace(/background:\s*'var\(--accent\)',\s*color:\s*'var\(--text-primary\)'/g, "background: 'var(--accent)', color: 'white'");
  content = content.replace(/background:\s*'var\(--primary\)',\s*color:\s*'var\(--text-primary\)'/g, "background: 'var(--primary)', color: 'white'");
  content = content.replace(/background:\s*'(#ef4444|#ff4757|#3b82f6|#10b981|#00b894|#1877f2)',\s*color:\s*'var\(--text-primary\)'/g, "background: '$1', color: 'white'");
  content = content.replace(/backgroundColor:\s*'(#ef4444|#ff4757|#3b82f6|#10b981|#00b894|#1877f2)',\s*color:\s*'var\(--text-primary\)'/g, "backgroundColor: '$1', color: 'white'");
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    changedFiles++;
  }
});

console.log('Total files updated:', changedFiles);
