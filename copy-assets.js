const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'settings');
const destDir = path.join(__dirname, 'app', 'settings');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Files to copy
const files = ['index.html', 'style.css', 'renderer.js'];

files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    
    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${file} to app/settings/`);
    } else {
        console.error(`Source file not found: ${srcFile}`);
    }
});
