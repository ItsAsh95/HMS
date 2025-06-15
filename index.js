const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

// --- Import all route handlers ---
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

// --- Database Connection Pool ---
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Core Middleware ---
app.use((req, res, next) => {
    req.db = dbPool;
    next();
});

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, client-side JS, images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Session management middleware
app.use(session({
    secret: process.env.SESSION_SECRET, // A strong, random secret key stored in .env
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));


// --- Route Handling ---
// Mount the route handlers for specific URL paths
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/api', apiRoutes); // All API routes are prefixed with /api

// Root route logic: redirect authenticated users to their dashboard, or guests to login.
app.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin-dashboard');
        } else {
            return res.redirect('/user-dashboard');
        }
    }
    res.redirect('/login');
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});