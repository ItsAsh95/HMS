# Hospital Management System (HMS)

<p align="center">
  <img src="public/images/login.jpg" alt="HMS Login Page" width="700">
</p>

A secure, full-stack Hospital Management System (HMS) built from the ground up with a modern Node.js backend and a dynamic EJS frontend. This project demonstrates best practices in web application architecture, including role-based access control, secure authentication, RESTful API design, and relational database management.

---

## ✨ Features

This application provides a comprehensive suite of features, segregated by user roles for maximum security and usability.

#### 🔐 **Core Security Features**
-   **Role-Based Access Control (RBAC):** Distinct portals and capabilities for **Administrators** and **Users**. All backend routes and API endpoints are protected with authentication and authorization middleware.
-   **Secure Password Hashing:** User passwords are never stored. The application uses `bcrypt` to store strong, salted password hashes, ensuring credentials are secure even in the event of a database breach.
-   **Parameterized SQL Queries:** All database interactions use parameterized queries (`mysql2/promise`) to provide absolute protection against SQL injection attacks.
-   **Environment-Based Configuration:** All sensitive credentials (database passwords, session secrets) are managed securely outside the codebase using a `.env` file.

#### 👨‍⚕️ **Administrator Portal**
-   **Complete Data Management (CRUD):** Full Create, Read, Update, and Delete capabilities for all core entities.
-   **Patient Management:** Add, view, update, and delete patient records.
-   **Doctor Management:** Add, view, update, and delete doctor profiles.
-   **Schedule Management:** A dedicated interface to set and update the weekly working hours for each doctor.
-   **Appointment Booking:** Schedule appointments on behalf of any patient with any doctor.
-   **Data Views:** Clean, paginated views for all database tables (Appointments, Patients, Doctors, Billing, Diagnostics).

#### 👤 **User (Patient) Portal**
-   **Self-Registration:** Users can register themselves as new patients, receiving a unique, system-generated Patient ID.
-   **Appointment Booking:** Book appointments with doctors, with real-time validation against the doctor's schedule and a 30-minute buffer to prevent overlaps.
-   **Diagnostic Scheduling:** Schedule diagnostic tests within operational hours (9 AM - 9 PM).

---

## 🛠️ Technology Stack

This project leverages a powerful and scalable set of modern technologies:

