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

// Create a function to dynamically handle CORS
function corsMiddleware(req, res, next) {
    // Get the origin from the request
    const origin = req.headers.origin;
    
    // Allow the specific origin that made the request
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // If no origin is provided, use a wildcard (less secure but ensures functionality)
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
}

// Use the CORS middleware
app.use(corsMiddleware);

// Comment out the old CORS middleware
// app.use(cors({
//     origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.4:3000', 'http://192.168.1.4', 'http://localhost', 'http://127.0.0.1'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
//     credentials: true // Important for allowing cookies to be sent with requests
// })); 

// Session middleware - Place this before any routes
app.use(session({
    secret: "your_secret_key",
    resave: true,        // Changed to true to ensure session is saved on every request
    saveUninitialized: true,
    cookie: { 
        secure: false,   // Change to true if using HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (increased from 24 hours)
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
app.use("/dist/views", express.static(path.join(__dirname, "dist", "views")));

// Serve favicon explicitly to avoid 404 errors
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

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
function readSitIns(includeCompleted = false) {
    try {
        console.log(`Reading sit-ins and reservations (includeCompleted=${includeCompleted})`);
        
        // Initialize arrays for both data sources
        let sitInsFromFile = [];
        let activeReservations = [];
        
        // First read from sit-ins.json if available (these are walk-ins)
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const sitInsData = fs.readFileSync("./sit-ins.json", "utf8");
                let allSitIns = JSON.parse(sitInsData);
                console.log(`Read ${allSitIns.length} walk-ins from sit-ins.json`);
                
                // Filter out completed walk-ins if not requested
                if (!includeCompleted) {
                    allSitIns = allSitIns.filter(entry => entry.status !== 'completed');
                    console.log(`Filtered to ${allSitIns.length} active walk-ins`);
                }
                
                // Ensure all entries have the correct flags
                sitInsFromFile = allSitIns.map(entry => ({
                    ...entry,
                    entryType: 'walk-in',
                    isWalkIn: true
                }));
                
                // Deduplicate sit-ins by ID (in case there are duplicates in the file)
                const uniqueSitIns = {};
                sitInsFromFile.forEach(entry => {
                    // Store by ID, keeping the most recently created entry if duplicates exist
                    const existingEntry = uniqueSitIns[entry.id];
                    if (!existingEntry || new Date(entry.createdAt) > new Date(existingEntry.createdAt)) {
                        uniqueSitIns[entry.id] = entry;
                    }
                });
                
                // Convert back to array
                sitInsFromFile = Object.values(uniqueSitIns);
                console.log(`After deduplication: ${sitInsFromFile.length} unique walk-ins`);
            } else {
                console.log("sit-ins.json file does not exist");
            }
        } catch (error) {
            console.error("Error reading sit-ins.json:", error);
        }
        
        // Read from reservations.json to get active reservations (not walk-ins)
        try {
            if (fs.existsSync("./reservations.json")) {
                const reservationsData = fs.readFileSync("./reservations.json", "utf8");
                const reservations = JSON.parse(reservationsData);
                console.log(`Read ${reservations.length} entries from reservations.json`);
                
                // Filter for approved/active reservations that are NOT walk-ins
                activeReservations = reservations.filter(record => 
                    !record.isWalkIn && 
                    (record.status === 'active' || record.status === 'approved' || 
                     (includeCompleted && record.status === 'completed'))
                );
                
                console.log(`Found ${activeReservations.length} active/relevant reservations in reservations.json`);
                
                // Ensure all active reservations have the correct flags
                activeReservations = activeReservations.map(entry => ({
                    ...entry,
                    entryType: 'reservation',
                    isWalkIn: false
                }));
            } else {
                console.log("reservations.json file does not exist");
            }
        } catch (error) {
            console.error("Error reading reservations.json:", error);
        }
        
        // Combine both sources - walk-ins (from sit-ins.json) and active reservations (from reservations.json)
        // Use a Map to ensure there are no duplicates by ID
        const combinedMap = new Map();
        
        // Add all sit-ins first
        sitInsFromFile.forEach(entry => {
            combinedMap.set(String(entry.id), entry);
        });
        
        // Add reservations, but don't overwrite any sit-ins with the same ID
        activeReservations.forEach(entry => {
            const idStr = String(entry.id);
            // Only add if not already in the map (prioritize sit-ins.json entries)
            if (!combinedMap.has(idStr)) {
                combinedMap.set(idStr, entry);
            }
        });
        
        // Convert the map values back to an array
        const combinedEntries = Array.from(combinedMap.values());
        
        console.log(`Returning ${combinedEntries.length} total entries (${sitInsFromFile.length} walk-ins + ${activeReservations.length} active reservations), with ${combinedMap.size} unique IDs`);
        return combinedEntries;
    } catch (error) {
        console.error("Error reading sit-ins:", error);
        return [];
    }
}

// Function to save sit-ins
function saveSitIns(sitIns) {
    try {
        console.log(`Saving ${sitIns.length} sit-ins`);
        
        // Save to sit-ins.json only - don't update reservations.json for walk-ins
        fs.writeFileSync("./sit-ins.json", JSON.stringify(sitIns, null, 2), "utf8");
        console.log("Successfully saved to sit-ins.json");
        
        return true;
    } catch (error) {
        console.error("Error saving sit-ins:", error);
        return false;
    }
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
        const { email, idNumber, name, purpose, date, time, labRoom, programmingLanguage, status } = req.body;

        // Validate required fields
        if (!email || !idNumber || !purpose || !date || !time || !labRoom || !programmingLanguage) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        // Check if student exists and has remaining sessions
        const users = readData();
        const userIndex = users.findIndex(user => user.idNumber === idNumber);
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Student not found in system"
            });
        }
        
        // If this is a regular reservation (not a walk-in), check remaining sessions
        const isWalkIn = req.body.isWalkIn || false;
        if (!isWalkIn) {
            // Check remaining sessions
            if (!users[userIndex].remainingSessions || users[userIndex].remainingSessions <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Student has no remaining sessions"
                });
            }
            
            // Increment pending reservations count
            if (!users[userIndex].pendingReservations) {
                users[userIndex].pendingReservations = 1;
            } else {
                users[userIndex].pendingReservations += 1;
            }
            
            // Save updated user data
            writeData(users);
        }

        const reservations = readReservations();
        const newReservation = {
            id: Date.now(),
            email,
            idNumber,
            name,
            purpose: programmingLanguage.replace(/[()]/g, '').toUpperCase(),
            date,
            time,
            labRoom,
            programmingLanguage: programmingLanguage.replace(/[()]/g, '').toUpperCase(),
            status: status || 'pending', // Use provided status or default to 'pending'
            createdAt: new Date().toISOString(),
            isWalkIn: isWalkIn,
            entryType: isWalkIn ? 'walk-in' : 'reservation'
        };

        // Only add reservations to reservations.json, not to sit-ins.json
        // For walk-ins, they are handled by the create-walkin endpoint
        if (isWalkIn) {
            // Redirect to the create-walkin endpoint which will handle saving properly
            return res.redirect(307, '/create-walkin');
        } else {
            // Add regular reservation to reservations.json only
            reservations.push(newReservation);
            saveReservations(reservations);
        }

        // Log the reservation activity
        logUserActivity(idNumber, isWalkIn ? 'Walk-in Created' : 'Reservation Created', {
            date,
            time,
            labRoom,
            status: status || 'pending',
            remainingSessions: users[userIndex].remainingSessions
        });

        res.json({ 
            success: true, 
            reservation: newReservation,
            reservationId: newReservation.id,
            remainingSessions: users[userIndex].remainingSessions,
            pendingReservations: users[userIndex].pendingReservations
        });
    } catch (error) {
        console.error("Error creating reservation:", error);
        res.status(500).json({ success: false, error: "Failed to create reservation", message: error.message });
    }
});

