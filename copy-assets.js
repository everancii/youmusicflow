const fs = require('fs');
const path = require('path');

// Static assets copied verbatim into the build output (app/)
const assetGroups = [
    {
        srcDir: path.join(__dirname, 'src', 'settings'),
        destDir: path.join(__dirname, 'app', 'settings'),
        files: ['index.html', 'style.css', 'renderer.js'],
        label: 'app/settings/'
    },
    {
        srcDir: path.join(__dirname, 'src', 'offline'),
        destDir: path.join(__dirname, 'app', 'offline'),
        files: ['offline.html'],
        label: 'app/offline/'
    }
];

assetGroups.forEach(({ srcDir, destDir, files, label }) => {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    files.forEach(file => {
        const srcFile = path.join(srcDir, file);
        const destFile = path.join(destDir, file);

        if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, destFile);
            console.log(`Copied ${file} to ${label}`);
        } else {
            console.error(`Source file not found: ${srcFile}`);
        }
    });
});
