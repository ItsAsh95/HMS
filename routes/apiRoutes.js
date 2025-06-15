const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');


function generateUniqueId() {
    
    return Math.floor(100 + Math.random() * 900);
}

// Create Appointment
router.post('/appointments', authenticate, async (req, res) => {
    const { patient_id, doctor_id, date, time, reason } = req.body;
    if (!patient_id || !doctor_id || !date || !time) {
        return res.status(400).json({ message: 'Patient, Doctor, Date, and Time are required.' });
    }
    try {
        const requestedDate = new Date(date);
        const dayOfWeek = requestedDate.getDay();
        const scheduleQuery = 'SELECT start_time, end_time FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ?';
        const [schedules] = await req.db.execute(scheduleQuery, [doctor_id, dayOfWeek]);
        if (schedules.length === 0) return res.status(409).json({ message: 'The selected doctor is not available on this day of the week.' });
        
        const schedule = schedules[0];
        if (time < schedule.start_time || time >= schedule.end_time) return res.status(409).json({ message: `The requested time is outside the doctor's available hours (${schedule.start_time} - ${schedule.end_time}).` });
        
        const conflictQuery = `SELECT appointment_id FROM appointments WHERE doctor_id = ? AND date = ? AND TIME(?) BETWEEN SUBTIME(time, '00:29:59') AND ADDTIME(time, '00:29:59')`;
        const [conflicts] = await req.db.execute(conflictQuery, [doctor_id, date, time]);
        if (conflicts.length > 0) return res.status(409).json({ message: 'This time slot is too close to an existing appointment. Please choose a time at least 30 minutes apart.' });

        const query = 'INSERT INTO appointments (patient_id, doctor_id, date, time, reason) VALUES (?, ?, ?, ?, ?)';
        await req.db.execute(query, [patient_id, doctor_id, date, time, reason]);
        res.status(201).json({ message: 'Appointment booked successfully!' });
    } catch (err) {
        console.error('Error inserting appointment:', err);
        res.status(500).json({ message: 'A server error occurred while booking the appointment.' });
    }
});

// Create Patient
router.post('/patients', authenticate, async (req, res) => {
   
    const { name, dob, address, contact_details, insurance_details } = req.body;
    const db = req.db;

    if (!name || !dob || !address || !contact_details) {
        return res.status(400).json({ message: 'Name, DOB, Address, and Contact Details are required.' });
    }

    let connection;
    try {
        connection = await db.getConnection(); // Get a connection from the pool
        await connection.beginTransaction(); // Start a transaction for safe ID generation

        let patient_id;
        let isUnique = false;
        let attempts = 0;
        
        // Loop to ensure the generated ID is truly unique
        while (!isUnique && attempts < 10) {
            patient_id = generateUniqueId();
            const [rows] = await connection.execute('SELECT patient_id FROM patients WHERE patient_id = ?', [patient_id]);
            if (rows.length === 0) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Failed to generate a unique patient ID after multiple attempts.');
        }

        const query = 'INSERT INTO patients (patient_id, name, dob, address, contact_details, insurance_details) VALUES (?, ?, ?, ?, ?, ?)';
        await connection.execute(query, [patient_id, name, dob, address, contact_details, insurance_details]);
        
        await connection.commit(); // Commit the transaction
        
        res.status(201).json({ 
            message: `Patient registered successfully! Your new Patient ID is ${patient_id}. Please save it for future use.`,
            patientId: patient_id
        });

    } catch (err) {
        if (connection) await connection.rollback(); // Rollback on error
        console.error('Error inserting patient:', err);
        res.status(500).json({ message: 'Error processing patient data: ' + err.message });
    } finally {
        if (connection) connection.release(); // Release the connection back to the pool
    }
});

