// ssrf.js
const axios = require('axios');

// Vulnerable
async function proxy(req, res) {
    const url = req.query.url;
    const response = await axios.get(url); // Match 1
    res.send(response.data);
}

// Secure
async function safeProxy(req, res) {
    const response = await axios.get('https://api.trusted.com/data'); // No match
    res.send(response.data);
}
