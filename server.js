const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const router = express.Router();
const usersFile = "data.json";
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// Middleware
app.use(express.json()); // Parses JSON bodies
app.use(express.urlencoded({ extended: true })); // Parses form data
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true // Important for allowing cookies to be sent with requests
})); 

// Session middleware - Place this before any routes
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Change to true if using HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(express.static("dist"));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(router);
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    console.log(`Session data:`, req.session);
    next();
});

// Serve static files
app.use(express.static(__dirname)); // Serve login.html
app.use("/dist", express.static(path.join(__dirname, "dist")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Utility functions for reading/writing data
function readData() {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Function to read reservations
function readReservations() {
    if (!fs.existsSync("reservations.json")) {
        return [];
    }
    const data = fs.readFileSync("reservations.json");
    return JSON.parse(data);
}

// Function to save reservations
function saveReservations(reservations) {
    fs.writeFileSync("reservations.json", JSON.stringify(reservations, null, 2));
}

// Function to read sit-ins
function readSitIns() {
    const sitInsPath = path.join(__dirname, "sit-ins.json");
    if (!fs.existsSync(sitInsPath)) {
        fs.writeFileSync(sitInsPath, JSON.stringify([], null, 2));
        return [];
    }
    try {
        const data = fs.readFileSync(sitInsPath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading sit-ins:", error);
        return [];
    }
}

// Function to save sit-ins
function saveSitIns(sitIns) {
    const sitInsPath = path.join(__dirname, "sit-ins.json");
    fs.writeFileSync(sitInsPath, JSON.stringify(sitIns, null, 2));
}

// Ensure uploads folder exists
if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
}

// Serve pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "dist", "views", "register.html")));
app.get("/forgot-password", (req, res) => res.sendFile(path.join(__dirname, "dist", "views", "forgotpassword.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "public", "student.html")));
app.get("/student.html", (req, res) => res.sendFile(path.join(__dirname, "dist", "student.html")));

// Example: Manually serve admin.html if needed
app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(__dirname, "dist2", "admin.html"));
});

// Route: Create new reservation
app.post("/reserve", (req, res) => {
    try {
        const { email, idNumber, purpose, date, time, labRoom, programmingLanguage } = req.body;

        // Validate required fields
        if (!email || !idNumber || !purpose || !date || !time || !labRoom || !programmingLanguage) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const reservations = readReservations();
        const newReservation = {
            id: Date.now(),
            email,
            idNumber,
            purpose,
            date,
            time,
            labRoom,
            programmingLanguage,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        reservations.push(newReservation);
        saveReservations(reservations);

        // Log the reservation activity
        logUserActivity(idNumber, 'Reservation Created', {
            date,
            time,
            labRoom,
            status: 'pending'
        });

        res.json({ success: true, reservation: newReservation });
    } catch (error) {
        console.error("Error creating reservation:", error);
        res.status(500).json({ error: "Failed to create reservation" });
    }
});

// Route: Update reservation status
app.post("/update-reservation-status", async (req, res) => {
    try {
        console.log("Received update request:", req.body);
        // Check for both id and reservationId to be backward compatible
        const reservationId = req.body.reservationId || req.body.id;
        const { status } = req.body;

        if (!reservationId || !status) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: id and status" 
            });
        }

        // Read reservations
        const reservations = readReservations();
        const reservationIndex = reservations.findIndex(r => r.id === parseInt(reservationId));
        
        if (reservationIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: "Reservation not found" 
            });
        }

        const reservation = reservations[reservationIndex];

        // If approving, get user details first
        let userData = null;
        if (status === 'approved') {
            const users = readData();
            userData = users.find(u => u.idNumber === reservation.idNumber);
            
            if (!userData) {
                return res.status(404).json({ 
                    success: false, 
                    message: `User not found with ID: ${reservation.idNumber}` 
                });
            }

            // Check remaining sessions
            if (userData.remainingSessions <= 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: "User has no remaining sessions" 
                });
            }

            // Update user's remaining sessions
            userData.remainingSessions--;
            const updatedUsers = users.map(u => 
                u.idNumber === userData.idNumber ? userData : u
            );
            writeData(updatedUsers);

            // Update chart data for the approved reservation
            updateDailyChartData(reservation.programmingLanguage, reservation.labRoom);
        }

        // Update reservation status
        reservation.status = status;
        reservations[reservationIndex] = reservation;
        saveReservations(reservations);

        let newSitIn = null;
        // If the reservation is approved, create sit-in record
        if (status === 'approved' && userData) {
            let sitIns = readSitIns();
            
            newSitIn = {
                id: Date.now(),
                idNumber: reservation.idNumber,
                name: `${userData.firstName} ${userData.lastName}`,
                course: userData.course,
                year: userData.year,
                date: reservation.date,
                timeIn: reservation.time,
                timeOut: null,
                labRoom: reservation.labRoom,
                programmingLanguage: reservation.programmingLanguage,
                purpose: reservation.purpose,
                status: 'active'
            };
            sitIns.push(newSitIn);
            saveSitIns(sitIns);

            // Log the sit-in creation
            logUserActivity(reservation.idNumber, 'Sit-in Started', {
                date: reservation.date,
                timeIn: reservation.time,
                labRoom: reservation.labRoom,
                status: 'active'
            });
        }

        res.json({ 
            success: true, 
            message: status === 'approved' ? 
                "Reservation approved and sit-in session created successfully" : 
                "Reservation status updated successfully"
        });
    } catch (error) {
        console.error("Error updating reservation status:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error updating reservation status",
            error: error.message || "Unknown error occurred"
        });
    }
});