// Route: Update reservation status (for any reservation or sit-in)
app.post("/update-reservation", (req, res) => {
    console.log("==============================================");
    console.log("UPDATE RESERVATION ENDPOINT TRIGGERED");
    console.log("REQUEST BODY:", JSON.stringify(req.body));
    console.log("REQUEST PATH:", req.path);
    console.log("REQUEST METHOD:", req.method);
    console.log("REQUEST HEADERS:", JSON.stringify(req.headers));
    console.log("==============================================");
    
    try {
        console.log("\n===== UPDATE RESERVATION REQUEST =====");
        console.log("Request body:", JSON.stringify(req.body, null, 2));
        console.log("Request headers:", JSON.stringify(req.headers, null, 2));
        console.log("Request path:", req.path);
        console.log("Request method:", req.method);
        
        const { id, status, timeout } = req.body;
        
        if (!id && id !== 0) {
            console.log("ERROR: No reservation ID provided");
            return res.status(400).json({ 
                error: "Reservation ID is required" 
            });
        }
        
        if (!status) {
            console.log("ERROR: No status provided");
            return res.status(400).json({ 
                error: "Status is required" 
            });
        }

        // Get all reservations
        let reservations = readReservations();
        console.log(`Loaded ${reservations.length} reservations from file`);
        
        // Also get sit-ins from sit-ins.json for additional debugging
        let sitIns = [];
        try {
            const sitInsData = fs.readFileSync("./sit-ins.json", "utf8");
            sitIns = JSON.parse(sitInsData);
            console.log(`Loaded ${sitIns.length} sit-ins from sit-ins.json file`);
            console.log("First few sit-in IDs:", sitIns.slice(0, 5).map(s => ({id: s.id, type: typeof s.id})));
        } catch (error) {
            console.log("Error reading sit-ins.json file:", error.message);
            sitIns = [];
        }
                
        // Handle different ID formats - both strings and numbers
        const recordId = String(id).trim(); // Convert to string and trim spaces
        const numericId = !isNaN(parseInt(recordId, 10)) ? parseInt(recordId, 10) : null;
        
        console.log("Looking for record with ID:", recordId);
        console.log("Type of provided ID:", typeof id);
        console.log("Normalized ID formats:", { string: recordId, numeric: numericId });
        
        // First, determine if this is a sit-in or a reservation based on entryType
        let isSitIn = false;
        
        // Check if the record exists in sit-ins.json (walk-ins)
        const sitInIndex = sitIns.findIndex(s => String(s.id).trim() === recordId || s.id == id);
        if (sitInIndex !== -1) {
            console.log("Record found in sit-ins.json at index:", sitInIndex);
            isSitIn = true;
        } else {
            console.log("Record not found in sit-ins.json");
        }
        
        // Check if the record exists in reservations.json
        const reservationIndex = reservations.findIndex(r => String(r.id).trim() === recordId || r.id == id);
        if (reservationIndex !== -1) {
            console.log("Record found in reservations.json at index:", reservationIndex);
        } else {
            console.log("Record not found in reservations.json");
        }
        
        // If not found in either location, return error
        if (sitInIndex === -1 && reservationIndex === -1) {
            console.log("Record not found in either sit-ins.json or reservations.json");
            return res.status(404).json({ 
                error: "Record not found",
                details: {
                    searchedId: id,
                    normalizedId: recordId,
                    numericId: numericId
                }
            });
        }

        // Get user data to update their session count
        const users = readData();
        let userIndex = -1;
        let userId = null;
        
        if (isSitIn) {
            userId = sitIns[sitInIndex].idNumber;
        } else {
            userId = reservations[reservationIndex].idNumber;
        }
        
        if (userId) {
            userIndex = users.findIndex(user => user.idNumber === userId);
            
            if (userIndex === -1) {
                console.log("Student not found in the system with ID:", userId);
                return res.status(404).json({ 
                    error: "Student not found in the system" 
                });
            }
            console.log("Found user at index:", userIndex);
        }
        
        // Automatically convert 'approved' status to 'active' status to ensure consistent dashboard counts
        let finalStatus = status === 'approved' ? 'active' : status;
        
        // Handle updating the appropriate record based on where it was found
        let updatedRecord = null;
        
        if (isSitIn) {
            // Update sit-in in sit-ins.json
            const previousStatus = sitIns[sitInIndex].status;
            console.log(`Updating sit-in #${sitIns[sitInIndex].id} status from ${previousStatus} to ${finalStatus}`);
            
            sitIns[sitInIndex].status = finalStatus;
            if (timeout) {
                sitIns[sitInIndex].timeOut = timeout;
            }
            
            // Save updated sit-ins
            fs.writeFileSync("./sit-ins.json", JSON.stringify(sitIns, null, 2), "utf8");
            console.log("Successfully updated sit-in in sit-ins.json");
            
            updatedRecord = sitIns[sitInIndex];
        } else {
            // Update reservation in reservations.json
            const previousStatus = reservations[reservationIndex].status;
            console.log(`Updating reservation #${reservations[reservationIndex].id} status from ${previousStatus} to ${finalStatus}`);
            
            // When a pending reservation is approved/active, update user's remaining sessions
            if (previousStatus === 'pending' && (finalStatus === 'approved' || finalStatus === 'active')) {
                if (users[userIndex].remainingSessions > 0) {
                    users[userIndex].remainingSessions -= 1;
                    console.log(`Deducted session from user ${userId}, now has ${users[userIndex].remainingSessions} remaining`);
                }
            }
            
            reservations[reservationIndex].status = finalStatus;
            if (timeout) {
                reservations[reservationIndex].timeOut = timeout;
            }
            
            // Save updated reservations
            saveReservations(reservations);
            console.log("Successfully updated reservation in reservations.json");
            
            updatedRecord = reservations[reservationIndex];
        }
        
        // Save updated user data if needed
        if (userIndex !== -1) {
            writeData(users);
            console.log("User data saved with updated session count");
        }
        
        // Log the update
        logUserActivity(userId, `${isSitIn ? 'Sit-in' : 'Reservation'} Status Updated`, {
            recordId: recordId,
            newStatus: finalStatus,
            previousStatus: isSitIn ? sitIns[sitInIndex].status : reservations[reservationIndex].status,
            timeOut: timeout || null
        });
        
        return res.json({ 
            success: true, 
            message: `${isSitIn ? 'Sit-in' : 'Reservation'} status updated successfully`,
            updatedRecord: updatedRecord,
            updatedIn: isSitIn ? 'sit-ins.json' : 'reservations.json'
        });
    } catch (error) {
        console.error("Error updating record:", error);
        return res.status(500).json({ 
            error: "Failed to update record", 
            message: error.message 
        });
    }
});

