/**
 * POINTS SYSTEM FOR ADMIN.JS
 * This file contains all the code needed to implement the points system.
 * Follow the instructions below to integrate it into your existing files.
 */

// 1. Add this function to admin.js (after the closeDetailsModal function)
async function addStudentPoint(idNumber) {
    try {
        const response = await fetch("http://localhost:3000/add-student-points", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idNumber })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Show specific error message if student has no completed sessions
            if (result.message && result.message.includes('no completed sessions')) {
                alert("Cannot add points: This student has no completed sessions. Points can only be added after a session is completed.");
            } else {
                alert("Error: " + (result.message || "Failed to add point"));
            }
            return;
        }
        
        // Show a success message
        const message = result.pointsConverted 
            ? `Point added! 3 points converted to 1 session. Student now has ${result.newRemainingSessions} remaining sessions.`
            : `Point added! Student now has ${result.newPoints}/3 points.`;
        
        alert(message);
        
        // Refresh the students list to update the display
        fetchStudents();
        
    } catch (error) {
        console.error("Error adding student point:", error);
        alert("Error adding point. Please try again.");
    }
}

// 2. Update the displayStudents function in admin.js by modifying the student row HTML
// Find the line with "<div class="flex items-center space-x-2">" in the student row template
// and replace that div with this code:
`
<div class="flex items-center space-x-2">
    <button onclick="viewStudentDetails('${student.idNumber}')" 
        class="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 transition-colors">
        View Details
    </button>
    <button onclick="addStudentPoint('${student.idNumber}')"
        class="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600 transition-colors">
        Add Point (${student.points || 0}/3)
    </button>
    <div class="relative student-actions">
        <button class="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center focus:outline-none transition-colors" onclick="toggleStudentMenu('${student.idNumber}')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
        </button>
        <div id="student-menu-${student.idNumber}" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden">
            <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onclick="editStudent('${student.idNumber}')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
            </button>
            <button class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100" onclick="deleteStudent('${student.idNumber}')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
            </button>
        </div>
    </div>
</div>
`

// 3. Update the student details modal in the viewStudentDetails function 
// by adding a new row for points in the grid. Find the ending of the grid
// and add this code before the closing div:
`
<div>
    <p class="text-sm text-gray-500">Points</p>
    <p class="font-medium">${student.points || 0}/3</p>
</div>
`

/**
 * SERVER ENDPOINTS
 * These endpoints need to be added to server.js
 */

// 1. Add points to a student and convert to sessions if needed
app.post("/add-student-points", (req, res) => {
    try {
        const { idNumber } = req.body;
        
        if (!idNumber) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
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

        // Check if student has a completed session (either walk-in or reservation)
        let hasCompletedSession = false;
        
        // Check completed walk-ins
        try {
            if (fs.existsSync("./sit-ins.json")) {
                const sitInsData = fs.readFileSync("./sit-ins.json", "utf8");
                const allSitIns = JSON.parse(sitInsData);
                
                // Look for completed walk-ins for this student
                hasCompletedSession = allSitIns.some(
                    entry => entry.idNumber === idNumber && entry.status === 'completed'
                );
            }
        } catch (error) {
            console.error("Error checking sit-ins:", error);
        }
        
        // If no completed walk-ins, check reservations
        if (!hasCompletedSession) {
            try {
                if (fs.existsSync("./reservations.json")) {
                    const reservationsData = fs.readFileSync("./reservations.json", "utf8");
                    const allReservations = JSON.parse(reservationsData);
                    
                    // Look for completed reservations for this student
                    hasCompletedSession = allReservations.some(
                        entry => entry.idNumber === idNumber && entry.status === 'completed'
                    );
                }
            } catch (error) {
                console.error("Error checking reservations:", error);
            }
        }
        
        // Only allow adding points if student has completed a session
        if (!hasCompletedSession) {
            return res.status(400).json({
                success: false,
                message: 'Student has no completed sessions. Points can only be added for completed sessions.'
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

// 2. Get student points
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