// Route: Admin view all reservations
app.get("/reservations", (req, res) => {
    console.log("Fetching all reservations for admin panel");
    const reservationsPath = path.join(__dirname, "reservations.json");
    console.log("Reservations file path:", reservationsPath);
    
    if (!fs.existsSync(reservationsPath)) {
        console.log("Reservations file does not exist");
        return res.json([]);
    }
    
    try {
        const fileContent = fs.readFileSync(reservationsPath, "utf-8");
        console.log("Raw file content:", fileContent);
        const reservations = JSON.parse(fileContent);
        console.log("Loaded", reservations.length, "reservations for admin panel");
        res.json(reservations);
    } catch (error) {
        console.error("Error reading reservations file:", error);
        return res.status(500).json({ 
            message: "Error loading reservations", 
            error: error.message 
        });
    }
});

// **User Authentication**
app.post("/login", async (req, res) => {
    console.log("Login attempt:", req.body);

    const { identifier, password } = req.body;
    let users = readData(); // Read user data from data.json

    // ✅ Admin Login (Separate from Students)
    if (identifier === "admin" && password === "users") {
        req.session.user = { idNumber: "admin", role: "admin" };
        console.log("🔒 Admin logged in:", req.session.user);
        
        // Save the session explicitly
        req.session.save(err => {
            if (err) {
                console.error("Error saving admin session:", err);
                return res.status(500).json({ message: "Failed to save session" });
            }
            
            console.log("Admin session saved successfully, session id:", req.session.id);
            return res.json({ userId: "admin", redirect: "/admin.html" });
        });
        return; // Don't continue execution
    }

    // ✅ Student Login
    const user = users.find(user => user.idNumber === identifier || user.email === identifier);
    if (!user) return res.status(401).json({ message: "User not found!" });

    console.log("✅ Found user:", user.idNumber);

    try {
        // ✅ Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid password!" });

        // ✅ Store student session
        req.session.user = { idNumber: user.idNumber, role: "student" };
        console.log("🔒 Student session stored:", req.session.user);

        return res.json({ userId: user.idNumber, redirect: `/student.html?id=${user.idNumber}` });

    } catch (error) {
        return res.status(500).json({ message: "Error comparing passwords" });
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
    });
});

// **User Registration**
app.post("/register", async (req, res) => {
    const { idNumber, firstName, middleName, lastName, email, year, course, password } = req.body;

    if (!idNumber || !firstName || !lastName || !email || !year || !course || !password) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    let users = readData();

    if (users.some(user => user.idNumber === idNumber)) {
        return res.status(400).json({ message: "User already exists!" });
    }

    try {
        // ✅ Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine initial sessions based on course
        const isComputerCourse = course.toLowerCase().includes('computer') || 
                                course.toLowerCase().includes('information') || 
                                course.toLowerCase().includes('software');
        const initialSessions = isComputerCourse ? 30 : 15;

        const newUser = { 
            idNumber, 
            firstName, 
            middleName, 
            lastName, 
            email, 
            year, 
            course, 
            password: hashedPassword, // Store the hashed password
            completedSessions: 0,
            pendingReservations: 0,
            remainingSessions: initialSessions
        };

        users.push(newUser);
        writeData(users);

        res.status(201).json({ message: "Registration successful!", redirect: "/" });

    } catch (error) {
        res.status(500).json({ message: "Error hashing password" });
    }
});

// **Password Reset**
app.post("/reset-password", async (req, res) => {
    const { idNumber, newPassword } = req.body;
    if (!idNumber || !newPassword) return res.status(400).json({ message: "All fields are required!" });

    let users = readData();
    const userIndex = users.findIndex(user => user.idNumber === idNumber);

    if (userIndex === -1) return res.status(404).json({ message: "User not found!" });

    users[userIndex].password = await bcrypt.hash(newPassword, 10);
    writeData(users);

    res.status(200).json({ message: "Password reset successful!" });
});

app.post("/validate-password", (req, res) => {
    const { idNumber, currentPassword } = req.body;

    if (!idNumber || !currentPassword) {
        return res.status(400).json({ valid: false });
    }

    // Read user data
    fs.readFile("data.json", "utf8", (err, data) => {
        if (err) {
            console.error("Error reading data.json:", err);
            return res.status(500).json({ valid: false });
        }

        try {
            let users = JSON.parse(data);
            let user = users.find(u => u.idNumber === idNumber);

            if (!user) {
                return res.status(404).json({ valid: false });
            }

            // Compare hashed password
            const isMatch = bcrypt.compareSync(currentPassword, user.password);
            res.json({ valid: isMatch });
        } catch (error) {
            console.error("Error validating password:", error);
            res.status(500).json({ valid: false });
        }
    });
});

