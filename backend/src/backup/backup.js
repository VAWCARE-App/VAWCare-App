// backup/backup.js
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;
const BACKUP_DIR = path.join(__dirname, 'data');

function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

    const dumpCommand = `mongodump --uri="${MONGO_URI}" --out="${backupPath}"`;

    console.log(`Starting backup: ${timestamp}`);

    exec(dumpCommand, (error, stdout, stderr) => {
        if (error) {
            console.error("Backup FAILED:", error);
            return;
        }
        console.log("Backup SUCCESS:", backupPath);
    });
}

// Create backups directory if missing
const fs = require('fs');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// RUN EVERY DAY AT 2 AM
cron.schedule('0 2 * * *', () => {
    console.log("Cron triggered: Running MongoDB backup");
    backupDatabase();
});

module.exports = { backupDatabase };
