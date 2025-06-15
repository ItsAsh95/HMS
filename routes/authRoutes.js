const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Route to render the login page
router.get('/login', (req, res) => {
    // If the user is already logged in, redirect them away from the login page
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { message: null });
});

// Route to handle the login form submission
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;
    const db = req.db;

    if (!username || !password || !role) {
        return res.status(400).render('login', { message: 'All fields are required.' });
    }

    try {
        const [rows] = await db.execute('SELECT user_id, username, password_hash, role FROM users WHERE username = ?', [username]);
        const user = rows[0];

        // Check if user exists
        if (!user) {
            return res.status(401).render('login', { message: 'Invalid credentials.' });
        }

        // Compare submitted password with the stored hash
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

        // Check if password and role both match
        if (isPasswordMatch && user.role === role) {
            // Store user info in the session, excluding the password hash
            req.session.user = {
                id: user.user_id,
                username: user.username,
                role: user.role
            };
            // Redirect to the root, which will handle routing to the correct dashboard
            res.redirect('/');
        } else {
            // Password or role mismatch
            res.status(401).render('login', { message: 'Invalid credentials.' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).render('login', { message: 'A server error occurred. Please try again later.' });
    }
});

// Route to handle user logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.redirect('/');
        }
        // Clear the cookie and redirect to the login page
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

module.exports = router;