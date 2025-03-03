const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const router = express.Router();
const usersFile = "data.json";

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Change to true if using HTTPS
}));

// Serve static files
app.use(express.static(__dirname)); // Serve login.html
app.use(express.static("public"));
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

// **User Authentication**
app.post("/login", async (req, res) => {
    console.log("Login attempt:", req.body);

    const { identifier, password } = req.body;
    let users = readData();

    const user = users.find(user => user.idNumber === identifier || user.email === identifier);
    if (!user) return res.status(401).json({ message: "User not found!" });

    console.log("✅ Found user:", user.idNumber);

    try {
        // ✅ Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid password!" });

        req.session.user = { idNumber: user.idNumber, role: "student" };
        console.log("🔒 Session stored:", req.session.user);

        res.json({ userId: user.idNumber, redirect: `/student.html?id=${user.idNumber}` });

    } catch (error) {
        res.status(500).json({ message: "Error comparing passwords" });
    }
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

// **Update Password**
router.post("/update-password", async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // Load users from data.json
    let users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    let user = users.find(user => user.idNumber === userId);

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    // Compare current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
        return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Save updated users list back to data.json
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf8");

    res.json({ success: true, message: "Password updated successfully." });
});

module.exports = router;

// **Profile Management**
app.get("/get-profile", (req, res) => {
    const userId = req.query.id;
    let users = readData();
    const user = users.find(user => user.idNumber === userId);

    if (!user) return res.status(404).json({ error: "User not found!" });

    res.json({
        idNumber: user.idNumber,
        firstName: user.firstName,
        middleName: user.middleName || "",
        lastName: user.lastName,
        email: user.email,
        year: user.year,
        course: user.course,
        profileImage: user.profileImage || "/uploads/default.png"
    });
});

app.post("/update-profile", (req, res) => {
    let users = readData();
    const userIndex = users.findIndex(user => user.idNumber === req.body.idNumber);

    if (userIndex === -1) return res.status(404).json({ error: "User not found!" });

    users[userIndex].year = req.body.year;
    users[userIndex].course = req.body.course;
    users[userIndex].email = req.body.email;
    users[userIndex].fullName = req.body.fullName;

    writeData(users);
    res.json({ success: true });
});

// **Profile Image Upload**
const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({ storage: storage });

app.post("/upload-profile", upload.single("profileImage"), (req, res) => {
    const userId = req.body.userId;
    let users = readData();

    const userIndex = users.findIndex(user => user.idNumber === userId);
    if (userIndex === -1) return res.status(404).json({ error: "User not found!" });

    users[userIndex].profileImage = `/uploads/${req.file.filename}`;
    writeData(users);

    res.json({ success: true, imagePath: users[userIndex].profileImage });
});

// **Start the server**
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