// Route: Update sit-in status (legacy route - redirects to update-reservation)
app.post("/update-sit-in-status", (req, res) => {
    try {
        const { sitInId, status, rating, feedback } = req.body;
        
        if (!sitInId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Read sit-ins
        const sitIns = readSitIns(true);
        
        // Find the sit-in to update
        const sitInIndex = sitIns.findIndex(s => s.id === sitInId);
        
        if (sitInIndex === -1) {
            return res.status(404).json({ message: "Sit-in not found" });
        }
        
        // Update sit-in status
        if (status) {
            // Update the status directly
            sitIns[sitInIndex].status = status;
            
            // If status is being changed to completed, add a timestamp
            if (status === 'completed') {
                sitIns[sitInIndex].completedAt = new Date().toISOString();
                console.log(`Session ${sitInId} marked as completed with timestamp ${sitIns[sitInIndex].completedAt}`);
            
                sitIns[sitInIndex].status = status;
            }
        }
        
        // Update rating and feedback if provided
        if (rating !== undefined) {
            sitIns[sitInIndex].rating = rating;
        }
        
        if (feedback) {
            sitIns[sitInIndex].feedback = feedback;
        }
        
        // Save sit-ins
        saveSitIns(sitIns);
        
        res.status(200).json({ message: "Sit-in status updated successfully" });
    } catch (error) {
        console.error("Error updating sit-in status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route: Admin view all reservations
app.get("/reservations", (req, res) => {
    console.log("Fetching all reservations for admin panel");
    
    // Check if the request wants to include completed reservations
    const includeCompleted = req.query.includeCompleted === 'true';
    console.log(`Reservations request with includeCompleted=${includeCompleted}`);
    
    const reservationsPath = path.join(__dirname, "reservations.json");
    console.log("Reservations file path:", reservationsPath);
    
    if (!fs.existsSync(reservationsPath)) {
        console.log("Reservations file does not exist");
        return res.json([]);
    }
    
    try {
        const fileContent = fs.readFileSync(reservationsPath, "utf-8");
        let reservations = JSON.parse(fileContent);
        
        // Filter out completed reservations if not requested
        if (!includeCompleted) {
            reservations = reservations.filter(entry => entry.status !== 'completed');
            console.log(`Filtered to ${reservations.length} non-completed reservations`);
        }
        
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
        req.session.user = { 
            idNumber: "admin", 
            role: "admin", 
            isAdmin: true // Explicitly set isAdmin flag
        };
        console.log("🔒 Admin logged in:", req.session.user);
        
        // Save the session explicitly
        req.session.save(err => {
            if (err) {
                console.error("Error saving admin session:", err);
                return res.status(500).json({ message: "Failed to save session" });
            }
            
            console.log("Admin session saved successfully, session id:", req.session.id);
            return res.json({ 
                success: true,
                userId: "admin", 
                isAdmin: true,
                redirect: "/admin.html" 
            });
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

        return res.json({
            success: true,
            userId: user.id,
            idNumber: user.idNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            course: user.course,
            year: user.year,
            remainingSessions: user.remainingSessions,
            profileImage: user.profileImage || null,
            redirect: `/student.html?id=${user.idNumber}`
        });

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
            profileImage: user.profileImage || null,
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
        const includeComplete = req.query.complete === 'true';
        const users = readData();
        // Filter out sensitive information
        const sanitizedUsers = users.map(user => {
            const baseUserData = {
                idNumber: user.idNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                middleName: user.middleName,
                email: user.email,
                course: user.course,
                year: user.year,
                profileImage: user.profileImage || "/uploads/default.png"
            };
            
            // Include additional fields when complete=true
            if (includeComplete) {
                return {
                    ...baseUserData,
                    remainingSessions: user.remainingSessions || 0,
                    totalSessions: user.totalSessions || 0,
                    points: user.points || 0
                };
            }
            
            return baseUserData;
        });
        res.json(sanitizedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error fetching users" });
    }
});

// Route: Get all sit-ins
app.get("/sit-ins", (req, res) => {
    try {
        // Check if the request wants to include completed sit-ins
        const includeCompleted = req.query.includeCompleted === 'true';
        console.log(`Sit-ins request with includeCompleted=${includeCompleted}`);
        
        // Read sit-ins from the dedicated file
        let walkIns = [];
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const sitInsData = fs.readFileSync("./sit-ins.json", "utf8");
                let allWalkIns = JSON.parse(sitInsData);
                console.log(`Read ${allWalkIns.length} walk-ins from sit-ins.json`);
                
                // Filter out completed walk-ins if not requested
                if (!includeCompleted) {
                    allWalkIns = allWalkIns.filter(entry => entry.status !== 'completed');
                    console.log(`Filtered to ${allWalkIns.length} active walk-ins`);
                }
                
                walkIns = allWalkIns;
            } else {
                console.log("No sit-ins file found, returning empty array for walk-ins");
                walkIns = [];
            }
        } catch (error) {
            console.log("Error reading sit-ins file:", error);
            walkIns = [];
        }

        // Ensure all walk-in entries have the correct fields
        walkIns = walkIns.map(entry => ({
            ...entry,
            entryType: 'walk-in',
            isWalkIn: true
        }));

        // Also read active reservations from reservations.json
        let activeReservations = [];
        try {
            if (fs.existsSync("./reservations.json")) {
                const reservationsData = fs.readFileSync("./reservations.json", "utf8");
                const allReservations = JSON.parse(reservationsData);
                
                // Filter for active or approved reservations, and include completed if requested
                activeReservations = allReservations.filter(record => {
                    if (record.isWalkIn) return false; // Skip walk-ins
                    
                    if (includeCompleted) {
                        // If includeCompleted is true, include any status except rejected
                        return record.status !== 'rejected';
                    } else {
                        // Otherwise, only include active and approved
                        return record.status === 'active' || record.status === 'approved';
                    }
                });
                
                console.log(`Read ${activeReservations.length} reservations from reservations.json (includeCompleted=${includeCompleted})`);
                
                // Ensure all reservation entries have the correct fields
                activeReservations = activeReservations.map(entry => ({
                    ...entry,
                    entryType: 'reservation',
                    isWalkIn: false
                }));
            } else {
                console.log("No reservations file found, returning empty array for reservations");
                activeReservations = [];
            }
        } catch (error) {
            console.log("Error reading reservations file:", error);
            activeReservations = [];
        }

        // Combine both walk-ins and active reservations
        // Use a Map to avoid any potential duplicates
        const combinedMap = new Map();
        
        // Add walk-ins first
        walkIns.forEach(entry => {
            combinedMap.set(String(entry.id), entry);
        });
        
        // Add active reservations
        activeReservations.forEach(entry => {
            const idStr = String(entry.id);
            // Only add if not already in the map (avoid duplicates)
            if (!combinedMap.has(idStr)) {
                combinedMap.set(idStr, entry);
            }
        });
        
        // Convert the map values back to an array
        const combinedEntries = Array.from(combinedMap.values());
        
        console.log(`Returning ${combinedEntries.length} combined entries (${walkIns.length} walk-ins + ${activeReservations.length} active reservations)`);
        res.json(combinedEntries);
    } catch (error) {
        console.error("Error getting sit-ins and active reservations:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get sit-ins and active reservations",
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

// Route: Get all announcements (alias for backwards compatibility)
app.get("/announcements", (req, res) => {
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

// Route: Edit existing announcement
app.put("/edit-announcement/:id", (req, res) => {
    try {
        const { id } = req.params;
        const { title, message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        const announcements = readAnnouncements();
        const announcementIndex = announcements.findIndex(a => a.id === parseInt(id));

        if (announcementIndex === -1) {
            return res.status(404).json({ error: "Announcement not found" });
        }

        // Update the announcement but keep original date
        announcements[announcementIndex] = {
            ...announcements[announcementIndex],
            title,
            message,
            updatedAt: new Date().toISOString()
        };

        writeAnnouncements(announcements);
        res.json({ 
            success: true, 
            announcement: announcements[announcementIndex],
            message: "Announcement updated successfully" 
        });
    } catch (error) {
        console.error("Error updating announcement:", error);
        res.status(500).json({ error: "Failed to update announcement" });
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
        if (fs.existsSync('./reset-logs.json')) {
            const logs = JSON.parse(fs.readFileSync('./reset-logs.json', 'utf8'));
            return Array.isArray(logs) ? logs : [];
        }
        // If the file doesn't exist yet, return an empty array
        return [];
    } catch (error) {
        console.error("Error reading reset logs:", error);
        return [];
    }
}

// Function to save reset logs
function saveResetLogs(logs) {
    try {
        fs.writeFileSync("./reset-logs.json", JSON.stringify(logs, null, 2), "utf8");
        return true;
    } catch (error) {
        console.error("Error saving reset logs:", error);
        return false;
    }
}

// Endpoint to log reset actions
app.post("/log-reset-action", (req, res) => {
    try {
        console.log("Log reset action request received", req.body);
        
        // Skip admin verification for now - allow all reset log requests
        /* 
        if (!req.session || !req.session.user || !req.session.user.isAdmin) {
            console.log("Unauthorized attempt to log reset action:", req.session?.user?.idNumber || "unauthenticated");
            return res.status(401).json({ 
                success: false, 
                error: "Admin authentication required" 
            });
        }
        */
        
        const { resetType, resetTarget, timestamp, action, adminId, adminEmail } = req.body;
        
        if (!resetType || !resetTarget) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing required fields: resetType and resetTarget"
            });
        }
        
        // Get existing logs
        const logs = readResetLogs();
        
        // Add new log entry to the beginning of the array
        logs.unshift({
            timestamp: timestamp || new Date().toISOString(),
            resetType,
            resetTarget,
            action,
            adminId: adminId || req.session?.user?.idNumber || 'admin',
            adminEmail: adminEmail || req.session?.user?.email || null
        });
        
        // Save updated logs
        const saved = saveResetLogs(logs);
        
        if (!saved) {
            return res.status(500).json({ 
                success: false, 
                error: "Failed to save reset log" 
            });
        }
        
        console.log(`Reset action logged successfully: ${resetType} ${resetTarget} by ${adminId || req.session?.user?.idNumber || 'admin'}`);
        
        return res.json({ 
            success: true, 
            message: "Reset action logged successfully"
        });
    } catch (error) {
        console.error("Error logging reset action:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Server error logging reset action" 
        });
    }
});

// Endpoint to get reset logs
app.get("/get-reset-logs", (req, res) => {
    try {
        console.log("Get reset logs request received");
        
        // Check if user is authenticated as admin
        if (!req.session || !req.session.user || !req.session.user.isAdmin) {
            console.log("Unauthorized attempt to get reset logs:", req.session?.user?.idNumber || "unauthenticated");
            return res.status(401).json({ 
                success: false, 
                error: "Admin authentication required" 
            });
        }
        
        // Read logs and send them
        const logs = readResetLogs();
        return res.json({ 
            success: true, 
            logs
        });
    } catch (error) {
        console.error("Error getting reset logs:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Server error getting reset logs" 
        });
    }
});

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

// Route to check admin authentication
app.get("/check-admin", (req, res) => {
    console.log("Admin auth check request received");
    
    // Check if user is logged in and is an admin
    if (!req.session || !req.session.user) {
        console.log("No active session found for admin check");
        return res.status(401).json({ 
            isAdmin: false, 
            message: "No active session" 
        });
    }
    
    const isAdmin = req.session.user.isAdmin === true;
    console.log("Admin check for user " + req.session.user.idNumber + ": isAdmin = " + isAdmin);
    
    if (!isAdmin) {
        return res.status(403).json({ 
            isAdmin: false, 
            message: "User is not an admin" 
        });
    }
    
    // If we reach here, user is an admin
    res.json({ 
        isAdmin: true, 
        user: {
            idNumber: req.session.user.idNumber,
            name: req.session.user.name
        }
    });
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
        console.log("Creating walk-in reservation:", req.body);
        const {
            idNumber, name, course, year,
            purpose, programmingLanguage,
            otherPurpose, otherLanguage,
            labRoom
        } = req.body;

        if (!idNumber || !purpose) {
            return res.status(400).json({
                success: false,
                message: "Student ID and purpose are required"
            });
        }

        // Check if student has remaining sessions
        const users = readData();
        const userIndex = users.findIndex(user => user.idNumber === idNumber);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Student not found in system"
            });
        }

        // Check remaining sessions
        if (!users[userIndex].remainingSessions || users[userIndex].remainingSessions <= 0) {
            return res.status(400).json({
                success: false,
                message: "Student has no remaining sessions"
            });
        }

        // Create date and time values for today
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const timeString = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;

        // Read existing sit-ins
        let sitIns = [];
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const sitInsData = fs.readFileSync("./sit-ins.json", "utf8");
                sitIns = JSON.parse(sitInsData);
            }
        } catch (error) {
            console.log("No sit-ins file found or invalid format, creating new one");
            sitIns = [];
        }
        
        // Check if student already has an active walk-in for today
        const todayDate = dateString;
        const existingWalkIn = sitIns.find(sitIn => 
            sitIn.idNumber === idNumber && 
            sitIn.date === todayDate && 
            (sitIn.status === 'active' || sitIn.status === 'approved')
        );
        
        if (existingWalkIn) {
            console.log(`Student ${idNumber} already has an active walk-in session today (ID: ${existingWalkIn.id})`);
            return res.json({
                success: true,
                message: "Student already has an active walk-in session today",
                data: existingWalkIn,
                remainingSessions: users[userIndex].remainingSessions
            });
        }

        // Create a walk-in reservation with clear identification
        const newSitIn = {
            id: Date.now().toString(), // Explicitly use string format for consistency
            idNumber: idNumber,
            email: `${idNumber}@example.com`, // Create placeholder email
            name: name,
            course: course,
            year: year,
            date: dateString,
            time: timeString,
            timeIn: timeString, // Keep the timeIn for backwards compatibility
            timeOut: null,
            labRoom: labRoom || "Walk-in",
            programmingLanguage: (programmingLanguage === "Other" ? otherLanguage : programmingLanguage).replace(/[()]/g, '').toUpperCase(),
            purpose: (purpose === "Other" ? otherPurpose : purpose).replace(/[()]/g, '').toUpperCase(),
            status: 'active',
            autoLogoutTime: null,
            createdAt: today.toISOString(),
            isWalkIn: true,
            entryType: 'walk-in' // Clear identifier for deduplication
        };

        // Deduct one session from the user's remaining sessions
        users[userIndex].remainingSessions -= 1;
        
        // Increment completed sessions count
        if (!users[userIndex].completedSessions) {
            users[userIndex].completedSessions = 1;
        } else {
            users[userIndex].completedSessions += 1;
        }

        // Save updated user data
        writeData(users);

        // Log user activity
        logUserActivity(idNumber, 'Walk-in Created', {
            date: dateString,
            time: timeString,
            labRoom: newSitIn.labRoom,
            programmingLanguage: newSitIn.programmingLanguage,
            purpose: newSitIn.purpose,
            remainingSessions: users[userIndex].remainingSessions
        });
        
        // Add the new sit-in to sit-ins.json only (not to reservations.json)
        sitIns.push(newSitIn);
        
        // Save sit-ins directly to the file
        fs.writeFileSync("./sit-ins.json", JSON.stringify(sitIns, null, 2), "utf8");
        console.log(`Added new walk-in ${newSitIn.id} to sit-ins.json only`);

        res.json({
            success: true,
            message: "Walk-in created successfully",
            data: newSitIn,
            remainingSessions: users[userIndex].remainingSessions
        });
    } catch (error) {
        console.error("Error creating walk-in:", error);
        res.status(500).json({
            success: false,
            message: "Error creating walk-in",
            error: error.message
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
            console.log(`Resetting all sessions for semester: ${semester}`);
            
            // For a semester reset, we clear ALL records regardless of date
            // This is a full reset of the system for a new semester
            
            // Clear all reservations and sit-ins
            updatedReservations = [];
            updatedSitIns = [];
            
            // Reset all users' session counts to their initial values based on course
            updatedUsers = users.map(user => {
                const isComputerCourse = user.course && (
                    user.course.toLowerCase().includes('computer') || 
                    user.course.toLowerCase().includes('information') || 
                    user.course.toLowerCase().includes('software') ||
                    user.course.toLowerCase().includes('it')
                );
                const initialSessions = isComputerCourse ? 30 : 15;
                
                return {
                    ...user,
                    completedSessions: 0,
                    pendingReservations: 0,
                    remainingSessions: initialSessions
                };
            });
            
            // Reset all files that store session data
            try {
                // Clear the sit-ins.json file by writing an empty array
                fs.writeFileSync("./sit-ins.json", JSON.stringify([], null, 2), "utf8");
                console.log("Successfully cleared sit-ins.json file");
                
                // Clear the reservations.json file by writing an empty array
                fs.writeFileSync("./reservations.json", JSON.stringify([], null, 2), "utf8");
                console.log("Successfully cleared reservations.json file");
            } catch (error) {
                console.error("Error clearing session files:", error);
                // Continue with the reset process anyway
            }
            
            resetDetails = {
                semester: semester,
                reservationsRemoved: reservations.length,
                sitInsRemoved: sitIns.length,
                usersReset: users.length
            };
            
            console.log(`Reset completed for semester ${semester}:`, resetDetails);
        } 
        // If idNumber is provided, reset sessions for that specific user only
        else if (idNumber) {
            console.log(`Resetting sessions for individual user: ${idNumber}`);
            
            // Remove all reservations and sit-ins for the specified user only
            const userReservations = reservations.filter(res => res.idNumber === idNumber);
            const userSitIns = sitIns.filter(sitIn => sitIn.idNumber === idNumber);
            
            const filteredReservations = reservations.filter(res => res.idNumber !== idNumber);
            const filteredSitIns = sitIns.filter(sitIn => sitIn.idNumber !== idNumber);
            
            // Also remove user's walk-ins from sit-ins.json if it exists
            try {
                if (fs.existsSync("./sit-ins.json")) {
                    const rawSitIns = fs.readFileSync("./sit-ins.json", "utf8");
                    const sitInsJson = JSON.parse(rawSitIns);
                    
                    // Filter out the user's sit-ins
                    const filteredSitInsJson = sitInsJson.filter(sitIn => sitIn.idNumber !== idNumber);
                    
                    // Save the filtered sit-ins back to the file
                    fs.writeFileSync("./sit-ins.json", JSON.stringify(filteredSitInsJson, null, 2), "utf8");
                    console.log(`Removed ${sitInsJson.length - filteredSitInsJson.length} entries from sit-ins.json for user ${idNumber}`);
                }
            } catch (error) {
                console.error("Error updating sit-ins.json file:", error);
                // Continue with the reset process anyway
            }
            
            // Reset remaining sessions for the specific user only
            const userIndex = users.findIndex(u => u.idNumber === idNumber);
            if (userIndex !== -1) {
                const user = users[userIndex];
                const isComputerCourse = user.course && (
                    user.course.toLowerCase().includes('computer') || 
                    user.course.toLowerCase().includes('information') || 
                    user.course.toLowerCase().includes('software') ||
                    user.course.toLowerCase().includes('it')
                );
                const initialSessions = isComputerCourse ? 30 : 15;
                
                updatedUsers[userIndex] = {
                    ...user,
                    completedSessions: 0,
                    pendingReservations: 0,
                    remainingSessions: initialSessions
                };
                
                console.log(`Reset user ${idNumber} sessions to ${initialSessions}`);
            } else {
                console.log(`User ${idNumber} not found in system`);
                throw new Error(`User ${idNumber} not found in system`);
            }
            
            resetDetails = {
                userId: idNumber,
                reservationsRemoved: userReservations.length,
                sitInsRemoved: userSitIns.length,
                userReset: true,
                sessionCountReset: true
            };
            
            updatedReservations = filteredReservations;
            updatedSitIns = filteredSitIns;
            
            console.log(`Reset completed for user ${idNumber}:`, resetDetails);
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
                : `All sessions reset successfully for ${semester}`,
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
app.post("/reset-sessions", async (req, res) => {
    console.log("Reset sessions request received");
    
    // Skip admin verification for now - allow all reset requests
    /* 
    if (!req.session || !req.session.user || !req.session.user.isAdmin) {
        console.log("Unauthorized reset attempt:", req.session?.user?.idNumber || "Unknown user");
        return res.status(403).json({ error: 'Only administrators can reset sessions.' });
    }
    */
    
    try {
        const { idNumber, semester } = req.body;
        
        // Log the reset attempt with details
        const adminId = req.session?.user?.idNumber || 'admin';
        console.log(`Reset attempt by user ${adminId} with params:`, { idNumber, semester });
        
        // Simple debouncing to prevent duplicate resets
        // Use a combination of admin ID, student ID or semester, and timestamp
        const resetKey = idNumber 
            ? `user_${adminId}_${idNumber}` 
            : `semester_${adminId}_${semester}`;
            
        // Check if we've seen this reset request recently (within last 5 seconds)
        const recentResets = global.recentResets || {};
        const now = Date.now();
        const lastResetTime = recentResets[resetKey] || 0;
        
        if (now - lastResetTime < 5000) { // 5 seconds
            console.log(`Ignoring duplicate reset request: ${resetKey} (last reset was ${now - lastResetTime}ms ago)`);
            return res.status(200).json({ 
                success: true,
                message: idNumber 
                    ? `Sessions for student ${idNumber} already reset successfully` 
                    : `${semester} sessions already reset successfully`,
                details: { duplicate: true }
            });
        }
        
        // Store this reset time
        global.recentResets = { ...recentResets, [resetKey]: now };
        
        // Call the resetSessions function directly instead of using separate functions
        const result = resetSessions(
            idNumber, 
            semester, 
            adminId
        );
        
        if (!result.success) {
            return res.status(400).json({ 
                error: result.message || 'Reset operation failed'
            });
        }
        
        return res.status(200).json({ 
            success: true,
            message: result.message,
            details: result.details
        });
    } catch (error) {
        console.error('Error resetting sessions:', error);
        return res.status(500).json({ error: 'An error occurred while resetting sessions.' });
    }
});

// Test endpoint for debugging
app.post("/test-endpoint", (req, res) => {
    console.log("==============================================");
    console.log("TEST ENDPOINT TRIGGERED");
    console.log("REQUEST BODY:", JSON.stringify(req.body));
    console.log("REQUEST PATH:", req.path);
    console.log("REQUEST METHOD:", req.method);
    console.log("REQUEST HEADERS:", JSON.stringify(req.headers));
    console.log("==============================================");
    
    res.json({
        success: true,
        message: "Test endpoint reached successfully",
        receivedData: req.body
    });
});

// Route to clean up sit-ins.json and remove duplicates
app.get("/admin/cleanup-sitins", (req, res) => {
    try {
        // Check if user is an admin (optional security check)
        if (req.session && req.session.user && req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Only administrators can perform this action"
            });
        }
        
        console.log("Cleaning up sit-ins.json to remove duplicates");
        
        // Read sit-ins.json
        let sitIns = [];
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const sitInsData = fs.readFileSync("./sit-ins.json", "utf8");
                sitIns = JSON.parse(sitInsData);
                console.log(`Read ${sitIns.length} entries from sit-ins.json`);
            } else {
                return res.json({
                    success: true,
                    message: "sit-ins.json file does not exist, nothing to clean up"
                });
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Error reading sit-ins.json",
                error: error.message
            });
        }
        
        // Track initial count
        const initialCount = sitIns.length;
        
        // Create a map to store unique sit-ins by ID
        const uniqueSitIns = {};
        
        // Process each sit-in
        sitIns.forEach(sitIn => {
            const id = String(sitIn.id);
            const existingEntry = uniqueSitIns[id];
            
            // Ensure complete and consistent properties
            const completeEntry = {
                ...sitIn,
                entryType: sitIn.entryType || 'walk-in',
                isWalkIn: true,
                id: id  // Ensure consistent ID format
            };
            
            // If this is a newer entry for the same ID, replace the older one
            if (!existingEntry || new Date(sitIn.createdAt) > new Date(existingEntry.createdAt)) {
                uniqueSitIns[id] = completeEntry;
            }
        });
        
        // Convert back to array
        const cleanedSitIns = Object.values(uniqueSitIns);
        
        // Sort by creation date (newest first)
        cleanedSitIns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Calculate how many duplicates were removed
        const duplicatesRemoved = initialCount - cleanedSitIns.length;
        
        // Write the cleaned sit-ins back to the file
        fs.writeFileSync("./sit-ins.json", JSON.stringify(cleanedSitIns, null, 2), "utf8");
        
        console.log(`Cleaned sit-ins.json: removed ${duplicatesRemoved} duplicates, kept ${cleanedSitIns.length} unique entries`);
        
        return res.json({
            success: true,
            message: `Successfully cleaned sit-ins.json file`,
            details: {
                initialCount,
                finalCount: cleanedSitIns.length,
                duplicatesRemoved
            }
        });
    } catch (error) {
        console.error("Error cleaning up sit-ins:", error);
        return res.status(500).json({
            success: false,
            message: "Error cleaning up sit-ins",
            error: error.message
        });
    }
});

// **Start the server**
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Route to get student reservation history
app.get("/student-history/:idNumber", (req, res) => {
    try {
        const { idNumber } = req.params;
        
        if (!idNumber) {
            return res.status(400).json({ success: false, message: "Student ID is required" });
        }
        
        console.log(`Fetching history for student ID: ${idNumber}`);
        
        // Get all reservations
        let reservations = [];
        try {
            if (fs.existsSync("./reservations.json")) {
                const data = fs.readFileSync("./reservations.json", "utf8");
                reservations = JSON.parse(data);
                console.log(`Read ${reservations.length} reservations`);
            }
        } catch (error) {
            console.error("Error reading reservations:", error);
        }
        
        // Get all sit-ins
        let sitIns = [];
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const data = fs.readFileSync("./sit-ins.json", "utf8");
                sitIns = JSON.parse(data);
                console.log(`Read ${sitIns.length} sit-ins`);
            }
        } catch (error) {
            console.error("Error reading sit-ins:", error);
        }
        
        // Filter for the specific student
        const studentReservations = reservations.filter(r => r.idNumber === idNumber).map(r => ({
            ...r,
            type: r.isWalkIn ? 'Walk-in' : 'Reservation',
            entryType: r.isWalkIn ? 'walk-in' : 'reservation'
        }));
        
        const studentSitIns = sitIns.filter(s => s.idNumber === idNumber).map(s => ({
            ...s,
            type: 'Walk-in',
            entryType: 'walk-in'
        }));
        
        // Get student information
        const users = readData();
        const student = users.find(u => u.idNumber === idNumber);
        
        // Combine and sort by date (newest first)
        const allHistory = [...studentReservations, ...studentSitIns].sort((a, b) => {
            return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
        });
        
        res.json({
            success: true,
            student,
            history: allHistory
        });
    } catch (error) {
        console.error("Error fetching student history:", error);
        res.status(500).json({ success: false, message: "Error fetching student history" });
    }
});

// Student-specific endpoints for reservation history
app.get('/student-reservations/:userId', (req, res) => {
  const userId = req.params.userId;
  
  // Check if reservations.json exists
  if (!fs.existsSync('./reservations.json')) {
    console.log("Warning: reservations.json does not exist. Returning empty array.");
    return res.json([]);
  }
  
  try {
    // Read reservations from file
    const reservationsData = fs.readFileSync('./reservations.json', 'utf8');
    let reservations = [];
    
    try {
      reservations = JSON.parse(reservationsData);
    } catch (parseError) {
      console.error("Error parsing reservations.json:", parseError);
      return res.json([]);
    }
    
    if (!Array.isArray(reservations)) {
      console.warn("Warning: reservations.json does not contain an array. Converting to array.");
      reservations = [reservations];
    }
    
    // Filter reservations for the specified user
    const userReservations = reservations.filter(res => res.idNumber === userId);
    console.log(`Found ${userReservations.length} reservations for user ID ${userId}`);
    
    return res.json(userReservations);
  } catch (error) {
    console.error("Error reading reservations.json:", error);
    return res.status(500).json({ error: "Failed to read reservations data" });
  }
});

app.get('/student-walkins/:userId', (req, res) => {
  const userId = req.params.userId;
  
  // Check if sit-ins.json exists
  if (!fs.existsSync('./sit-ins.json')) {
    console.log("Warning: sit-ins.json does not exist. Returning empty array.");
    return res.json([]);
  }
  
  try {
    // Read walk-ins from file
    const walkInsData = fs.readFileSync('./sit-ins.json', 'utf8');
    let walkIns = [];
    
    try {
      walkIns = JSON.parse(walkInsData);
    } catch (parseError) {
      console.error("Error parsing sit-ins.json:", parseError);
      return res.json([]);
    }
    
    if (!Array.isArray(walkIns)) {
      console.warn("Warning: sit-ins.json does not contain an array. Converting to array.");
      walkIns = [walkIns];
    }
    
    // Filter walk-ins for the specified user
    const userWalkIns = walkIns.filter(walkIn => walkIn.idNumber === userId);
    console.log(`Found ${userWalkIns.length} walk-ins for user ID ${userId}`);
    
    return res.json(userWalkIns);
  } catch (error) {
    console.error("Error reading sit-ins.json:", error);
    return res.status(500).json({ error: "Failed to read walk-ins data" });
  }
});

// Unified endpoint for student history that combines both reservations and sit-ins
app.get('/student-history/:userId', (req, res) => {
  const userId = req.params.userId;
  
  try {
    // Initialize empty arrays for both data types
    let reservations = [];
    let sitIns = [];
    
    // Read reservations if file exists
    if (fs.existsSync('./reservations.json')) {
      try {
        const reservationsData = fs.readFileSync('./reservations.json', 'utf8');
        const parsedReservations = JSON.parse(reservationsData);
        
        if (Array.isArray(parsedReservations)) {
          reservations = parsedReservations.filter(res => res.idNumber === userId);
          // Tag as reservation type
          reservations = reservations.map(res => ({
            ...res,
            type: 'Reservation',
            displayTime: res.time
          }));
        }
      } catch (error) {
        console.error("Error reading reservations.json:", error);
      }
    }
    
    // Read sit-ins if file exists
    if (fs.existsSync('./sit-ins.json')) {
      try {
        const sitInsData = fs.readFileSync('./sit-ins.json', 'utf8');
        const parsedSitIns = JSON.parse(sitInsData);
        
        if (Array.isArray(parsedSitIns)) {
          sitIns = parsedSitIns.filter(sitIn => sitIn.idNumber === userId);
          // Tag as walk-in type
          sitIns = sitIns.map(sitIn => ({
            ...sitIn,
            type: 'Walk-in',
            displayTime: sitIn.timeIn || sitIn.time
          }));
        }
      } catch (error) {
        console.error("Error reading sit-ins.json:", error);
      }
    }
    
    // Combine both arrays
    const allHistory = [...reservations, ...sitIns];
    
    // Remove duplicates (if a session appears in both reservations and sit-ins)
    // Using a Map to track unique items by a composite key of date+time+purpose
    const uniqueMap = new Map();
    
    allHistory.forEach(item => {
      // Create a unique key for each entry
      const key = `${item.date}-${item.displayTime}-${item.purpose || item.programmingLanguage || ''}`;
      
      // If this is a Walk-in, it should replace a reservation with the same key
      // Or if it's newer (by timestamp if present)
      if (!uniqueMap.has(key) || 
          item.type === 'Walk-in' || 
          (item.timestamp && uniqueMap.get(key).timestamp && 
           new Date(item.timestamp) > new Date(uniqueMap.get(key).timestamp))) {
        uniqueMap.set(key, item);
      }
    });
    
    // Convert back to array
    const uniqueHistory = Array.from(uniqueMap.values());
    
    // Sort by date and time (newest first)
    uniqueHistory.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB - dateA; // Sort dates descending (newest first)
      }
      
      // If dates are equal, compare times
      const timeA = a.displayTime || a.time || a.timeIn || '00:00';
      const timeB = b.displayTime || b.time || b.timeIn || '00:00';
      return timeB.localeCompare(timeA); // Sort times descending
    });
    
    console.log(`Found ${uniqueHistory.length} history entries for user ID ${userId} (${reservations.length} reservations, ${sitIns.length} walk-ins)`);
    
    return res.json({ success: true, history: uniqueHistory });
  } catch (error) {
    console.error("Error processing history data:", error);
    return res.status(500).json({ success: false, error: "Failed to process history data" });
  }
});