//Update patient
router.put('/patients/:id', authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, dob, address, contact_details, insurance_details } = req.body;
    if (!name || !dob || !address || !contact_details) {
        return res.status(400).json({ message: 'Name, DOB, Address, and Contact are required for an update.' });
    }
    try {
        const query = `UPDATE patients SET name = ?, dob = ?, address = ?, contact_details = ?, insurance_details = ? WHERE patient_id = ?`;
        const [result] = await req.db.execute(query, [name, dob, address, contact_details, insurance_details, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Patient not found with this ID.' });
        }
        res.status(200).json({ message: `Patient ID ${id} updated successfully!` });
    } catch (err) {
        console.error(`Error updating patient ${id}:`, err);
        res.status(500).json({ message: 'Server error while updating patient.' });
    }
});

// Create/Update Doctor (Admin Only)
router.post('/doctors', authenticate, authorizeAdmin, async (req, res) => {
    const { name, specialty, contact_details, department } = req.body;
    if (!name || !specialty || !contact_details || !department) return res.status(400).json({ message: 'All fields are required.' });
    let connection;
    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction();
        let doctor_id;
        let isUnique = false;
        while (!isUnique) {
            doctor_id = generateUniqueId();
            const [rows] = await connection.execute('SELECT doctor_id FROM doctors WHERE doctor_id = ?', [doctor_id]);
            if (rows.length === 0) isUnique = true;
        }
        const query = 'INSERT INTO doctors (doctor_id, name, specialty, contact_details, department) VALUES (?, ?, ?, ?, ?)';
        await connection.execute(query, [doctor_id, name, specialty, contact_details, department]);
        await connection.commit();
        res.status(201).json({ message: `Doctor added successfully! New Doctor ID is ${doctor_id}.` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Error inserting doctor:', err);
        res.status(500).json({ message: 'Server error while adding doctor.' });
    } finally {
        if (connection) connection.release();
    }
});

// UPDATE Doctor
router.put('/doctors/:id', authenticate, authorizeAdmin, async (req, res) => {
    const { name, specialty, contact_details, department } = req.body;
    if (!name || !specialty || !contact_details || !department) return res.status(400).json({ message: 'All fields are required for an update.' });
    try {
        const query = `UPDATE doctors SET name = ?, specialty = ?, contact_details = ?, department = ? WHERE doctor_id = ?`;
        const [result] = await req.db.execute(query, [name, specialty, contact_details, department, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Doctor not found with this ID.' });
        res.status(200).json({ message: `Doctor ID ${req.params.id} updated successfully!` });
    } catch (err) {
        console.error(`Error updating doctor ${req.params.id}:`, err);
        res.status(500).json({ message: 'Server error while updating doctor.' });
    }
});

//Doc Subroutes
router.get('/doctors/:id/schedule', authenticate, authorizeAdmin, async (req, res) => {
    const doctorId = req.params.id;
    try {
        // First, check if the doctor actually exists.
        const [doctorRows] = await req.db.execute('SELECT doctor_id FROM doctors WHERE doctor_id = ?', [doctorId]);
        if (doctorRows.length === 0) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }
        
        // If the doctor exists, fetch their schedule. It's okay if this returns an empty array.
        const [schedule] = await req.db.execute('SELECT day_of_week, start_time, end_time FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week', [doctorId]);
        res.status(200).json(schedule);

    } catch (err) {
        console.error(`Error fetching schedule for doctor ${doctorId}:`, err);
        res.status(500).json({ message: 'Server error fetching schedule.' });
    }
});

router.put('/doctors/:id/schedule', authenticate, authorizeAdmin, async (req, res) => {
    const doctorId = req.params.id;
    const { schedules } = req.body;
    let connection;
    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction();
        await connection.execute('DELETE FROM doctor_schedules WHERE doctor_id = ?', [doctorId]);
        if (schedules) {
            const insertQuery = 'INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)';
            for (const dayOfWeek in schedules) {
                const { start, end } = schedules[dayOfWeek];
                if (start && end) {
                    await connection.execute(insertQuery, [doctorId, dayOfWeek, start, end]);
                }
            }
        }
        await connection.commit();
        res.status(200).json({ message: `Schedule for Doctor ID ${doctorId} updated successfully.` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(`Error updating schedule for doctor ${doctorId}:`, err);
        res.status(500).json({ message: 'Server error updating schedule.' });
    } finally {
        if (connection) connection.release();
    }
});


// Create Billing Record (Admin Only)
router.post('/billing', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const { patient_id, amount, status } = req.body;
        const db = req.db;
        const query = 'INSERT INTO billing (patient_id, amount, status) VALUES (?, ?, ?)';
        await db.execute(query, [patient_id, amount, status]);
        res.status(201).json({ message: 'Billing information recorded successfully' });
    } catch (err) {
        console.error('Error inserting billing data:', err);
        res.status(500).json({ message: 'Error processing billing data' });
    }
});

// Create Diagnostic Record (Any authenticated user)
router.post('/diagnostics', authenticate, async (req, res) => {
    try {
        const { patient_id, test, date, time } = req.body;
        
        // --- NEW: TIME VALIDATION ---
        const diagnosticStartTime = '09:00:00';
        const diagnosticEndTime = '21:00:00';
        if (time < diagnosticStartTime || time > diagnosticEndTime) {
            return res.status(409).json({ message: `Diagnostics can only be scheduled between ${diagnosticStartTime} and ${diagnosticEndTime}.` });
        }

        const query = 'INSERT INTO diagnostics (patient_id, test, date, time) VALUES (?, ?, ?, ?)';
        await req.db.execute(query, [patient_id, test, date, time]);
        res.status(201).json({ message: 'Diagnostic test scheduled successfully!' });
    } catch (err) {
        console.error('Error inserting diagnostics data:', err);
        res.status(500).json({ message: 'Error processing diagnostic scheduling.' });
    }
});

// --- DELETE ROUTES (Admin Only) ---

// Delete an appointment
router.delete('/appointments/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const [result] = await req.db.execute('DELETE FROM appointments WHERE appointment_id = ?', [req.params.id]);
        if (result.affectedRows > 0) res.status(200).json({ message: 'Appointment deleted successfully' });
        else res.status(404).json({ message: 'Appointment not found' });
    } catch (err) {
        console.error(`Error deleting appointment with ID ${req.params.id}:`, err);
        res.status(500).json({ message: 'Server error occurred while deleting.' });
    }
});

