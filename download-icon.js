const https = require('https');
const fs = require('fs');

const url = "https://raw.githubusercontent.com/th-ch/youtube-music/master/assets/icon.png";
const file = fs.createWriteStream("assets/icon.png");

https.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
}, response => {
    if (response.statusCode !== 200) {
        console.error(`Failed to download: ${response.statusCode}`);
        response.resume();
        return;
    }
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log("Download completed");
    });
}).on('error', err => {
    fs.unlink("assets/icon.png", () => {});
    console.error(`Error: ${err.message}`);
});