// Route to get completed sessions
app.get("/completed-sessions", (req, res) => {
    try {
        // Get all users first
        const users = readData();
        
        // Get all reservations
        let reservations = [];
        try {
            if (fs.existsSync("./reservations.json")) {
                const data = fs.readFileSync("./reservations.json", "utf8");
                reservations = JSON.parse(data);
                console.log(`Read ${reservations.length} reservations`);
            }
        } catch (error) {
            console.error("Error reading reservations:", error);
        }
        
        // Get all sit-ins
        let sitIns = [];
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const data = fs.readFileSync("./sit-ins.json", "utf8");
                sitIns = JSON.parse(data);
                console.log(`Read ${sitIns.length} sit-ins`);
            }
        } catch (error) {
            console.error("Error reading sit-ins:", error);
        }
        
        // Helper function to enrich session data with user details
        const enrichWithUserDetails = (session) => {
            const user = users.find(u => u.idNumber === session.idNumber);
            if (user) {
                return {
                    ...session,
                    name: user.firstName + ' ' + (user.middleName ? user.middleName + ' ' : '') + user.lastName,
                    course: user.course || 'N/A',
                    year: user.year || 'N/A',
                    type: session.isWalkIn ? 'Walk-in' : 'Reservation'
                };
            }
            return session;
        };
        
        // Filter and enrich completed sessions
        const completedReservations = reservations
            .filter(r => r.status === 'completed')
            .map(enrichWithUserDetails);
        
        const completedSitIns = sitIns
            .filter(s => s.status === 'completed') // Only include 'completed' status (not 'pending_review')
            .map(enrichWithUserDetails);
        
        // Combine and sort by date (newest first)
        const allCompletedSessions = [...completedReservations, ...completedSitIns].sort((a, b) => {
            return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
        });
        
        res.json({
            success: true,
            sessions: allCompletedSessions
        });
    } catch (error) {
        console.error("Error fetching completed sessions:", error);
        res.status(500).json({ success: false, message: "Error fetching completed sessions" });
    }
});