// Delete a patient
router.delete('/patients/:id', authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await req.db.execute('DELETE FROM patients WHERE patient_id = ?', [id]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Patient deleted successfully. Associated records may also have been removed.' });
        } else {
            res.status(404).json({ message: 'Patient not found' });
        }
    } catch (err) {
        console.error(`Error deleting patient with ID ${id}:`, err);
        res.status(500).json({ message: 'Server error occurred while deleting.' });
    }
});

// Delete a doctor
router.delete('/doctors/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const [result] = await req.db.execute('DELETE FROM doctors WHERE doctor_id = ?', [req.params.id]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Doctor deleted successfully' });
        } else {
            res.status(404).json({ message: 'Doctor not found' });
        }
    } catch (err) {
        // Catches foreign key violations from both `appointments` and `doctor_schedules`.
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Cannot delete doctor. They have existing appointments or a schedule assigned. Please clear these first.' });
        }
        console.error(`Error deleting doctor with ID ${req.params.id}:`, err);
        res.status(500).json({ message: 'Server error occurred while deleting.' });
    }
});



// Delete a billing record
router.delete('/billing/:id', authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await req.db.execute('DELETE FROM billing WHERE billing_id = ?', [id]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Billing record deleted successfully' });
        } else {
            res.status(404).json({ message: 'Billing record not found' });
        }
    } catch (err) {
        console.error(`Error deleting billing record with ID ${id}:`, err);
        res.status(500).json({ message: 'Server error occurred while deleting.' });
    }
});

// Delete a diagnostic record
router.delete('/diagnostics/:id', authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await req.db.execute('DELETE FROM diagnostics WHERE diagnostic_id = ?', [id]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Diagnostic record deleted successfully' });
        } else {
            res.status(404).json({ message: 'Diagnostic record not found' });
        }
    } catch (err) {
        console.error(`Error deleting diagnostic record with ID ${id}:`, err);
        res.status(500).json({ message: 'Server error occurred while deleting.' });
    }
});


module.exports = router;