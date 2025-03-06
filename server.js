const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const router = express.Router();
const usersFile = "data.json";
const cors = require("cors");

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
    credentials: true
})); 
app.use(express.static("dist"));
app.use(router);
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Change to true if using HTTPS
}));
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
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
    if (!fs.existsSync("sit-ins.json")) {
        return [];
    }
    const data = fs.readFileSync("sit-ins.json");
    return JSON.parse(data);
}

// Function to save sit-ins
function saveSitIns(sitIns) {
    fs.writeFileSync("sit-ins.json", JSON.stringify(sitIns, null, 2));
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

// Route: Make a reservation
app.post("/reserve", async (req, res) => {
    console.log("Received reservation request body:", req.body);
    const { email, idNumber, purpose, date, time } = req.body;

    // Validate required fields
    if (!email || !idNumber || !purpose || !date || !time) {
        console.error("Missing required fields:", { email, idNumber, purpose, date, time });
        return res.status(400).json({ 
            message: "Missing required fields", 
            details: { email, idNumber, purpose, date, time } 
        });
    }

    try {
        // Load users from data.json
        console.log("Reading users from data.json...");
        const users = JSON.parse(fs.readFileSync("data.json", "utf-8"));
        console.log("Loaded users from database");

        // Find the user by email or idNumber
        const user = users.find((u) => u.email === email || u.idNumber === idNumber);
        if (!user) {
            console.error("User not found with email:", email, "or idNumber:", idNumber);
            return res.status(404).json({ 
                message: "User not found!", 
                details: { email, idNumber } 
            });
        }

        console.log("User found:", user.firstName, user.lastName);

        // Load existing reservations or create new array
        let reservations = [];
        if (fs.existsSync("reservations.json")) {
            console.log("Reading existing reservations...");
            reservations = JSON.parse(fs.readFileSync("reservations.json", "utf-8"));
            console.log("Loaded existing reservations");
        }

        // Create new reservation with unique ID and status
        const newReservation = {
            id: Date.now(), // Unique ID for the reservation
            idNumber: user.idNumber,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            course: user.course,
            year: user.year,
            purpose,
            date,
            time,
            status: "pending" // Default status
        };

        console.log("Creating new reservation:", newReservation);

        // Add new reservation
        reservations.push(newReservation);

        // Save updated reservations
        console.log("Saving reservations to file...");
        fs.writeFileSync("reservations.json", JSON.stringify(reservations, null, 2));
        console.log("Saved reservation successfully");

        res.json({ 
            message: "Reservation successful!",
            reservation: newReservation
        });
    } catch (error) {
        console.error("Error processing reservation:", error);
        res.status(500).json({ 
            message: "Error processing reservation", 
            error: error.message,
            stack: error.stack
        });
    }
});

// Route: Update reservation status
app.post("/update-reservation-status", (req, res) => {
    const { reservationId, status } = req.body;

    try {
        if (!fs.existsSync("reservations.json")) {
            return res.status(404).json({ message: "No reservations found" });
        }

        const reservations = JSON.parse(fs.readFileSync("reservations.json", "utf-8"));
        const reservationIndex = reservations.findIndex(r => r.id === reservationId);

        if (reservationIndex === -1) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        // If the reservation is rejected, remove it from the list
        if (status === 'rejected') {
            reservations.splice(reservationIndex, 1);
        } else {
            reservations[reservationIndex].status = status;
        }

        fs.writeFileSync("reservations.json", JSON.stringify(reservations, null, 2));

        // If the reservation is approved, create a sit-in record
        if (status === 'approved') {
            const reservation = reservations[reservationIndex];
            let sitIns = readSitIns();
            
            const newSitIn = {
                id: Date.now(),
                reservationId: reservation.id,
                idNumber: reservation.idNumber,
                name: reservation.name,
                course: reservation.course,
                year: reservation.year,
                purpose: reservation.purpose,
                date: reservation.date,
                timeIn: reservation.time,
                status: 'active',
                timeOut: null
            };

            sitIns.push(newSitIn);
            saveSitIns(sitIns);
        }

        res.json({ message: "Reservation status updated successfully" });
    } catch (error) {
        console.error("Error updating reservation status:", error);
        res.status(500).json({ message: "Error updating reservation status" });
    }
});

// Route: Admin view all reservations
app.get("/reservations", (req, res) => {
    if (!fs.existsSync("reservations.json")) {
        return res.json([]);
    }
    const reservations = JSON.parse(fs.readFileSync("reservations.json", "utf8"));
    res.json(reservations);
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
        return res.json({ userId: "admin", redirect: "/admin.html" });
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

        const newUser = { 
            idNumber, 
            firstName, 
            middleName, 
            lastName, 
            email, 
            year, 
            course, 
            password: hashedPassword // Store the hashed password
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
            profileImage: user.profileImage || "/uploads/default.png"
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
        res.json(sitIns);
    } catch (error) {
        console.error("Error fetching sit-ins:", error);
        res.status(500).json({ error: "Failed to fetch sit-ins" });
    }
});
// Route: Update sit-in status
app.post("/update-sit-in-status", (req, res) => {
    try {
        const { sitInId, status } = req.body;
        let sitIns = readSitIns();
        let reservations = readReservations();
        
        const sitInIndex = sitIns.findIndex(s => s.id === sitInId);
        if (sitInIndex === -1) {
            return res.status(404).json({ error: "Sit-in not found" });
        }

        sitIns[sitInIndex].status = status;
        if (status === 'completed') {
            sitIns[sitInIndex].timeOut = new Date().toISOString();
            
            // Remove the corresponding reservation
            const reservationIndex = reservations.findIndex(r => r.id === sitIns[sitInIndex].reservationId);
            if (reservationIndex !== -1) {
                reservations.splice(reservationIndex, 1);
                saveReservations(reservations);
            }
        }

        saveSitIns(sitIns);
        res.json({ message: "Sit-in status updated successfully" });
    } catch (error) {
        console.error("Error updating sit-in status:", error);
        res.status(500).json({ error: "Failed to update sit-in status" });
    }
});

// Helper functions for feedback
function readFeedback() {
    try {
        if (!fs.existsSync("feedback.json")) {
            fs.writeFileSync("feedback.json", JSON.stringify([], null, 2), "utf8");
            return [];
        }
        const data = fs.readFileSync("feedback.json", "utf8");
        return JSON.parse(data) || [];
    } catch (error) {
        console.error("Error reading feedback:", error);
        return [];
    }
}

function writeFeedback(feedback) {
    try {
        fs.writeFileSync("feedback.json", JSON.stringify(feedback || [], null, 2), "utf8");
    } catch (error) {
        console.error("Error writing feedback:", error);
        throw error;
    }
}

// Route: Submit feedback
app.post("/submit-feedback", async (req, res) => {
    try {
        const { userId, type, message, date } = req.body;
        
        if (!userId || !type || !message) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields" 
            });
        }

        // Get user details
        const users = readData();
        const user = users.find(u => u.idNumber === userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        const feedback = readFeedback();
        const newFeedback = {
            id: Date.now(),
            userId: userId,
            userName: `${user.firstName} ${user.lastName}`,
            type,
            message,
            date,
            status: 'new'
        };

        feedback.unshift(newFeedback);
        writeFeedback(feedback);

        res.json({ 
            success: true, 
            message: "Feedback submitted successfully" 
        });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error submitting feedback" 
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
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const announcements = readAnnouncements();
        const newAnnouncement = {
            id: Date.now(),
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
        
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        
        announcements[index] = {
            ...announcements[index],
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

// **Start the server**
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
