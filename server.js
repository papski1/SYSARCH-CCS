const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const app = express();
const PORT = 3000;

// Serve login.html (since it's outside dist)
app.use(express.static(__dirname));

// Serve static files from the 'dist' directory
app.use("/dist", express.static(path.join(__dirname, "dist")));

// ✅ Serve uploaded images correctly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware to parse JSON requests
app.use(express.json());

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

app.get("/profile.html", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "views", "profile.html"));
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

app.post("/reset-password", (req, res) => {
    const { idNumber, newPassword } = req.body;

    if (!idNumber || !newPassword) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    let users = readData();
    const userIndex = users.findIndex(user => user.idNumber === idNumber);

    if (userIndex === -1) {
        return res.status(404).json({ message: "User not found!" });
    }

    users[userIndex].password = newPassword;
    writeData(users);

    res.status(200).json({ message: "Password reset successful!" });
});

// Login endpoint (Mock authentication)
app.post("/login", (req, res) => {
    const { identifier, password } = req.body;
    let users = readData(); // Read users from data.json

    // ✅ Default Admin Login
    if (identifier === "admin" && password === "users") {
        return res.json({ redirect: "/dist2/admin.html" }); // Redirect to Admin Dashboard
    }

    // ✅ Find user by ID Number or Email
    const user = users.find(user => user.idNumber === identifier || user.email === identifier);

    if (!user) {
        return res.status(401).json({ message: "User not found!" });
    }

    // ✅ Check if password matches
    if (user.password !== password) {
        return res.status(401).json({ message: "Invalid password!" });
    }

    // ✅ Redirect to Student Dashboard instead of Profile Page
    res.json({ redirect: `/student.html?id=${user.idNumber}` });
});

app.get("/student.html", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "student.html"));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