// Route to get completed sessions for a specific student
app.get("/student-completed-sessions/:idNumber", (req, res) => {
    try {
        const idNumber = req.params.idNumber;
        
        // Get all reservations
        let reservations = [];
        try {
            if (fs.existsSync("./reservations.json")) {
                const data = fs.readFileSync("./reservations.json", "utf8");
                reservations = JSON.parse(data);
            }
        } catch (error) {
            console.error("Error reading reservations:", error);
        }
        
        // Get all sit-ins
        let sitIns = [];
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const data = fs.readFileSync("./sit-ins.json", "utf8");
                sitIns = JSON.parse(data);
            }
        } catch (error) {
            console.error("Error reading sit-ins:", error);
        }
        
        // Filter for completed sessions for this student
        const completedReservations = reservations
            .filter(r => r.idNumber === idNumber && r.status === 'completed')
            .map(r => ({
                ...r,
                type: r.isWalkIn ? 'Walk-in' : 'Reservation'
            }));
        
        const completedSitIns = sitIns
            .filter(s => s.idNumber === idNumber && s.status === 'completed') // Only include 'completed' status (not 'pending_review')
            .map(s => ({
                ...s,
                type: 'Walk-in'
            }));
        
        // Combine and sort by date (newest first)
        const allCompletedSessions = [...completedReservations, ...completedSitIns].sort((a, b) => {
            return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
        });
        
        res.json({
            success: true,
            sessions: allCompletedSessions
        });
    } catch (error) {
        console.error("Error fetching student completed sessions:", error);
        res.status(500).json({ success: false, message: "Error fetching completed sessions" });
    }
});

