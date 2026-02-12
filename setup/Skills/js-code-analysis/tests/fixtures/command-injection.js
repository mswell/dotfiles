// command-injection.js
const { exec, execFile } = require('child_process');

// Vulnerable
app.get('/ping', (req, res) => {
    const host = req.query.host;
    exec(`ping -c 4 ${host}`, (err, stdout) => { // Match 1
        res.send(stdout);
    });
});

// Secure
app.get('/ping-safe', (req, res) => {
    const host = req.query.host;
    execFile('/bin/ping', ['-c', '4', host], (err, stdout) => { // No match
        res.send(stdout);
    });
});
