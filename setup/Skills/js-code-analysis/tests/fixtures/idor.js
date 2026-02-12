// idor.js
// Vulnerable
app.get('/api/user/:id', async (req, res) => {
    const user = await db.findOne({ id: req.params.id }); // Match 1
    res.json(user);
});

// Secure
app.get('/api/user/:id', async (req, res) => {
    const user = await db.findOne({ 
        id: req.params.id,
        ownerId: req.user.id 
    }); // No match
    res.json(user);
});