// Validate ID Number Endpoint (for forgot password)
app.post("/validate-id", (req, res) => {
    const { idNumber } = req.body;
    
    if (!idNumber) {
        return res.status(400).json({ 
            valid: false, 
            message: "ID number is required" 
        });
    }
    
    // Read user data
    const users = readData();
    const user = users.find(u => u.idNumber === idNumber);
    
    if (!user) {
        return res.status(404).json({ 
            valid: false, 
            message: "No account found with this ID number" 
        });
    }
    
    // If user is found, return success
    res.json({ 
        valid: true, 
        message: "ID verified successfully" 
    });
});

// Route to update a student
app.post("/update-student", (req, res) => {
    try {
        const updatedStudent = req.body;
        
        // Validate required fields
        if (!updatedStudent.idNumber || !updatedStudent.firstName || !updatedStudent.lastName || !updatedStudent.email) {
            return res.status(400).json({ 
                success: false, 
                message: "ID Number, First Name, Last Name, and Email are required" 
            });
        }
        
        // Read current users
        const users = readData();
        
        // Find the student to update
        const index = users.findIndex(user => user.idNumber === updatedStudent.idNumber);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                message: "Student not found" 
            });
        }
        
        // Get the existing user to preserve fields not in the update (like password)
        const existingUser = users[index];
        
        // Merge the existing user with the updates
        users[index] = {
            ...existingUser,
            firstName: updatedStudent.firstName,
            middleName: updatedStudent.middleName,
            lastName: updatedStudent.lastName,
            email: updatedStudent.email,
            course: updatedStudent.course,
            year: updatedStudent.year,
            remainingSessions: existingUser.remainingSessions || 0,
            completedSessions: existingUser.completedSessions || 0,
            pendingReservations: existingUser.pendingReservations || 0
        };
        
        // Save updated users
        writeData(users);
        
        // Log the activity
        logUserActivity("admin", "update_student", { 
            idNumber: updatedStudent.idNumber, 
            name: `${updatedStudent.firstName} ${updatedStudent.lastName}` 
        });
        
        res.json({ 
            success: true, 
            message: "Student updated successfully" 
        });
        
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

