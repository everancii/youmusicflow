const Jimp = require('jimp');

Jimp.read('assets/icon.png').then(image => {
    image.clone().resize(256, 256).write('assets/icon_256.png', (err) => {
        if (err) console.error(err);
        else console.log('Created assets/icon_256.png');
    });

    image.clone().resize(32, 32).write('assets/icon_32.png', (err) => {
        if (err) console.error(err);
        else console.log('Created assets/icon_32.png');
    });
}).catch(err => {
    console.error(err);
});
