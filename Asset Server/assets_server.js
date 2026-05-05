const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 2000;

app.use(cors());

const assetsDir = path.join(__dirname, 'custom_assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

app.use('/', express.static(assetsDir));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Asset Server running on port ${PORT}`);

    fs.readdir(assetsDir, (err, files) => {
        if (err) {
            console.error("Errorrrr:", err);
            return;
        }

        if (files.length === 0) {
            console.log(`There's nothing in Assets folder.`);
            console.log(`Copy/Move your image files: ${assetsDir}`);
        } else {
            files.forEach(file => {
                const filePath = path.join(assetsDir, file);

                // Read file to generate SHA-1 Hash
                try {
                    const fileBuffer = fs.readFileSync(filePath);
                    const hashSum = crypto.createHash('sha1');
                    hashSum.update(fileBuffer);
                    const hexDigest = hashSum.digest('hex');

                    console.log(`=============================`);
                    console.log(`File: ${file}`);
                    console.log(`Link: http://localhost:${PORT}/${file}`);
                    console.log(`Hash: ${hexDigest}`);
                } catch (readErr) {
                    console.error(`Error about ${file}`);
                }
            });
            console.log(`=============================\n`);
        }
    });
});