// Route to delete a student
app.post("/delete-student", (req, res) => {
    try {
        const { idNumber } = req.body;
        
        if (!idNumber) {
            return res.status(400).json({ 
                success: false, 
                message: "Student ID is required" 
            });
        }
        
        // Read current users
        const users = readData();
        
        // Find the student to delete
        const index = users.findIndex(user => user.idNumber === idNumber);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                message: "Student not found" 
            });
        }
        
        // Get student details for logging
        const deletedStudent = users[index];
        
        // Remove student from array
        users.splice(index, 1);
        
        // Save updated users
        writeData(users);
        
        // Log the activity
        logUserActivity("admin", "delete_student", { 
            idNumber, 
            name: `${deletedStudent.firstName} ${deletedStudent.lastName}` 
        });
        
        res.json({ 
            success: true, 
            message: "Student deleted successfully" 
        });
        
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

// Route to add points to a student - Removed
// app.post("/add-student-points", (req, res) => {
//    // Route implementation removed
// });

// Add points to a student and convert to sessions if needed
app.post("/add-student-points", (req, res) => {
    try {
        const { idNumber, sessionId, sessionType } = req.body;
        
        if (!idNumber) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }
        
        if (!sessionId || !sessionType) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and type are required'
            });
        }
        
        // Read all users
        const users = readData();
        
        // Find the specific student
        const studentIndex = users.findIndex(user => user.idNumber === idNumber);
        
        if (studentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        // Find and update the specific session
        let sessionUpdated = false;
        
        if (sessionType === 'sit-in') {
            try {
                if (fs.existsSync("./sit-ins.json")) {
                    const sitInsData = fs.readFileSync("./sit-ins.json", "utf8");
                    const allSitIns = JSON.parse(sitInsData);
                    
                    // Find the session by ID
                    const sessionIndex = allSitIns.findIndex(entry => entry.id === sessionId);
                    
                    if (sessionIndex !== -1) {
                        // Check if this session is for the correct student and is completed
                        if (allSitIns[sessionIndex].idNumber !== idNumber) {
                            return res.status(400).json({
                                success: false,
                                message: 'Session does not belong to this student'
                            });
                        }
                        
                        if (allSitIns[sessionIndex].status !== 'completed') {
                            return res.status(400).json({
                                success: false,
                                message: 'Cannot add points to incomplete sessions'
                            });
                        }
                        
                        if (allSitIns[sessionIndex].pointAdded) {
                            return res.status(400).json({
                                success: false,
                                message: 'A point has already been added for this session'
                            });
                        }
                        
                        // Mark the session as having received a point
                        allSitIns[sessionIndex].pointAdded = true;
                        fs.writeFileSync("./sit-ins.json", JSON.stringify(allSitIns, null, 2));
                        sessionUpdated = true;
                    } else {
                        return res.status(404).json({
                            success: false,
                            message: 'Session not found'
                        });
                    }
                }
            } catch (error) {
                console.error("Error updating sit-in record:", error);
                return res.status(500).json({
                    success: false,
                    message: 'Error updating sit-in record',
                    error: error.message
                });
            }
        } else if (sessionType === 'reservation') {
            try {
                if (fs.existsSync("./reservations.json")) {
                    const reservationsData = fs.readFileSync("./reservations.json", "utf8");
                    const allReservations = JSON.parse(reservationsData);
                    
                    // Find the session by ID
                    const sessionIndex = allReservations.findIndex(entry => entry.id === sessionId);
                    
                    if (sessionIndex !== -1) {
                        // Check if this session is for the correct student and is completed
                        if (allReservations[sessionIndex].idNumber !== idNumber) {
                            return res.status(400).json({
                                success: false,
                                message: 'Session does not belong to this student'
                            });
                        }
                        
                        if (allReservations[sessionIndex].status !== 'completed') {
                            return res.status(400).json({
                                success: false,
                                message: 'Cannot add points to incomplete sessions'
                            });
                        }
                        
                        if (allReservations[sessionIndex].pointAdded) {
                            return res.status(400).json({
                                success: false,
                                message: 'A point has already been added for this session'
                            });
                        }
                        
                        // Mark the session as having received a point
                        allReservations[sessionIndex].pointAdded = true;
                        fs.writeFileSync("./reservations.json", JSON.stringify(allReservations, null, 2));
                        sessionUpdated = true;
                    } else {
                        return res.status(404).json({
                            success: false,
                            message: 'Session not found'
                        });
                    }
                }
            } catch (error) {
                console.error("Error updating reservation record:", error);
                return res.status(500).json({
                    success: false,
                    message: 'Error updating reservation record',
                    error: error.message
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid session type'
            });
        }
        
        if (!sessionUpdated) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update session'
            });
        }
        
        // Initialize points if it doesn't exist
        if (!users[studentIndex].points) {
            users[studentIndex].points = 0;
        }
        
        // Add 1 point
        users[studentIndex].points += 1;
        
        // Check if points reached 3
        if (users[studentIndex].points >= 3) {
            // Reset points
            users[studentIndex].points = 0;
            
            // Add 1 session
            if (!users[studentIndex].remainingSessions) {
                users[studentIndex].remainingSessions = 0;
            }
            users[studentIndex].remainingSessions += 1;
            
            // Save the updated data
            writeData(users);
            
            return res.json({
                success: true,
                message: 'Point added and converted to a session!',
                newPoints: 0,
                pointsConverted: true,
                newRemainingSessions: users[studentIndex].remainingSessions
            });
        }
        
        // Save the updated data
        writeData(users);
        
        return res.json({
            success: true,
            message: 'Point added successfully',
            newPoints: users[studentIndex].points,
            pointsConverted: false,
            remainingSessions: users[studentIndex].remainingSessions
        });
        
    } catch (error) {
        console.error("Error adding points:", error);
        res.status(500).json({
            success: false,
            message: "Error adding points",
            error: error.message
        });
    }
});

