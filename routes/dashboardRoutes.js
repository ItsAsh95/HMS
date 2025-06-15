const express = require('express');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// --- Main Dashboard Routes ---
// Admin Dashboard (requires user to be authenticated AND an admin)
router.get('/admin-dashboard', authenticate, authorizeAdmin, (req, res) => {
    res.render('admin-dashboard', { username: req.session.user.username });
});

// User Dashboard (requires user to be authenticated)
router.get('/user-dashboard', authenticate, (req, res) => {
    res.render('user-dashboard', { username: req.session.user.username });
});


// --- Data Entry Form Routes ---
// These routes render the pages with forms for creating new data.

// Booking form (accessible to all authenticated users)
router.get('/booking-form', authenticate, async (req, res) => {
    try {
        const [doctors] = await req.db.execute('SELECT doctor_id, name, specialty FROM doctors ORDER BY name');
        const [patients] = await req.db.execute('SELECT patient_id, name FROM patients ORDER BY name');
        res.render('booking', { doctors, patients });
    } catch (err) {
        console.error('Error fetching data for booking page:', err);
        res.status(500).send('Server Error');
    }
});

// Patient registration/management form (admin only)
router.get('/patient-form', authenticate, (req, res) => {
    res.render('patient-management');
});
// Doctor tools form (admin only)
router.get('/doctor-form', authenticate, authorizeAdmin, (req, res) => {
    res.render('doctor-tools');
});
//Schedule for doc
router.get('/doctors', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                d.doctor_id, 
                d.name, 
                d.specialty, 
                d.contact_details, 
                d.department,
                IFNULL(
                    (SELECT 
                        GROUP_CONCAT(
                            CASE ds.day_of_week
                                WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
                                WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri'
                                WHEN 6 THEN 'Sat'
                            END 
                            ORDER BY ds.day_of_week SEPARATOR ', '
                        )
                    FROM doctor_schedules ds 
                    WHERE ds.doctor_id = d.doctor_id), 
                    'No schedule set'
                ) AS schedule_summary
            FROM doctors d
            ORDER BY d.name;
        `;
        const [doctors] = await req.db.execute(query);
        res.render('view_doctors', { doctors });
    } catch (err) {
        console.error('Error retrieving doctors with schedules:', err);
        res.status(500).render('error', { title: 'Server Error', message: 'Failed to retrieve doctor data.' });
    }
});

// Billing form (admin only)
router.get('/billing-form', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const [patients] = await req.db.execute('SELECT patient_id, name FROM patients ORDER BY name');
        res.render('billing', { patients });
    } catch (err) {
        console.error('Error fetching patients for billing page:', err);
        res.status(500).send('Server Error');
    }
});

// Diagnostics form (accessible to all authenticated users)
router.get('/diagnostics-form', authenticate, async (req, res) => {
    try {
        const [patients] = await req.db.execute('SELECT patient_id, name FROM patients ORDER BY name');
        res.render('diagnostics', { patients });
    } catch (err) {
        console.error('Error fetching patients for diagnostics page:', err);
        res.status(500).send('Server Error');
    }
});


// --- Data View Routes (Admin Only) ---
// These routes render the tables showing all data.

router.get('/appointments', authenticate, authorizeAdmin, async (req, res) => {
    const [appointments] = await req.db.execute('SELECT * FROM appointments ORDER BY date DESC, time DESC');
    res.render('view_appointments', { appointments });
});

router.get('/patients', authenticate, authorizeAdmin, async (req, res) => {
    const [patients] = await req.db.execute('SELECT * FROM patients ORDER BY name');
    res.render('view_patients', { patients });
});

router.get('/doctors', authenticate, authorizeAdmin, async (req, res) => {
    const [doctors] = await req.db.execute('SELECT * FROM doctors ORDER BY name');
    res.render('view_doctors', { doctors });
});

router.get('/billing', authenticate, authorizeAdmin, async (req, res) => {
    const [billing] = await req.db.execute('SELECT * FROM billing ORDER BY billing_id DESC');
    res.render('view_billing', { billing });
});

router.get('/diagnostics', authenticate, authorizeAdmin, async (req, res) => {
    const [diagnostics] = await req.db.execute('SELECT * FROM diagnostics ORDER BY date DESC, time DESC');
    res.render('view_diagnostics', { diagnostics });
});

router.get('/about', (req, res) => {
    const username = req.session.user ? req.session.user.username : null;
    res.render('about', { username });
});


module.exports = router;