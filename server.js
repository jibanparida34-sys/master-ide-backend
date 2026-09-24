const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/build', upload.single('project_zip'), async (req, res) => {
    if (!req.file) return res.status(400).send('No zip file uploaded.');

    const zipPath = req.file.path;
    const extractTo = path.join(__dirname, 'workspace', req.file.filename);
    const outputApkPath = path.join(extractTo, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

    try {
        await extract(zipPath, { dir: extractTo });
        fs.chmodSync(path.join(extractTo, 'gradlew'), '777');

        exec('./gradlew assembleDebug', { cwd: extractTo }, (error) => {
            if (error) {
                return res.status(500).send('Compilation Error');
            }
            if (fs.existsSync(outputApkPath)) {
                res.download(outputApkPath, 'app-debug.apk', () => {
                    fs.rmSync(extractTo, { recursive: true, force: true });
                    fs.unlinkSync(zipPath);
                });
            } else {
                res.status(500).send('APK was not generated.');
            }
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

app.listen(process.env.PORT || 3000);