app.post("/change-password", (req, res) => {
    const { idNumber, currentPassword, newPassword } = req.body;

    if (!idNumber || !currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Read user data
    fs.readFile("data.json", "utf8", (err, data) => {
        if (err) {
            console.error("Error reading data.json:", err);
            return res.status(500).json({ success: false, message: "Server error" });
        }

        let users = JSON.parse(data);
        let user = users.find(u => u.idNumber === idNumber);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        console.log("Stored Password:", user.password);
        console.log("Entered Current Password:", currentPassword);

        // Compare hashed password
        const isMatch = bcrypt.compareSync(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect current password" });
        }

        // **✅ Corrected: Update user password AFTER checking**
        user.password = bcrypt.hashSync(newPassword, 10);

        // Save updated data
        fs.writeFile("data.json", JSON.stringify(users, null, 2), (err) => {
            if (err) {
                console.error("Error updating password:", err);
                return res.status(500).json({ success: false, message: "Failed to update password" });
            }
            console.log("Password updated successfully for user:", idNumber);
            res.json({ success: true, message: "Password updated successfully" });
        });
    });
});

// **Profile Management**
app.get("/get-profile", (req, res) => {
    try {
        const userId = req.query.id;
        console.log("Fetching profile for user ID:", userId);
        
        if (!userId) {
            console.error("No user ID provided");
            return res.status(400).json({ error: "User ID is required!" });
        }

        let users = readData();
        console.log("Total users in database:", users.length);
        
        const user = users.find(user => user.idNumber === userId);
        console.log("User found:", user ? "Yes" : "No");

        if (!user) {
            console.error("User not found with ID:", userId);
            return res.status(404).json({ error: "User not found!" });
        }

        const response = {
            idNumber: user.idNumber,
            firstName: user.firstName,
            middleName: user.middleName || "",
            lastName: user.lastName,
            email: user.email,
            year: user.year,
            course: user.course,
            profileImage: user.profileImage || "/uploads/default.png",
            remainingSessions: user.remainingSessions || 0
        };
        
        console.log("Sending profile data:", response);
        res.json(response);
    } catch (error) {
        console.error("Error in get-profile endpoint:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// Load and update the profile in data.json
router.post("/update-profile", (req, res) => {
    console.log("Received update request:", req.body);

    if (!req.body || !req.body.oldIdNumber) {
        console.error("Invalid request data!");
        return res.status(400).json({ success: false, message: "Invalid request data" });
    }

    fs.readFile("data.json", "utf8", (err, data) => {
        if (err) {
            console.error("Error reading data.json:", err);
            return res.status(500).json({ success: false, message: "Server error" });
        }

        let users = JSON.parse(data);
        console.log("Existing Users:", users);

        const index = users.findIndex(user => String(user.idNumber) === String(req.body.oldIdNumber));
        console.log("User found at index:", index);

        if (index !== -1) {
            users[index] = { ...users[index], ...req.body }; 
            delete users[index].oldIdNumber; 

            fs.writeFile("data.json", JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    console.error("Error saving profile:", err);
                    return res.status(500).json({ success: false, message: "Failed to save profile" });
                }
                console.log("Profile updated successfully!");
                res.json({ success: true });
            });
        } else {
            console.error("User not found!");
            res.status(404).json({ success: false, message: "User not found" });
        }
    });
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // Save files in the "uploads" folder
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname); // Unique filename
    }
});

const upload = multer({ storage: storage });

// Endpoint to upload profile picture
app.post("/upload-profile", upload.single("profileImage"), (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: "User ID is required." });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded." });
        }

        const filePath = `/uploads/${req.file.filename}`; // Path to the uploaded file

        // Read user data from data.json
        let users = readData();
        const userIndex = users.findIndex(user => user.idNumber === userId);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        // Update the user's profile image path
        users[userIndex].profileImage = filePath;
        writeData(users); // Save the updated data

        res.json({ success: true, imagePath: users[userIndex].profileImage });
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
});

