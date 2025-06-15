function authenticate(req, res, next) {
    if (req.session.user) {
        return next(); // User is authenticated, proceed to the next middleware or route handler.
    }
    // User is not authenticated, redirect to the login page.
    res.redirect('/login');
}

function authorizeAdmin(req, res, next) {
    // This middleware must always run AFTER authenticate(), so we can assume req.session.user exists.
    if (req.session.user && req.session.user.role === 'admin') {
        return next(); // User is an admin, proceed.
    }
    // User is authenticated but not an admin.
    res.status(403).render('error', {
        title: '403 Forbidden',
        message: 'You do not have permission to access this page.'
    });
}

module.exports = { authenticate, authorizeAdmin };