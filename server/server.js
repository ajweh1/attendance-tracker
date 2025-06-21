require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer'); 
const path = require('path'); 
const fs = require('fs'); 

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    allowedHeaders: ['Content-Type', 'Authorization'], 
}));

app.use(express.json());

// --- Serve Static Files from the 'uploads' directory ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
    console.log("Created 'uploads' directory for images.");
}

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// --- MySQL Connection Pool ---
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

dbPool.getConnection()
    .then(connection => {
        console.log('Successfully connected to MySQL database via XAMPP!');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('MySQL Access Denied. Check DB_USER and DB_PASSWORD in .env file.');
        else if (err.code === 'ER_BAD_DB_ERROR') console.error(`Database '${process.env.DB_NAME}' does not exist. Please create it via phpMyAdmin.`);
        else console.error('Ensure MySQL (MariaDB) server is running in XAMPP and accessible.');
    });

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT Verification Error:', err.message);
            return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ message: 'Forbidden: Admin role required.' });
};

// --- API Routes ---

// 1. User Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    try {
        const [rows] = await dbPool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Invalid username or password.' });
        const user = rows[0];
        const passwordIsValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordIsValid) return res.status(401).json({ message: 'Invalid username or password.' });
        const tokenPayload = { userId: user.id, username: user.username, role: user.role };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({
            message: 'Login successful!',
            token: token,
            user: { 
                id: user.id, 
                username: user.username, 
                fullName: user.full_name, 
                role: user.role,
                profile_picture_url: user.profile_picture_url 
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// 2. Admin: Create New Employee
app.post('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    const { username, password, fullName, role = 'employee' } = req.body;
    if (!username || !password || !fullName) return res.status(400).json({ message: 'Username, password, and full name are required.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await dbPool.execute(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, fullName, role]
        );
        res.status(201).json({ message: 'Employee created successfully', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Username already exists.' });
        console.error('Error creating employee:', error);
        res.status(500).json({ message: 'Server error creating employee.' });
    }
});

// 3. Employee: Check-in
app.post('/api/attendance/check-in', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date();
    try {
        const [existingRecords] = await dbPool.execute(
            'SELECT * FROM attendance_records WHERE user_id = ? AND attendance_date = ? AND check_out_time IS NULL',
            [userId, currentDate]
        );
        if (existingRecords.length > 0) return res.status(400).json({ message: 'You have already checked in for today.' });
        const [result] = await dbPool.execute(
            'INSERT INTO attendance_records (user_id, attendance_date, check_in_time, status) VALUES (?, ?, ?, ?)',
            [userId, currentDate, currentTime, 'Present']
        );
        res.status(201).json({ message: 'Checked in successfully', recordId: result.insertId, checkInTime: currentTime.toISOString() });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ message: 'Server error during check-in.' });
    }
});

// 4. Employee: Check-out
app.post('/api/attendance/check-out', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date();
    try {
        const [result] = await dbPool.execute(
            'UPDATE attendance_records SET check_out_time = ? WHERE user_id = ? AND attendance_date = ? AND check_out_time IS NULL AND check_in_time IS NOT NULL',
            [currentTime, userId, currentDate]
        );
        if (result.affectedRows === 0) return res.status(400).json({ message: 'No active check-in found for today to check out, or already checked out.' });
        res.json({ message: 'Checked out successfully', checkOutTime: currentTime.toISOString() });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ message: 'Server error during check-out.' });
    }
});

// 5. Get current user's attendance status for today
app.get('/api/attendance/status/today', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const currentDate = new Date().toISOString().slice(0, 10);
    try {
        const [records] = await dbPool.execute(
            'SELECT check_in_time, check_out_time FROM attendance_records WHERE user_id = ? AND attendance_date = ? ORDER BY check_in_time DESC LIMIT 1',
            [userId, currentDate]
        );
        if (records.length > 0) res.json({ checkInTime: records[0].check_in_time, checkOutTime: records[0].check_out_time });
        else res.json({ checkInTime: null, checkOutTime: null });
    } catch (error) {
        console.error('Error fetching today\'s status:', error);
        res.status(500).json({ message: 'Server error fetching status.' });
    }
});

// 6. Admin: Get All Employees
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [users] = await dbPool.execute('SELECT id, username, full_name, role, created_at FROM users ORDER BY full_name');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
});

// 7. Admin: Get All Attendance Records (Can be filtered by userId)
app.get('/api/admin/attendance/all', authenticateToken, isAdmin, async (req, res) => {
    const { userId } = req.query;
    try {
        let query = `
            SELECT ar.record_id, ar.user_id, u.full_name, u.username, ar.attendance_date,
                   ar.check_in_time, ar.check_out_time, ar.status
            FROM attendance_records ar
            JOIN users u ON ar.user_id = u.id
        `;
        const queryParams = [];
        if (userId && userId !== 'all' && userId !== '') {
            query += ' WHERE ar.user_id = ?';
            queryParams.push(userId);
        }
        query += ' ORDER BY ar.attendance_date DESC, ar.check_in_time DESC, u.full_name ASC';
        const [records] = await dbPool.execute(query, queryParams);
        res.json(records);
    } catch (error) {
        console.error('Error fetching all attendance records:', error);
        res.status(500).json({ message: 'Server error fetching attendance records.' });
    }
});

// 8. Get all attendance records for the logged-in user
app.get('/api/attendance/my-records', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const [records] = await dbPool.execute(
            'SELECT record_id, user_id, check_in_time, check_out_time, attendance_date, status FROM attendance_records WHERE user_id = ? ORDER BY attendance_date DESC',
            [userId]
        );
        res.json(records);
    } catch (error) {
        console.error('Error fetching my attendance records:', error);
        res.status(500).json({ message: 'Server error fetching your attendance records.' });
    }
});