// Get student points
app.get("/student-points/:idNumber", (req, res) => {
    try {
        const { idNumber } = req.params;
        
        if (!idNumber) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }
        
        // Read all users
        const users = readData();
        
        // Find the specific student
        const student = users.find(user => user.idNumber === idNumber);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        return res.json({
            success: true,
            points: student.points || 0,
            remainingSessions: student.remainingSessions || 0
        });
        
    } catch (error) {
        console.error("Error getting student points:", error);
        res.status(500).json({
            success: false,
            message: "Error getting student points",
            error: error.message
        });
    }
});

// Check if student can receive points today
app.get("/check-student-point", (req, res) => {
    try {
        const { idNumber } = req.query;
        
        if (!idNumber) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }
        
        // Get array of completed sessions that haven't received points yet
        let availableSessions = [];
        let alreadyAddedSessions = [];
        
        // Check completed walk-ins
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const sitInsData = fs.readFileSync("./sit-ins.json", "utf8");
                const allSitIns = JSON.parse(sitInsData);
                
                // Find completed sessions for this student
                const completedSitIns = allSitIns.filter(entry => 
                    entry.idNumber === idNumber && 
                    entry.status === 'completed'
                );
                
                // Separate into sessions with and without points
                completedSitIns.forEach(session => {
                    if (session.pointAdded) {
                        alreadyAddedSessions.push(session);
                    } else {
                        availableSessions.push({
                            id: session.id,
                            type: 'sit-in',
                            date: session.date,
                            timeIn: session.timeIn,
                            timeOut: session.timeOut || 'N/A'
                        });
                    }
                });
            }
        } catch (error) {
            console.error("Error checking sit-ins:", error);
        }
        
        // Check completed reservations
        try {
            if (fs.existsSync("./reservations.json")) {
                const reservationsData = fs.readFileSync("./reservations.json", "utf8");
                const allReservations = JSON.parse(reservationsData);
                
                // Find completed reservations for this student
                const completedReservations = allReservations.filter(entry => 
                    entry.idNumber === idNumber && 
                    entry.status === 'completed'
                );
                
                // Separate into sessions with and without points
                completedReservations.forEach(session => {
                    if (session.pointAdded) {
                        alreadyAddedSessions.push(session);
                    } else {
                        availableSessions.push({
                            id: session.id,
                            type: 'reservation',
                            date: session.date,
                            timeIn: session.timeIn,
                            timeOut: session.timeOut || 'N/A'
                        });
                    }
                });
            }
        } catch (error) {
            console.error("Error checking reservations:", error);
        }
        
        return res.json({
            success: true,
            availableSessions,
            alreadyAddedSessions,
            hasAvailableSessions: availableSessions.length > 0
        });
        
    } catch (error) {
        console.error("Error checking student point eligibility:", error);
        res.status(500).json({
            success: false,
            message: "Error checking student point eligibility",
            error: error.message
        });
    }
});

// Removed session auto-processing as requested by client

// Resources API Endpoints
app.get('/api/resources', (req, res) => {
    try {
        const resources = JSON.parse(fs.readFileSync('resources.json', 'utf8'));
        res.json(resources);
    } catch (error) {
        console.error('Error reading resources:', error);
        res.status(500).json({ error: 'Failed to load resources' });
    }
});

// Add GET endpoint for single resource
app.get('/api/resources/:id', (req, res) => {
    try {
        const resources = JSON.parse(fs.readFileSync('resources.json', 'utf8'));
        const resource = resources.find(r => r.id === req.params.id);
        
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        
        res.json(resource);
    } catch (error) {
        console.error('Error reading resource:', error);
        res.status(500).json({ error: 'Failed to load resource' });
    }
});

app.post('/api/resources', (req, res) => {
    try {
        const resources = JSON.parse(fs.readFileSync('resources.json', 'utf8'));
        
        // Check if resource with same name already exists
        const existingResource = resources.find(r => r.name === req.body.name);
        if (existingResource) {
            return res.status(400).json({ error: 'Resource with this name already exists' });
        }

        const newResource = {
            id: Date.now().toString(),
            name: req.body.name,
            link: req.body.link,
            category: req.body.category,
            description: req.body.description,
            enabled: req.body.enabled || false,
            createdAt: new Date().toISOString()
        };
        
        resources.push(newResource);
        fs.writeFileSync('resources.json', JSON.stringify(resources, null, 2));
        res.json(newResource);
    } catch (error) {
        console.error('Error adding resource:', error);
        res.status(500).json({ error: 'Failed to add resource' });
    }
});

app.put('/api/resources/:id', (req, res) => {
    try {
        const resources = JSON.parse(fs.readFileSync('resources.json', 'utf8'));
        const index = resources.findIndex(r => r.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Check if another resource with the same name exists
        const existingResource = resources.find(r => r.name === req.body.name && r.id !== req.params.id);
        if (existingResource) {
            return res.status(400).json({ error: 'Resource with this name already exists' });
        }

        resources[index] = {
            ...resources[index],
            name: req.body.name,
            link: req.body.link,
            category: req.body.category,
            description: req.body.description,
            enabled: req.body.enabled
        };
        
        fs.writeFileSync('resources.json', JSON.stringify(resources, null, 2));
        res.json(resources[index]);
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ error: 'Failed to update resource' });
    }
});

app.delete('/api/resources/:id', (req, res) => {
    try {
        const resources = JSON.parse(fs.readFileSync('resources.json', 'utf8'));
        const filteredResources = resources.filter(r => r.id !== req.params.id);
        if (filteredResources.length === resources.length) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        fs.writeFileSync('resources.json', JSON.stringify(filteredResources, null, 2));
        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});

// Add toggle endpoint
app.put('/api/resources/:id/toggle', (req, res) => {
    try {
        const resources = JSON.parse(fs.readFileSync('resources.json', 'utf8'));
        const index = resources.findIndex(r => r.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        
        // Toggle the enabled status
        resources[index].enabled = !resources[index].enabled;
        
        fs.writeFileSync('resources.json', JSON.stringify(resources, null, 2));
        res.json(resources[index]);
    } catch (error) {
        console.error('Error toggling resource:', error);
        res.status(500).json({ error: 'Failed to toggle resource' });
    }
});

// Admin create student
app.post("/admin/create-student", async (req, res) => {
    const { idNumber, firstName, middleName, lastName, email, year, course, password } = req.body;

    if (!idNumber || !firstName || !lastName || !email || !year || !course || !password) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    let users = readData();

    if (users.some(user => user.idNumber === idNumber)) {
        return res.status(400).json({ message: "Student ID already exists!" });
    }

    if (users.some(user => user.email === email)) {
        return res.status(400).json({ message: "Email already exists!" });
    }

    try {
        // Hash the password before storing
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
            password: hashedPassword,
            completedSessions: 0,
            pendingReservations: 0,
            remainingSessions: initialSessions
        };

        users.push(newUser);
        writeData(users);

        res.status(201).json({ message: "Student created successfully!" });

    } catch (error) {
        console.error("Error creating student:", error);
        res.status(500).json({ message: "Error creating student" });
    }
});