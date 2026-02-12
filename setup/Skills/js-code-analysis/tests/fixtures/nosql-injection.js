// nosql-injection.js
// Vulnerable
app.post('/login', async (req, res) => {
    const user = await db.findOne({ username: req.body.username }); // Match 1
    res.json(user);
});

// Secure
app.post('/login-safe', async (req, res) => {
    const user = await db.findOne({ username: String(req.body.username) }); // No match
    res.json(user);
});
