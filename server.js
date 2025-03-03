const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const session = require("express-session");

app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Change to true if using HTTPS
}));

const PORT = 3000;

// Serve login.html (since it's outside dist)
app.use(express.static(__dirname));

// Middleware for serving static files
app.use(express.static("public"));

// Serve static files from the 'dist' directory
app.use("/dist", express.static(path.join(__dirname, "dist")));

// ✅ Serve uploaded images correctly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Default route → Redirect to login page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html")); // Login page is outside dist
});

// Fix register route to serve from `dist/views/`
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "views", "register.html"));
});

// Read & write user data
const DATA_FILE = path.join(__dirname, "data.json");

function readData() {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Set up storage for profile images
const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);    
    }
});

const upload = multer({ storage: storage });

// Ensure uploads folder exists
if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
}

// Route to serve profile.html as a partial page
app.get("/profile", (req, res) => {
    fs.readFile(path.join(__dirname, "public", "profile.html"), "utf8", (err, data) => {
        if (err) {
            res.status(500).send("Error loading profile page");
            return;
        }
        res.send(data);
    });
});

// Route to serve student dashboard
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "student.html"));
});

// Get user profile data
app.get("/get-profile", (req, res) => {
    const userId = req.query.id;
    let users = readData(); // Read users from data.json

    const user = users.find(user => user.idNumber === userId);
    if (!user) {
        return res.status(404).json({ error: "User not found!" });
    }

    res.json({
        idNumber: user.idNumber,
        firstName: user.firstName,
        middleName: user.middleName || "",
        lastName: user.lastName,
        email: user.email,
        year: user.year,
        course: user.course,
        profileImage: user.profileImage || "/uploads/default.png" // Load saved image
    });
});

app.post("/update-profile", (req, res) => {
    let users = readData();
    const userIndex = users.findIndex(user => user.idNumber === req.body.idNumber);

    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found!" });
    }

    // Update user data
    users[userIndex].year = req.body.year;
    users[userIndex].course = req.body.course;
    users[userIndex].email = req.body.email;
    users[userIndex].fullName = req.body.fullName;

    writeData(users); // Save changes to `data.json`
    res.json({ success: true });
});

app.post("/update-password", async (req, res) => {
    console.log("Session Data:", req.session); // Debugging session
    console.log("Request Body:", req.body); // Debugging request body

    const { currentPassword, newPassword, confirmPassword } = req.body;
    console.log("Received data - Current Password:", currentPassword, "New Password:", newPassword, "Confirm Password:", confirmPassword);

    if (!req.session.user) {
        console.log("Unauthorized request: No session user");
        return res.status(401).json({ message: "Unauthorized! Please log in." });
    }

    let users = readData();
    const userIndex = users.findIndex(user => user.idNumber === req.session.user.idNumber);

    if (userIndex === -1) {
        console.log("User not found:", req.session.user.idNumber);
        return res.status(404).json({ message: "User not found!" });
    }

    const user = users[userIndex];
    console.log("User Found:", user);

    // ✅ Check if the current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log("Password Match:", isMatch);

    if (!isMatch) {
        console.log("Incorrect current password!");
        return res.status(401).json({ message: "Incorrect current password!" });
    }

    // ✅ Hash the new password before storing it
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedPassword;
    console.log("Updated Password Hash:", hashedPassword);

    writeData(users);
    console.log("Password updated successfully!");

    res.status(200).json({ message: "Password updated successfully!" });
});

// Handle profile image upload
app.post("/upload-profile", upload.single("profileImage"), (req, res) => {
    const userId = req.body.userId; // Get user ID from request
    let users = readData(); // Read users from data.json

    // Find the user by ID
    const userIndex = users.findIndex(user => user.idNumber === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found!" });
    }

    // ✅ Save the uploaded image path
    const imagePath = `/uploads/${req.file.filename}`;
    users[userIndex].profileImage = imagePath;

    // ✅ Save changes back to `data.json`
    fs.writeFileSync("data.json", JSON.stringify(users, null, 2));

    res.json({ success: true, imagePath });
});

// Serve register and forgot password pages from 'dist' folder
app.post("/register", (req, res) => {
    const { idNumber, firstName, middleName, lastName, email, year, course, password } = req.body;

    if (!idNumber || !firstName || !lastName || !email || !year || !course || !password) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    let users = readData();
    
    if (users.some(user => user.idNumber === idNumber)) {
        return res.status(400).json({ message: "User already exists!" });
    }

    const newUser = { idNumber, firstName, middleName, lastName, email, year, course, password };
    users.push(newUser);
    writeData(users);

    res.status(201).json({ message: "Registration successful!", redirect: "/" });
});

app.get("/forgot-password", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "views", "forgotpassword.html"));
});

app.post("/reset-password", async (req, res) => {
    const { idNumber, newPassword } = req.body;

    if (!idNumber || !newPassword) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    let users = readData();
    const userIndex = users.findIndex(user => user.idNumber === idNumber);

    if (userIndex === -1) {
        return res.status(404).json({ message: "User not found!" });
    }

    // ✅ Hash the new password before storing it
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedPassword;
    writeData(users);

    res.status(200).json({ message: "Password reset successful!" });
});

// Login endpoint (Mock authentication)
app.post("/login", (req, res) => {
    console.log("Login attempt:", req.body); // ✅ Log the request body

    const { identifier, password } = req.body;
    let users = readData(); // Read users from data.json

    // ✅ Check if identifier exists
    const user = users.find(user => user.idNumber === identifier || user.email === identifier);
    if (!user) {
        console.log("❌ User not found:", identifier);
        return res.status(401).json({ message: "User not found!" });
    }

    console.log("✅ Found user:", user.idNumber);

    // ✅ Check password match
    if (user.password !== password) {
        console.log("❌ Incorrect password for:", user.idNumber);
        return res.status(401).json({ message: "Invalid password!" });
    }

    // ✅ Store session
    req.session.user = { idNumber: user.idNumber, role: "student" };
    console.log("🔒 Session stored:", req.session.user);

    res.json({ 
        userId: user.idNumber, 
        redirect: `/student.html?id=${user.idNumber}`
    });
});




app.get("/student.html", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "student.html"));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