| Category      | Technology                                                                                                   |
|---------------|--------------------------------------------------------------------------------------------------------------|
| **Backend**   | [**Node.js**](https://nodejs.org/), [**Express.js**](https://expressjs.com/)                                  |
| **Database**  | [**MySQL / MariaDB**](https://mariadb.org/) with the `mysql2` promise-based driver                               |
| **Frontend**  | [**EJS (Embedded JavaScript)**](https://ejs.co/) for dynamic server-side rendering, HTML5, CSS3, JavaScript (ES6) |
| **Styling**   | [**Bootstrap 5**](https://getbootstrap.com/) for responsive layout and components, custom CSS for theming        |
| **Security**  | [**bcrypt**](https://www.npmjs.com/package/bcrypt) for password hashing, `express-session` for session management |

---

## 🚀 Local Setup and Installation

Follow these steps precisely to get a local copy up and running on your machine.

### **Prerequisites**
-   [**Node.js**](https://nodejs.org/en/download/) (v16.x or newer recommended)
-   [**MySQL Server**](https://dev.mysql.com/downloads/mysql/) or [**MariaDB Server**](https://mariadb.org/download/)

### **1. Clone the Repository**
```bash
git clone https://github.com/ItsAsh95/HMS.git
cd HMS
```

### **2. Install Dependencies**
This command reads the `package.json` file and installs all required backend packages into the `node_modules` folder.
```bash
npm install
```

### **3. Database Setup**
You must create the database, the tables, and a dedicated user for the application.

-   **Log in to your MySQL/MariaDB client as a root user:**
    ```bash
    mysql -u root -p
    ```
-   **Run the following SQL commands sequentially.** This script is idempotent (safe to run multiple times).

    ```sql
    -- Create a dedicated database for the project
    CREATE DATABASE IF NOT EXISTS hmsdb;

    -- Create a dedicated user and grant privileges (replace 'your_password' with a strong password)
    CREATE USER 'hms_user'@'localhost' IDENTIFIED BY 'your_password';
    GRANT ALL PRIVILEGES ON hmsdb.* TO 'hms_user'@'localhost';
    FLUSH PRIVILEGES;

    -- Switch to the new database
    USE hmsdb;
    
    -- Create all necessary tables
    -- (This includes all final schema changes and constraints)
    
    DROP TABLE IF EXISTS doctor_schedules, appointments, billing, diagnostics, users, doctors, patients;

    CREATE TABLE patients (
        patient_id INT PRIMARY KEY,
        name VARCHAR(255),
        dob DATE,
        address VARCHAR(255),
        contact_details VARCHAR(255),
        insurance_details VARCHAR(255)
    );

    CREATE TABLE doctors (
        doctor_id INT PRIMARY KEY,
        name VARCHAR(255),
        specialty VARCHAR(255),
        contact_details VARCHAR(255),
        department VARCHAR(255)
    );

    CREATE TABLE users (
        user_id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') NOT NULL
    );

    CREATE TABLE appointments (
        appointment_id INT PRIMARY KEY AUTO_INCREMENT,
        patient_id INT,
        doctor_id INT,
        date DATE,
        time TIME,
        reason VARCHAR(255),
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT
    );
    
    CREATE TABLE billing (
        billing_id INT PRIMARY KEY AUTO_INCREMENT,
        patient_id INT,
        amount DECIMAL(10, 2),
        status VARCHAR(50),
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
    );

    CREATE TABLE diagnostics (
        diagnostic_id INT PRIMARY KEY AUTO_INCREMENT,
        patient_id INT NOT NULL,
        test VARCHAR(255),
        date DATE,
        time TIME,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
    );

    CREATE TABLE doctor_schedules (
        schedule_id INT PRIMARY KEY AUTO_INCREMENT,
        doctor_id INT NOT NULL,
        day_of_week INT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
        CONSTRAINT uc_doctor_day UNIQUE (doctor_id, day_of_week)
    );
    
    -- Exit the SQL client
    EXIT;
    ```

### **4. Create and Configure Environment File**
-   In the root of the project, create a new file named `.env`.
-   Copy the contents of `.env.example` into your new `.env` file.
-   Fill in the details. **Use the database password you created in the previous step.**

    **File: `.env`**
    ```env
    DB_HOST=localhost
    DB_USER=hms_user
    DB_PASSWORD=your_password
    DB_NAME=hmsdb
    SESSION_SECRET=replace_this_with_a_long_random_string_of_characters
    ```

### **5. Seed the Database with Initial Data (Important!)**
To log in, you need at least one user. Run this separate Node.js script to create a secure admin user.
-   **First, create a utility script `seed.js` in your project root:**

    **File: `seed.js`**
    ```javascript
    const mysql = require('mysql2/promise');
    const bcrypt = require('bcrypt');
    require('dotenv').config();

    async function seedDatabase() {
        let connection;
        try {
            connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            });
            console.log('Connected to the database.');

            // Seed Admin User
            const adminPassword = 'admin123';
            const adminHash = await bcrypt.hash(adminPassword, 12);
            await connection.execute(
                "INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin') ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
                [adminHash]
            );
            console.log("--> Admin user 'admin' with password 'admin123' created/updated.");

            // Seed Standard User
            const userPassword = 'user123';
            const userHash = await bcrypt.hash(userPassword, 12);
            await connection.execute(
                "INSERT INTO users (username, password_hash, role) VALUES ('user1', ?, 'user') ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
                [userHash]
            );
            console.log("--> Standard user 'user1' with password 'user123' created/updated.");

            console.log('\nDatabase seeding complete!');
        } catch (error) {
            console.error('Error seeding database:', error);
        } finally {
            if (connection) await connection.end();
        }
    }
    seedDatabase();
    ```
-   **Now, run the script from your terminal:**
    ```bash
    node seed.js
    ```

### **6. Start the Server**
You are now ready to run the application.
```bash
npm start
```
The server will be running at `http://localhost:3000`. Navigate to this address in your browser.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE.txt) file for full details. 
You are free to use, modify, and distribute this software for any purpose.
License details: [MIT](https://opensource.org/licenses/MIT)

---
<p align="center">
  Designed and developed with a commitment to quality and modern development standards.
</p>