// Serve static files from the "uploads" folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// server.js
app.get("/get-user", (req, res) => {
    const { id } = req.query;

    try {
        const users = readData();
        const user = users.find(user => user.idNumber === id);

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found!" });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
});

// Route: Get all users (admin only)
app.get("/get-all-users", (req, res) => {
    try {
        const users = readData();
        // Filter out sensitive information
        const sanitizedUsers = users.map(user => ({
            idNumber: user.idNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
            email: user.email,
            course: user.course,
            year: user.year,
            profileImage: user.profileImage || "/uploads/default.png"
        }));
        res.json(sanitizedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error fetching users" });
    }
});

// Route: Get all sit-ins
app.get("/sit-ins", (req, res) => {
    try {
        const sitIns = readSitIns();
        console.log("Retrieved sit-ins:", sitIns); // Add logging
        res.json(sitIns);
    } catch (error) {
        console.error("Error handling sit-ins:", error);
        res.status(500).json({ message: "Error fetching sit-ins data", error: error.message });
    }
});

// Route: Update sit-in status
app.post("/update-sit-in-status", (req, res) => {
    try {
        console.log("Updating sit-in status:", req.body);
        const { sitInId, status, timeOut } = req.body;
        
        if (!sitInId || !status) {
            return res.status(400).json({ 
                success: false, 
                message: "sitInId and status are required" 
            });
        }

        let sitIns = readSitIns();
        const sitInIndex = sitIns.findIndex(s => s.id === parseInt(sitInId));
        
        if (sitInIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: "Sit-in not found" 
            });
        }

        // If completing the sit-in, remove it from the list
        if (status === 'completed') {
            // Log the sit-in completion before removing
            logUserActivity(sitIns[sitInIndex].idNumber, 'Sit-in Completed', {
                date: sitIns[sitInIndex].date,
                timeIn: sitIns[sitInIndex].timeIn,
                timeOut: timeOut || new Date().toISOString(),
                labRoom: sitIns[sitInIndex].labRoom
            });

            // Remove the sit-in from the array
            sitIns.splice(sitInIndex, 1);
        } else {
            // For other status updates, just update the status
            sitIns[sitInIndex].status = status;
        }

        // Save the updated sit-ins
        saveSitIns(sitIns);

        res.json({ 
            success: true, 
            message: status === 'completed' ? 
                "Sit-in completed and removed successfully" : 
                "Sit-in status updated successfully",
            sitIn: status === 'completed' ? null : sitIns[sitInIndex]
        });
    } catch (error) {
        console.error("Error updating sit-in status:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update sit-in status",
            error: error.message 
        });
    }
});

// Helper functions for feedback
function readFeedback() {
    try {
        const feedbackPath = "data/feedback.json";
        if (!fs.existsSync("data")) {
            fs.mkdirSync("data");
        }
        if (!fs.existsSync(feedbackPath)) {
            fs.writeFileSync(feedbackPath, JSON.stringify([], null, 2), "utf8");
            return [];
        }
        const data = fs.readFileSync(feedbackPath, "utf8");
        return JSON.parse(data) || [];
    } catch (error) {
        console.error("Error reading feedback:", error);
        return [];
    }
}

function writeFeedback(feedback) {
    try {
        if (!fs.existsSync("data")) {
            fs.mkdirSync("data");
        }
        fs.writeFileSync("data/feedback.json", JSON.stringify(feedback || [], null, 2), "utf8");
    } catch (error) {
        console.error("Error writing feedback:", error);
        throw error;
    }
}