// 9. Mark/Update attendance status for a specific date
app.post('/api/attendance/mark-status', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { date, status } = req.body;
    if (!date || !status) return res.status(400).json({ message: 'Date and status are required.' });
    if (status === 'Holiday') return res.status(400).json({ message: 'Marking Holiday status is not permitted via this endpoint.' }); // Prevent Holiday marking
    
    try {
        const [existingRecords] = await dbPool.execute(
            'SELECT record_id FROM attendance_records WHERE user_id = ? AND attendance_date = ?',
            [userId, date]
        );
        if (status === 'Clear') {
            if (existingRecords.length > 0) {
                await dbPool.execute('DELETE FROM attendance_records WHERE record_id = ?', [existingRecords[0].record_id]);
                return res.json({ message: `Attendance entry for ${date} cleared.` });
            } else {
                return res.json({ message: `No entry found for ${date} to clear.` });
            }
        }
        if (existingRecords.length > 0) {
            const recordId = existingRecords[0].record_id;
            if (status === 'Absent') await dbPool.execute('UPDATE attendance_records SET status = ?, check_in_time = NULL, check_out_time = NULL WHERE record_id = ?', [status, recordId]);
            else await dbPool.execute('UPDATE attendance_records SET status = ? WHERE record_id = ?', [status, recordId]);
            res.json({ message: `Attendance for ${date} marked as ${status}.` });
        } else {
            if (status === 'Absent' || status === 'Present') {
                await dbPool.execute(
                    'INSERT INTO attendance_records (user_id, attendance_date, status, check_in_time, check_out_time) VALUES (?, ?, ?, NULL, NULL)',
                    [userId, date, status]
                );
                res.status(201).json({ message: `Attendance for ${date} marked as ${status}.` });
            } else {
                res.status(400).json({ message: 'Invalid status for new record without check-in/out times.' });
            }
        }
    } catch (error) {
        console.error(`Error marking status for date ${date}:`, error);
        res.status(500).json({ message: `Server error marking status for ${date}.` });
    }
});

// 10. Get attendance summary for the logged-in user
app.get('/api/attendance/my-summary', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const [activityResult] = await dbPool.execute(
            'SELECT COUNT(DISTINCT attendance_date) AS daysWithActivity FROM attendance_records WHERE user_id = ?',
            [userId]
        );
        const [statusCountsResult] = await dbPool.execute(
            'SELECT status, COUNT(*) as count FROM attendance_records WHERE user_id = ? GROUP BY status',
            [userId]
        );
        let summary = { daysWithActivity: activityResult[0].daysWithActivity || 0, daysPresent: 0, daysAbsent: 0, daysHoliday: 0 };
        statusCountsResult.forEach(row => {
            if (row.status === 'Present') summary.daysPresent = row.count;
            else if (row.status === 'Absent') summary.daysAbsent = row.count;
        });
        res.json(summary);
    } catch (error) {
        console.error('Error fetching my attendance summary:', error);
        res.status(500).json({ message: 'Server error fetching your attendance summary.' });
    }
});

// 11. Admin: Update User Details
app.put('/api/admin/users/:userId', authenticateToken, isAdmin, async (req, res) => {
    const { userId } = req.params;
    const { fullName, username, role } = req.body;
    if (!fullName || !username || !role) return res.status(400).json({ message: 'Full name, username, and role are required.' });
    try {
        await dbPool.execute('UPDATE users SET full_name = ?, username = ?, role = ? WHERE id = ?', [fullName, username, role, userId]);
        res.json({ message: `User ${fullName} (ID: ${userId}) updated successfully.` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: `Username '${username}' already exists.` });
        console.error(`Error updating user ${userId}:`, error);
        res.status(500).json({ message: 'Server error updating user.' });
    }
});

// 12. Admin: Delete User
app.delete('/api/admin/users/:userId', authenticateToken, isAdmin, async (req, res) => {
    const { userId } = req.params;
    const adminUserId = req.user.userId;
    if (parseInt(userId, 10) === adminUserId) return res.status(400).json({ message: "Error: Admins cannot delete their own account." });
    try {
        const [result] = await dbPool.execute('DELETE FROM users WHERE id = ?', [userId]);
        if (result.affectedRows > 0) res.json({ message: `User with ID ${userId} and all their attendance records have been deleted.` });
        else res.status(404).json({ message: `User with ID ${userId} not found.` });
    } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
        res.status(500).json({ message: 'Server error deleting user.' });
    }
});

// PROFILE PICTURE UPLOAD ENDPOINT 
app.post('/api/profile/update-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    const userId = req.user.userId;
    if (!req.file) return res.status(400).json({ message: 'No profile picture file uploaded.' });
    
    const profilePictureFilename = req.file.filename;

    try {

        const [oldUserData] = await dbPool.execute('SELECT profile_picture_url FROM users WHERE id = ?', [userId]);
        if (oldUserData.length > 0 && oldUserData[0].profile_picture_url) {
            const oldFilePath = path.join(uploadsDir, oldUserData[0].profile_picture_url);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath); 
                console.log(`Deleted old profile picture: ${oldUserData[0].profile_picture_url}`);
            }
        }

        await dbPool.execute(
            'UPDATE users SET profile_picture_url = ? WHERE id = ?',
            [profilePictureFilename, userId]
        );

        res.json({
            message: 'Profile picture updated successfully!',
            profilePictureUrl: profilePictureFilename 
        });
    } catch (error) {
        console.error('Error updating profile picture in DB:', error);
        res.status(500).json({ message: 'Server error updating profile picture.' });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server is listening on http://localhost:${PORT}`);
});