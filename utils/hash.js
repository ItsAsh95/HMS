// USE THIS TO HASH PASSWORDS
const bcrypt = require('bcrypt');
const saltRounds = 12; // A good default value
const passwordToHash = 'Random'; // Your desired admin password

bcrypt.hash(passwordToHash, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }
    console.log('Use this hash in your database seed script:');
    console.log(hash);
});