// Route: Submit feedback
app.post("/submit-feedback", async (req, res) => {
    try {
        const { userId, sitInId, type, message, laboratory, date } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const feedback = {
            id: uuidv4(),
            userId,
            sitInId,
            type,
            message,
            laboratory,
            date: date || new Date().toISOString()
        };

        // Read existing feedback
        let feedbackData = readFeedback();

        // Add new feedback
        feedbackData.push(feedback);

        // Save updated feedback data
        writeFeedback(feedbackData);

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            feedback
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Route: Get all feedback (admin only)
app.get("/feedback", (req, res) => {
    try {
        const feedback = readFeedback();
        res.json(feedback);
    } catch (error) {
        console.error("Error fetching feedback:", error);
        res.status(500).json({ error: "Failed to fetch feedback" });
    }
});

// Helper functions for announcements
function readAnnouncements() {
    try {
        if (!fs.existsSync("announcements.json")) {
            fs.writeFileSync("announcements.json", JSON.stringify([], null, 2), "utf8");
            return [];
        }
        const data = fs.readFileSync("announcements.json", "utf8");
        return JSON.parse(data) || [];
    } catch (error) {
        console.error("Error reading announcements:", error);
        return [];
    }
}

function writeAnnouncements(announcements) {
    try {
        fs.writeFileSync("announcements.json", JSON.stringify(announcements || [], null, 2), "utf8");
    } catch (error) {
        console.error("Error writing announcements:", error);
        throw error;
    }
}

// Route: Get all announcements
app.get("/get-announcements", (req, res) => {
    try {
        const announcements = readAnnouncements();
        res.json(announcements);
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).json({ error: "Failed to fetch announcements" });
    }
});

// Route: Post new announcement
app.post("/post-announcement", (req, res) => {
    try {
        const { title, message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        const announcements = readAnnouncements();
        const newAnnouncement = {
            id: Date.now(),
            title,
            message,
            date: new Date().toISOString()
        };

        announcements.unshift(newAnnouncement);
        writeAnnouncements(announcements);

        res.json({ success: true, announcement: newAnnouncement });
    } catch (error) {
        console.error("Error posting announcement:", error);
        res.status(500).json({ error: "Failed to post announcement" });
    }
});

// Route: Delete announcement
app.delete("/delete-announcement/:id", (req, res) => {
    try {
        const { id } = req.params;
        const announcements = readAnnouncements();
        const index = announcements.findIndex(a => a.id === parseInt(id));

        if (index === -1) {
            return res.status(404).json({ error: "Announcement not found" });
        }

        announcements.splice(index, 1);
        writeAnnouncements(announcements);

        res.json({ success: true, message: "Announcement deleted successfully" });
    } catch (error) {
        console.error("Error deleting announcement:", error);
        res.status(500).json({ error: "Failed to delete announcement" });
    }
});

// Get a single announcement
router.get("/get-announcement/:id", (req, res) => {
    try {
        const announcements = readAnnouncements();
        const announcement = announcements.find(a => a.id === parseInt(req.params.id));
        
        if (!announcement) {
            return res.status(404).json({ error: "Announcement not found" });
        }
        
        res.json(announcement);
    } catch (error) {
        console.error("Error getting announcement:", error);
        res.status(500).json({ error: "Error getting announcement" });
    }
});

// Update an announcement
router.put("/update-announcement/:id", (req, res) => {
    try {
        const announcements = readAnnouncements();
        const index = announcements.findIndex(a => a.id === parseInt(req.params.id));
        
        if (index === -1) {
            return res.status(404).json({ error: "Announcement not found" });
        }
        
        const { title, message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }
        
        announcements[index] = {
            ...announcements[index],
            title,
            message,
            date: new Date().toISOString()
        };
        
        writeAnnouncements(announcements);
        res.json({ message: "Announcement updated successfully" });
    } catch (error) {
        console.error("Error updating announcement:", error);
        res.status(500).json({ error: "Error updating announcement" });
    }
});

// Delete an announcement
router.delete("/delete-announcement/:id", (req, res) => {
    try {
        const announcements = readAnnouncements();
        const filteredAnnouncements = announcements.filter(a => a.id !== parseInt(req.params.id));
        
        if (filteredAnnouncements.length === announcements.length) {
            return res.status(404).json({ error: "Announcement not found" });
        }
        
        writeAnnouncements(filteredAnnouncements);
        res.json({ message: "Announcement deleted successfully" });
    } catch (error) {
        console.error("Error deleting announcement:", error);
        res.status(500).json({ error: "Error deleting announcement" });
    }
});

// Function to read activity data
function readActivityData() {
    try {
        if (!fs.existsSync('data/activity.json')) {
            fs.writeFileSync('data/activity.json', '[]', 'utf8');
            return [];
        }
        const data = fs.readFileSync('data/activity.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading activity data:', error);
        return [];
    }
}

// Function to write activity data
function writeActivityData(data) {
    try {
        fs.writeFileSync('data/activity.json', JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing activity data:', error);
    }
}

// Function to log user activity
function logUserActivity(userId, type, details = {}) {
    try {
        const activities = readActivityData();
        const newActivity = {
            id: Date.now(),
            userId,
            type,
            details,
            date: new Date().toISOString()
        };
        activities.unshift(newActivity); // Add to beginning (newest first)
        
        // Keep only last 100 activities per user to manage storage
        const userActivities = activities.filter(a => a.userId === userId);
        if (userActivities.length > 100) {
            const keepIds = new Set(userActivities.slice(0, 100).map(a => a.id));
            activities = activities.filter(a => a.userId !== userId || keepIds.has(a.id));
        }
        
        writeActivityData(activities);
        return newActivity;
    } catch (error) {
        console.error('Error logging user activity:', error);
        return null;
    }
}

// Route: Get user's recent activity
app.get("/get-recent-activity/:userId", (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const activities = readActivityData();
        const userActivities = activities
            .filter(activity => activity.userId === userId)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Get 10 most recent activities

        res.json(userActivities);
    } catch (error) {
        console.error("Error fetching user activity:", error);
        res.status(500).json({ error: "Failed to fetch user activity" });
    }
});

// Function to read reset logs
function readResetLogs() {
    try {
        const logsPath = "data/reset-logs.json";
        if (!fs.existsSync("data")) {
            fs.mkdirSync("data");
        }
        if (!fs.existsSync(logsPath)) {
            fs.writeFileSync(logsPath, JSON.stringify([], null, 2), "utf8");
            return [];
        }
        const data = fs.readFileSync(logsPath, "utf8");
        return JSON.parse(data) || [];
    } catch (error) {
        console.error("Error reading reset logs:", error);
        return [];
    }
}

// Function to save reset logs
function saveResetLogs(logs) {
    try {
        const logsPath = "data/reset-logs.json";
        if (!fs.existsSync("data")) {
            fs.mkdirSync("data");
        }
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving reset logs:", error);
    }
}

// Endpoint to export logs
app.post("/export-logs", (req, res) => {
    try {
        const logs = readResetLogs();
        
        // Convert logs to CSV format
        const csvHeader = "Timestamp,Reset Type,Details,Admin ID\n";
        const csvRows = logs.map(log => {
            const details = log.details ? JSON.stringify(log.details) : '';
            return `${log.timestamp},${log.resetType},${details},${log.adminId || 'Unknown'}`;
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=reset_logs_${new Date().toISOString().split('T')[0]}.csv`);
        
        // Send the CSV content
        res.send(csvContent);
    } catch (error) {
        console.error("Error exporting logs:", error);
        res.status(500).json({ success: false, error: "Failed to export logs" });
    }
});

// Endpoint to reset logs
app.post("/reset-logs", (req, res) => {
    try {
        // Save empty array to reset logs
        saveResetLogs([]);
        res.json({ success: true, message: "Logs reset successfully" });
    } catch (error) {
        console.error("Error resetting logs:", error);
        res.status(500).json({ success: false, error: "Failed to reset logs" });
    }
});

// Route: Check admin authentication
app.get("/check-admin", (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ isAdmin: false });
        }
        
        const isAdmin = req.session.user.role === 'admin';
        res.json({ isAdmin });
    } catch (error) {
        console.error("Error checking admin auth:", error);
        res.status(500).json({ isAdmin: false });
    }
});

// Add new endpoint to check and handle auto-logouts
app.get("/check-auto-logouts", (req, res) => {
    try {
        const sitIns = readSitIns();
        const now = new Date();
        let loggedOutUsers = [];

        // Find and update sit-ins that need to be logged out
        sitIns.forEach(sitIn => {
            if (sitIn.status === 'active' && sitIn.autoLogoutTime) {
                const logoutTime = new Date(sitIn.autoLogoutTime);
                if (now >= logoutTime) {
                    sitIn.status = 'completed';
                    loggedOutUsers.push({
                        idNumber: sitIn.idNumber,
                        timeOut: sitIn.timeOut
                    });
                    
                    // Log the automatic logout
                    logUserActivity(sitIn.idNumber, 'Auto Logout', {
                        date: sitIn.date,
                        timeIn: sitIn.timeIn,
                        timeOut: sitIn.timeOut,
                        labRoom: sitIn.labRoom
                    });
                }
            }
        });

        // Save updated sit-ins
        if (loggedOutUsers.length > 0) {
            saveSitIns(sitIns);
        }

        res.json({ 
            success: true, 
            loggedOutUsers 
        });
    } catch (error) {
        console.error("Error checking auto-logouts:", error);
        res.status(500).json({ message: "Error checking auto-logouts" });
    }
});

// Route to get reset statistics
app.get("/reset-stats", (req, res) => {
  // Check if user is authenticated and is an admin
  if (!req.session || !req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ 
      success: false, 
      message: "Unauthorized. Only administrators can access reset statistics." 
    });
  }
  
  try {
    // Get all reset logs
    const resetLogs = readResetLogs();
    
    // Calculate total number of resets
    const total = resetLogs.length;
    
    // Calculate today's resets
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResets = resetLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= today;
    }).length;
    
    // Get last reset time (most recent log)
    const lastReset = resetLogs.length > 0 ? 
      resetLogs[0].timestamp : null;
    
    return res.status(200).json({
      success: true,
      total,
      today: todayResets,
      lastReset
    });
    
  } catch (error) {
    console.error("Error getting reset statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get reset statistics"
    });
  }
});

// Route to create sit-in without reservation (for admin walk-ins)
app.post("/create-walkin", (req, res) => {
    try {
        console.log("Creating walk-in sit-in:", req.body);
        const { 
            idNumber, name, course, year, 
            purpose, programmingLanguage,
            otherPurpose, otherLanguage
        } = req.body;
        
        if (!idNumber || !purpose) {
            return res.status(400).json({ 
                success: false, 
                message: "Student ID and purpose are required" 
            });
        }

        // Get current sit-ins
        let sitIns = readSitIns();
        
        // Check if student already has an active sit-in
        const existingSitIn = sitIns.find(s => 
            s.idNumber === idNumber && s.status === 'active'
        );
        
        if (existingSitIn) {
            return res.status(400).json({ 
                success: false, 
                message: "Student already has an active sit-in session" 
            });
        }
        
        // Create new sit-in
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const timeString = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;
        
        // Create a sit-in record
        const newSitIn = {
            id: Date.now(),
            idNumber: idNumber,
            name: name,
            course: course,
            year: year,
            date: dateString,
            timeIn: timeString,
            timeOut: null,
            labRoom: "Walk-in",
            programmingLanguage: programmingLanguage === "Other" ? otherLanguage : programmingLanguage,
            purpose: purpose === "Other" ? otherPurpose : purpose,
            status: 'active',
            autoLogoutTime: null,
            isWalkIn: true
        };
        
        sitIns.push(newSitIn);
        saveSitIns(sitIns);
        
        // Log the walk-in sit-in creation
        logUserActivity(idNumber, 'Walk-in Sit-in Started', {
            date: dateString,
            timeIn: timeString,
            labRoom: "Walk-in",
            status: 'active',
            isWalkIn: true
        });
        
        res.json({ 
            success: true, 
            message: "Walk-in sit-in created successfully",
            sitIn: newSitIn
        });
    } catch (error) {
        console.error("Error creating walk-in sit-in:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error creating walk-in sit-in",
            error: error.message || "Unknown error occurred"
        });
    }
});

// Endpoint to get reset logs
app.get("/reset-logs", (req, res) => {
    try {
        // Check if user is authenticated and is an admin
        if (!req.session || !req.session.user || req.session.user.role !== "admin") {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized. Only administrators can view reset logs." 
            });
        }

        const logs = readResetLogs();
        res.json({ success: true, logs });
    } catch (error) {
        console.error("Error fetching reset logs:", error);
        res.status(500).json({ success: false, error: "Failed to fetch reset logs" });
    }
});

// Function to log a session reset operation
function logSessionReset(adminId, resetType, details) {
    try {
        const logs = readResetLogs();
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            adminId: adminId,
            resetType: resetType, // 'user' or 'semester'
            details: details,
        };
        
        logs.unshift(logEntry); // Add to beginning of array (newest first)
        
        // Keep only the last 100 logs to avoid the file growing too large
        const trimmedLogs = logs.slice(0, 100);
        saveResetLogs(trimmedLogs);
        
        return logEntry;
    } catch (error) {
        console.error('Error logging session reset:', error);
        return null;
    }
}

// Function to reset sessions (either by semester or by individual user)
function resetSessions(idNumber = null, semester = null, adminId = 'admin') {
    try {
        // Read current sit-ins, reservations, and users
        const sitIns = readSitIns();
        const reservations = readReservations();
        const users = readData();
        
        let updatedSitIns = [...sitIns];
        let updatedReservations = [...reservations];
        let updatedUsers = [...users];
        let resetDetails = {};
        
        // If semester is provided, reset all sessions for that semester
        if (semester) {
            // For a semester reset, we would typically clear all reservations
            // and completed sit-ins, assuming semesters align with dates
            
            // Define semester date ranges based on the semester value
            const semesterDateRanges = {
                'First Semester': { start: '2024-08-01', end: '2024-12-31' },
                'Second Semester': { start: '2025-01-01', end: '2025-05-31' },
                'Summer': { start: '2025-06-01', end: '2025-07-31' },
            };
            
            const semesterRange = semesterDateRanges[semester];
            
            if (!semesterRange) {
                throw new Error('Invalid semester specified');
            }
            
            // Filter out reservations and sit-ins from the specified semester
            const filteredReservations = reservations.filter(res => {
                const resDate = new Date(res.date);
                const startDate = new Date(semesterRange.start);
                const endDate = new Date(semesterRange.end);
                
                return !(resDate >= startDate && resDate <= endDate);
            });
            
            const filteredSitIns = sitIns.filter(sitIn => {
                const sitInDate = new Date(sitIn.date);
                const startDate = new Date(semesterRange.start);
                const endDate = new Date(semesterRange.end);
                
                return !(sitInDate >= startDate && sitInDate <= endDate);
            });

            // Reset remaining sessions for all students
            updatedUsers = users.map(user => {
                const isComputerCourse = user.course.toLowerCase().includes('computer') || 
                                        user.course.toLowerCase().includes('information') || 
                                        user.course.toLowerCase().includes('software');
                const initialSessions = isComputerCourse ? 30 : 15;
                
                return {
                    ...user,
                    completedSessions: 0,
                    pendingReservations: 0,
                    remainingSessions: initialSessions
                };
            });
            
            resetDetails = {
                semester: semester,
                dateRange: semesterRange,
                reservationsRemoved: reservations.length - filteredReservations.length,
                sitInsRemoved: sitIns.length - filteredSitIns.length,
                usersReset: users.length
            };
            
            updatedReservations = filteredReservations;
            updatedSitIns = filteredSitIns;
            
        } 
        // If idNumber is provided, reset sessions for that specific user
        else if (idNumber) {
            // Remove all reservations and sit-ins for the specified user
            const filteredReservations = reservations.filter(res => res.idNumber !== idNumber);
            const filteredSitIns = sitIns.filter(sitIn => sitIn.idNumber !== idNumber);
            
            // Reset remaining sessions for the specific user
            const userIndex = users.findIndex(u => u.idNumber === idNumber);
            if (userIndex !== -1) {
                const user = users[userIndex];
                const isComputerCourse = user.course.toLowerCase().includes('computer') || 
                                        user.course.toLowerCase().includes('information') || 
                                        user.course.toLowerCase().includes('software');
                const initialSessions = isComputerCourse ? 30 : 15;
                
                updatedUsers[userIndex] = {
                    ...user,
                    completedSessions: 0,
                    pendingReservations: 0,
                    remainingSessions: initialSessions
                };
            }
            
            resetDetails = {
                userId: idNumber,
                reservationsRemoved: reservations.length - filteredReservations.length,
                sitInsRemoved: sitIns.length - filteredSitIns.length,
                userReset: true
            };
            
            updatedReservations = filteredReservations;
            updatedSitIns = filteredSitIns;
            
        } else {
            throw new Error('Either idNumber or semester must be provided');
        }
        
        // Save the updated data
        saveReservations(updatedReservations);
        saveSitIns(updatedSitIns);
        writeData(updatedUsers); // Save the updated users data
        
        // Log the reset operation
        const resetType = idNumber ? 'user' : 'semester';
        const logEntry = logSessionReset(adminId, resetType, resetDetails);
        
        return {
            success: true,
            message: idNumber 
                ? `Sessions reset successfully for user ${idNumber}` 
                : `Sessions reset successfully for ${semester}`,
            details: resetDetails,
            logId: logEntry ? logEntry.id : null
        };
    } catch (error) {
        console.error('Error resetting sessions:', error);
        return {
            success: false,
            message: error.message || 'Failed to reset sessions'
        };
    }
}

// Route to reset sessions
app.post("/reset-sessions", (req, res) => {
    const { idNumber, semester } = req.body;
    
    console.log("Reset Sessions Request:", { idNumber, semester });
    console.log("Session:", req.session);
    
    // Check if user is authenticated and is an admin
    if (!req.session || !req.session.user || req.session.user.role !== "admin") {
        console.log("Authorization failed:", {
            hasSession: !!req.session,
            hasUser: req.session && !!req.session.user,
            role: req.session && req.session.user ? req.session.user.role : 'none'
        });
        
        return res.status(403).json({ 
            success: false, 
            message: "Unauthorized. Only administrators can reset sessions." 
        });
    }
    
    // Ensure at least one parameter is provided
    if (!idNumber && !semester) {
        return res.status(400).json({ 
            success: false, 
            message: "Either idNumber or semester must be provided" 
        });
    }
    
    // Call the reset function with admin ID
    const adminId = req.session.user.idNumber;
    const result = resetSessions(idNumber, semester, adminId);
    
    if (result.success) {
        return res.status(200).json(result);
    } else {
        return res.status(500).json(result);
    }
});

// Function to read chart data
function readChartData() {
    try {
        if (!fs.existsSync('data/chart-data.json')) {
            const initialData = {
                daily: {
                    languages: {},
                    labRooms: {}
                }
            };
            fs.writeFileSync('data/chart-data.json', JSON.stringify(initialData, null, 2));
            return initialData;
        }
        const data = fs.readFileSync('data/chart-data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading chart data:', error);
        return {
            daily: {
                languages: {},
                labRooms: {}
            }
        };
    }
}

// Function to save chart data
function saveChartData(data) {
    try {
        fs.writeFileSync('data/chart-data.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving chart data:', error);
    }
}

// Function to update daily chart data
function updateDailyChartData(language, labRoom) {
    const chartData = readChartData();
    const today = new Date().toISOString().split('T')[0];

    // Initialize today's data if it doesn't exist
    if (!chartData.daily.languages[today]) {
        chartData.daily.languages[today] = {};
    }
    if (!chartData.daily.labRooms[today]) {
        chartData.daily.labRooms[today] = {};
    }

    // Update language count
    chartData.daily.languages[today][language] = (chartData.daily.languages[today][language] || 0) + 1;

    // Update lab room count
    chartData.daily.labRooms[today][labRoom] = (chartData.daily.labRooms[today][labRoom] || 0) + 1;

    // Keep only the last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Clean up old data
    Object.keys(chartData.daily.languages).forEach(date => {
        if (date < thirtyDaysAgoStr) {
            delete chartData.daily.languages[date];
        }
    });

    Object.keys(chartData.daily.labRooms).forEach(date => {
        if (date < thirtyDaysAgoStr) {
            delete chartData.daily.labRooms[date];
        }
    });

    saveChartData(chartData);
}

// Function to get today's sit-in statistics
function getTodaySitInStats() {
    try {
        const sitIns = readSitIns();
        const today = new Date().toISOString().split('T')[0];
        
        // Filter today's sit-ins
        const todaySitIns = sitIns.filter(sitIn => sitIn.date === today);
        
        // Calculate language statistics
        const languageStats = {};
        todaySitIns.forEach(sitIn => {
            languageStats[sitIn.programmingLanguage] = (languageStats[sitIn.programmingLanguage] || 0) + 1;
        });
        
        // Calculate lab room statistics
        const labRoomStats = {};
        todaySitIns.forEach(sitIn => {
            labRoomStats[sitIn.labRoom] = (labRoomStats[sitIn.labRoom] || 0) + 1;
        });
        
        return {
            languages: languageStats,
            labRooms: labRoomStats,
            totalSitIns: todaySitIns.length
        };
    } catch (error) {
        console.error('Error getting today\'s sit-in statistics:', error);
        return {
            languages: {},
            labRooms: {},
            totalSitIns: 0
        };
    }
}

// Route to get chart data
app.get("/chart-data", (req, res) => {
    try {
        // Get today's statistics from sit-ins
        const todayStats = getTodaySitInStats();
        
        // Get historical chart data
        const chartData = readChartData();
        
        // Combine today's data with historical data
        const today = new Date().toISOString().split('T')[0];
        chartData.daily.languages[today] = todayStats.languages;
        chartData.daily.labRooms[today] = todayStats.labRooms;
        
        res.json({
            daily: chartData.daily,
            today: {
                languages: todayStats.languages,
                labRooms: todayStats.labRooms,
                totalSitIns: todayStats.totalSitIns
            }
        });
    } catch (error) {
        console.error("Error fetching chart data:", error);
        res.status(500).json({ error: "Failed to fetch chart data" });
    }
});

// **Start the server**
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
