const bcrypt = require('bcryptjs');
const plainPassword = 'admin123'; 
const saltRounds = 10; 

try {
    const hashedPassword = bcrypt.hashSync(plainPassword, saltRounds);
    console.log(`Plain Password: ${plainPassword}`);
    console.log(`BCrypt Hash: ${hashedPassword}`);
    console.log("\nCopy the BCrypt Hash value (it starts with $2a$ or $2b$). You will use this in phpMyAdmin.");
} catch (error) {
    console.error("Error generating hash:", error);
}