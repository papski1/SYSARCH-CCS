// Function to hide all sections
function hideAllSections() {
    document.querySelectorAll("section").forEach(section => {
        section.classList.add("hidden");
    });
}

// Function to show a specific section
function showSection(sectionId) {
    hideAllSections();
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove("hidden");
        // Save the selected section to localStorage
        localStorage.setItem("adminActiveSection", sectionId);
        
        // Special handling for different sections
        if (sectionId === "sit-in") {
            // Load unified sit-ins and reservations data
            fetchSitIns();
        } else if (sectionId === "reports") {
            // Initialize reports section
            initializeReportsCharts();
        } else if (sectionId === "dashboard") {
            // Initialize dashboard
            initializeDashboard();
        }
    }
}

// Handle navigation
document.addEventListener("DOMContentLoaded", function() {
    // Get all menu links
    const menuLinks = document.querySelectorAll(".w-64 ul li a");
    
    // Add click event listeners to menu links
    menuLinks.forEach(link => {
        link.addEventListener("click", function(event) {
            event.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            
            // Special handling for logout
            if (targetId === "logout") {
                logout();
                return;
            }
            
            // Show the selected section
            showSection(targetId);
        });
    });

    // Get the saved section from localStorage or default to dashboard
    const savedSection = localStorage.getItem("adminActiveSection") || "dashboard";
    
    // Load Chart.js first, then initialize the dashboard
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = function() {
        // Initialize dashboard after Chart.js is loaded
        showSection(savedSection);
        
        // Fetch initial data
        fetchStudents();
        fetchSitIns();
        
        // Set up reports tab switching
        setupReportsTabs();
        
        // Set up student reports functionality
        setupStudentReports();
    };
    document.head.appendChild(script);

    // Reset Sessions functionality
    const resetSessionLink = document.querySelector('a[href="#reset-session"]');
    const resetSessionModal = document.getElementById('reset-session');
    const closeResetModalBtn = document.getElementById('close-reset-modal');
    const resetSemesterBtn = document.getElementById('reset-semester-btn');
    const resetUserBtn = document.getElementById('reset-user-btn');
    const semesterSelect = document.getElementById('semester-select');
    const userIdInput = document.getElementById('user-id-input');

    // Handle modal opening
    resetSessionLink.addEventListener('click', function(e) {
        e.preventDefault();
        resetSessionModal.classList.remove('hidden');
        loadResetLogs(); // Load reset logs when opening the modal
    });

    // Handle modal closing
    closeResetModalBtn.addEventListener('click', function() {
        resetSessionModal.classList.add('hidden');
        document.getElementById('reset-status-container').classList.add('hidden');
    });

    // Click outside to close
    resetSessionModal.addEventListener('click', function(e) {
        if (e.target === resetSessionModal) {
            resetSessionModal.classList.add('hidden');
            document.getElementById('reset-status-container').classList.add('hidden');
        }
    });

    // Function to check if the current user is logged in as admin
    async function checkAdminAuth() {
        try {
            const response = await fetch('http://localhost:3000/check-admin', {
                method: 'GET',
                credentials: 'include' // Important for session cookies
            });
            
            if (!response.ok) {
                return false;
            }
            
            const data = await response.json();
            return data.isAdmin === true;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // Function to show status message in reset modal
    function showResetStatusMessage(message, type = 'info') {
        const statusContainer = document.getElementById('reset-status-container');
        const statusMessage = document.getElementById('reset-status-message');
        
        if (!statusContainer || !statusMessage) return;
        
        // Set message
        statusMessage.innerHTML = message;
        
        // Set color based on type
        statusMessage.className = 'p-3 rounded text-center';
        if (type === 'success') {
            statusMessage.classList.add('bg-green-100', 'text-green-800');
        } else if (type === 'error') {
            statusMessage.classList.add('bg-red-100', 'text-red-800');
        } else if (type === 'warning') {
            statusMessage.classList.add('bg-yellow-100', 'text-yellow-800');
        } else {
            statusMessage.classList.add('bg-blue-100', 'text-blue-800');
        }
        
        // Show the container
        statusContainer.classList.remove('hidden');
        
        // Optional: Auto-hide after some time
        if (type !== 'error') {
            setTimeout(() => {
                statusContainer.classList.add('hidden');
            }, 8000);
        }
    }

    // Reset by semester
    resetSemesterBtn.addEventListener('click', async function() {
        const semester = semesterSelect.value;
        if (!semester) {
            alert('Please select a semester');
            return;
        }

        // Check admin auth first
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            alert('You must be logged in as an administrator to reset sessions. Please log in again.');
            window.location.href = '/'; // Redirect to login
            return;
        }

        if (confirm(`Are you sure you want to reset all sessions for ${semester}? This action cannot be undone.`)) {
            try {
                // Show processing message
                showResetStatusMessage(`<div class="animate-pulse">Resetting sessions for ${semester}...</div>`, 'info');
                
                const result = await resetSessions({ semester });
                
                // Show success message with details
                showResetStatusMessage(
                    `<div class="font-medium">${result.message}</div>
                    <div class="text-sm mt-1">Removed: ${result.details.reservationsRemoved} reservations, ${result.details.sitInsRemoved} sit-ins</div>`, 
                    'success'
                );
                
                // Refresh data but keep modal open
                fetchSitIns();
                
                // Clear the semester select
                semesterSelect.value = '';
                
            } catch (error) {
                showResetStatusMessage(`Error: ${error.message}`, 'error');
            }
        }
    });

    // Reset by user
    resetUserBtn.addEventListener('click', async function() {
        const idNumber = userIdInput.value.trim();
        if (!idNumber) {
            alert('Please enter a student ID');
            return;
        }

        // Check admin auth first
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            alert('You must be logged in as an administrator to reset sessions. Please log in again.');
            window.location.href = '/'; // Redirect to login
            return;
        }

        if (confirm(`Are you sure you want to reset all sessions for student with ID ${idNumber}? This action cannot be undone.`)) {
            try {
                // Show processing message
                showResetStatusMessage(`<div class="animate-pulse">Resetting sessions for user ${idNumber}...</div>`, 'info');
                
                const result = await resetSessions({ idNumber });
                
                // Show success message with details
                showResetStatusMessage(
                    `<div class="font-medium">${result.message}</div>
                    <div class="text-sm mt-1">Removed: ${result.details.reservationsRemoved} reservations, ${result.details.sitInsRemoved} sit-ins</div>`, 
                    'success'
                );
                
                // Refresh data but keep modal open
                fetchSitIns();
                
                // Clear the input
                userIdInput.value = '';
                
            } catch (error) {
                showResetStatusMessage(`Error: ${error.message}`, 'error');
            }
        }
    });
});

// Fetch and display students
async function fetchStudents() {
    try {
        const tableBody = document.getElementById("students-table");
        tableBody.innerHTML = "<tr><td colspan='5' class='text-center py-4'>Loading students...</td></tr>";

        const response = await fetch("http://localhost:3000/get-all-users");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const students = await response.json();

        if (!Array.isArray(students)) {
            throw new Error("Invalid response format");
        }

        // Store students globally for search functionality
        window.allStudents = students;

        // Initial display of all students
        displayStudents(students);

        // Update total students count
        document.getElementById('total-students').textContent = students.length;

        // Add search functionality
        const searchBar = document.getElementById('search-bar');
        searchBar.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filteredStudents = students.filter(student => 
                student.idNumber.toLowerCase().includes(searchTerm)
            );
            displayStudents(filteredStudents);
        });

    } catch (error) {
        console.error("Error fetching students:", error);
        const tableBody = document.getElementById("students-table");
        tableBody.innerHTML = `
            <tr>
                <td colspan='5' class='text-center py-4 text-red-600'>
                    Error loading students. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Function to display students in the table
function displayStudents(students) {
    const tableBody = document.getElementById("students-table");
    tableBody.innerHTML = ""; // Clear previous data

    if (students.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='5' class='text-center py-4'>No students found</td></tr>";
        return;
    }

    students.forEach((student) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="border px-4 py-2">${student.idNumber}</td>
            <td class="border px-4 py-2">${student.firstName} ${student.lastName}</td>
            <td class="border px-4 py-2">${student.course}</td>
            <td class="border px-4 py-2">${student.year}</td>
            <td class="border px-4 py-2">
                <button onclick="viewStudentDetails('${student.idNumber}')" 
                    class="bg-blue-500 text-white px-2 py-1 rounded text-sm">
                    View Details
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function updateReservationStatus(reservationId, status) {
    try {
        console.log("Updating reservation status:", { reservationId, status });
        
        const response = await fetch("http://localhost:3000/update-reservation-status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ 
                reservationId: parseInt(reservationId), 
                status 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update reservation status');
        }

        const data = await response.json();
        
        // Show appropriate message based on status
        let message = data.message;
        if (status === 'approved') {
            message = "Reservation approved and sit-in session created successfully.";
            
            // Refresh both reservations and sit-ins tables
            await Promise.all([
                fetchReservations(),
                fetchSitIns()
            ]);
            
            // Update dashboard counts
            const dashboardSitInCount = document.getElementById('current-sit-in');
            if (dashboardSitInCount) {
                const currentCount = parseInt(dashboardSitInCount.textContent || '0');
                dashboardSitInCount.textContent = currentCount + 1;
            }
        } else if (status === 'rejected') {
            message = "Reservation rejected successfully.";
            // Only refresh reservations for rejected status
            await fetchReservations();
        }
        
        // Show success message
        alert(message);
        
    } catch (error) {
        console.error("Error updating reservation status:", error);
        alert("Error: " + (error.message || "Failed to update reservation status"));
    }
}

function viewStudentDetails(idNumber) {
    // Implement student details view functionality
    console.log("Viewing details for student:", idNumber);
}

function logout() {
    fetch("/logout", { method: "POST" })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "login.html";
        })
        .catch(error => console.error("Logout error:", error));
}

// Function to fetch and display sit-ins and reservations in a unified table
async function fetchSitIns() {
    try {
        console.log("Fetching sit-ins and reservations...");
        
        // Fetch both sit-ins and reservations
        const [sitInsResponse, reservationsResponse] = await Promise.all([
            fetch("http://localhost:3000/sit-ins"),
            fetch("http://localhost:3000/reservations")
        ]);

        if (!sitInsResponse.ok || !reservationsResponse.ok) {
            throw new Error("Failed to fetch data");
        }

        const sitIns = await sitInsResponse.json();
        const reservations = await reservationsResponse.json();

        // Get pending reservations and active sit-ins
        const pendingReservations = reservations.filter(res => res.status === 'pending');
        const activeSitIns = sitIns.filter(sit => sit.status === 'active');
        const completedSitIns = sitIns.filter(sit => sit.status === 'completed');

        // Update dashboard counts
        document.getElementById('current-sit-in').textContent = activeSitIns.length;
        document.getElementById('pending-reservations').textContent = pendingReservations.length;

        // Display in unified table
        displayUnifiedTable(pendingReservations, activeSitIns, completedSitIns);

    } catch (error) {
        console.error("Error fetching data:", error);
        const tableBody = document.getElementById("unified-sit-ins-table");
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-4 text-red-500">
                        Error loading data: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// Function to display unified table
function displayUnifiedTable(pendingReservations, activeSitIns, completedSitIns) {
    const tableBody = document.getElementById("unified-sit-ins-table");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    // Combine and sort all entries by date and time
    const allEntries = [
        ...pendingReservations.map(r => ({...r, entryType: 'reservation'})),
        ...activeSitIns.map(s => ({...s, entryType: 'active'})),
        ...completedSitIns.map(s => ({...s, entryType: 'completed'}))
    ].sort((a, b) => {
        const dateA = new Date(a.date + ' ' + (a.timeIn || '00:00'));
        const dateB = new Date(b.date + ' ' + (b.timeIn || '00:00'));
        return dateB - dateA;
    });

    if (allEntries.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4 text-gray-500">
                    No entries found
                </td>
            </tr>
        `;
        return;
    }

    allEntries.forEach(entry => {
        const row = document.createElement("tr");
        row.className = entry.entryType === 'reservation' ? 'bg-yellow-50' : 
                       entry.entryType === 'active' ? 'bg-green-50' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="border px-4 py-2">${entry.idNumber || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.name || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.course || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.year || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.purpose || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.date || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.timeIn || 'N/A'}</td>
            <td class="border px-4 py-2">
                ${entry.timeOut ? new Date(entry.timeOut).toLocaleTimeString() : 'N/A'}
            </td>
            <td class="border px-4 py-2">
                <span class="px-2 py-1 rounded text-sm ${
                    entry.entryType === 'reservation' ? 'bg-yellow-100 text-yellow-800' :
                    entry.entryType === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                }">
                    ${entry.entryType === 'reservation' ? 'Pending' :
                      entry.entryType === 'active' ? 'Active' : 'Completed'}
                </span>
            </td>
            <td class="border px-4 py-2">
                ${entry.entryType === 'reservation' ? `
                    <div class="flex space-x-2">
                        <button onclick="updateReservationStatus('${entry.id}', 'approved')" 
                            class="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">
                            Approve
                        </button>
                        <button onclick="updateReservationStatus('${entry.id}', 'rejected')" 
                            class="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">
                            Reject
                        </button>
                    </div>
                ` : entry.entryType === 'active' ? `
                    <button onclick="completeSitIn('${entry.id}')" 
                        class="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600">
                        Mark as Completed
                    </button>
                ` : `
                    <span class="text-sm text-gray-500">Completed at ${
                        entry.timeOut ? new Date(entry.timeOut).toLocaleTimeString() : 'N/A'
                    }</span>
                `}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function completeSitIn(sitInId) {
    try {
        if (!confirm('Are you sure you want to mark this sit-in as completed?')) {
            return;
        }

        const response = await fetch("http://localhost:3000/update-sit-in-status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sitInId: parseInt(sitInId),
                status: 'completed',
                timeOut: new Date().toISOString()
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to update sit-in status');
        }

        if (data.success) {
            // Refresh the sit-ins tables
            await fetchSitIns();
            
            // Show success message
            alert("Sit-in marked as completed successfully!");
        } else {
            throw new Error(data.message || 'Failed to update sit-in status');
        }
        
    } catch (error) {
        console.error("Error completing sit-in:", error);
        alert("Error completing sit-in: " + error.message);
    }
}

// Function to initialize dashboard
async function initializeDashboard() {
    try {
        // Fetch students data
        const studentsResponse = await fetch("http://localhost:3000/get-all-users");
        const students = await studentsResponse.json();
        
        // Update total students count
        document.getElementById('total-students').textContent = students.length;

        // Fetch current sit-ins
        const sitInsResponse = await fetch("http://localhost:3000/sit-ins");
        const sitIns = await sitInsResponse.json();
        const activeSitIns = sitIns.filter(sitIn => sitIn.status === 'active');
        document.getElementById('current-sit-in').textContent = activeSitIns.length;

        // Fetch pending reservations
        const reservationsResponse = await fetch("http://localhost:3000/reservations");
        const reservations = await reservationsResponse.json();
        const pendingReservations = reservations.filter(res => res.status === 'pending');
        document.getElementById('pending-reservations').textContent = pendingReservations.length;

        // Get the chart context
        const ctx = document.getElementById('studentStatsChart');
        if (!ctx) {
            console.warn('Chart canvas not found');
            return;
        }

        // Safely destroy existing chart if it exists
        if (window.studentStatsChart && typeof window.studentStatsChart.destroy === 'function') {
            window.studentStatsChart.destroy();
        }
        
        // Count programming language usage
        const languageStats = {};
        reservations.forEach(reservation => {
            if (reservation.programmingLanguage) {
                languageStats[reservation.programmingLanguage] = (languageStats[reservation.programmingLanguage] || 0) + 1;
            }
        });

        // Prepare data for chart
        const labels = Object.keys(languageStats);
        const data = Object.values(languageStats);

        // Create new chart only if Chart.js is loaded
        if (typeof Chart !== 'undefined') {
            window.studentStatsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Programming Language Usage',
                        data: data,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(255, 99, 132, 0.5)',
                            'rgba(75, 192, 192, 0.5)',
                            'rgba(255, 206, 86, 0.5)',
                            'rgba(153, 102, 255, 0.5)',
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(153, 102, 255, 1)',
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Programming Language Distribution'
                        }
                    }
                }
            });
        } else {
            console.warn('Chart.js is not loaded yet');
        }

        // Load recent announcements
        loadRecentAnnouncements();
        
        // Check for new feedback
        const feedbackResponse = await fetch("http://localhost:3000/feedback");
        const feedback = await feedbackResponse.json();
        const lastSeenFeedback = localStorage.getItem("lastSeenFeedback") || "0";
        const newFeedback = feedback.filter(f => new Date(f.date).getTime() > parseInt(lastSeenFeedback));
        
        if (newFeedback.length > 0) {
            showFeedbackNotification();
        }
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
}

// Function to post announcement
async function postAnnouncement() {
    const announcementTitle = document.getElementById('announcementTitle').value.trim();
    const announcementText = document.getElementById('announcementText').value.trim();
    
    if (!announcementTitle) {
        alert("Please enter an announcement title.");
        return;
    }
    if (!announcementText) {
        alert("Please enter an announcement message.");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/post-announcement", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: announcementTitle,
                message: announcementText
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert("Announcement posted successfully!");
            document.getElementById('announcementTitle').value = '';
            document.getElementById('announcementText').value = '';
            await loadRecentAnnouncements();
        } else {
            throw new Error(data.error || "Failed to post announcement");
        }
    } catch (error) {
        console.error("Error posting announcement:", error);
        alert("Failed to post announcement. Please try again.");
    }
}

// Function to load recent announcements
async function loadRecentAnnouncements() {
    try {
        const response = await fetch("http://localhost:3000/get-announcements");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const announcements = Array.isArray(data) ? data : [];
        
        const announcementsContainer = document.getElementById('recentAnnouncements');
        announcementsContainer.innerHTML = '';

        if (announcements.length === 0) {
            announcementsContainer.innerHTML = '<p class="text-gray-500">No announcements yet.</p>';
            return;
        }

        announcements.slice(0, 5).forEach(announcement => {
            const announcementElement = document.createElement('div');
            announcementElement.className = 'p-3 bg-gray-50 rounded mb-2 relative';
            announcementElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-sm text-gray-600">${new Date(announcement.date).toLocaleString()}</p>
                        <h4 class="font-semibold text-gray-800 mb-1">${announcement.title}</h4>
                        <p class="mt-1">${announcement.message}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editAnnouncement(${announcement.id})" 
                            class="text-blue-500 hover:text-blue-700">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="deleteAnnouncement(${announcement.id})" 
                            class="text-red-500 hover:text-red-700">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            announcementsContainer.appendChild(announcementElement);
        });
    } catch (error) {
        console.error("Error loading announcements:", error);
        const announcementsContainer = document.getElementById('recentAnnouncements');
        announcementsContainer.innerHTML = '<p class="text-red-500">Error loading announcements.</p>';
    }
}

// Function to edit announcement
async function editAnnouncement(id) {
    try {
        const response = await fetch(`http://localhost:3000/get-announcement/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const announcement = await response.json();

        // Create and show edit modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg w-96">
                <h2 class="text-xl font-bold mb-4">Edit Announcement</h2>
                <input type="text" id="editAnnouncementTitle" class="w-full p-2 border rounded mb-2" value="${announcement.title || ''}" placeholder="Enter announcement title...">
                <textarea id="editAnnouncementText" class="w-full p-2 border rounded mb-4" rows="4" placeholder="Enter announcement message...">${announcement.message}</textarea>
                <div class="flex justify-end space-x-2">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                    <button onclick="updateAnnouncement(${id})" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Update</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error("Error fetching announcement:", error);
        alert("Error fetching announcement details");
    }
}

// Function to update announcement
async function updateAnnouncement(id) {
    const title = document.getElementById('editAnnouncementTitle').value.trim();
    const message = document.getElementById('editAnnouncementText').value.trim();
    
    if (!title) {
        alert("Please enter an announcement title.");
        return;
    }
    if (!message) {
        alert("Please enter an announcement message.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/update-announcement/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title, message })
        });

        if (response.ok) {
            alert("Announcement updated successfully!");
            document.querySelector('.fixed').remove();
            await loadRecentAnnouncements();
        } else {
            throw new Error("Failed to update announcement");
        }
    } catch (error) {
        console.error("Error updating announcement:", error);
        alert("Failed to update announcement. Please try again.");
    }
}

// Function to delete announcement
async function deleteAnnouncement(id) {
    if (!confirm("Are you sure you want to delete this announcement?")) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/delete-announcement/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            alert("Announcement deleted successfully!");
            await loadRecentAnnouncements();
        } else {
            throw new Error("Failed to delete announcement");
        }
    } catch (error) {
        console.error("Error deleting announcement:", error);
        alert("Failed to delete announcement. Please try again.");
    }
}

// Function to show feedback notification dot
function showFeedbackNotification() {
    const feedbackLink = document.querySelector('a[href="#feedback"]');
    if (feedbackLink) {
        // Check if notification dot already exists
        if (!feedbackLink.querySelector('.notification-dot')) {
            const dot = document.createElement('span');
            dot.className = 'notification-dot absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full';
            feedbackLink.style.position = 'relative';
            feedbackLink.appendChild(dot);
        }
    }
}

// Function to clear feedback notification
function clearFeedbackNotification() {
    const feedbackLink = document.querySelector('a[href="#feedback"]');
    const dot = feedbackLink?.querySelector('.notification-dot');
    if (dot) {
        dot.remove();
    }
    
    // Update last seen timestamp
    const now = new Date().getTime();
    localStorage.setItem("lastSeenFeedback", now.toString());
}

// Function to make the API call to reset sessions
async function resetSessions(params) {
    try {
        const response = await fetch('http://localhost:3000/reset-sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params),
            credentials: 'include' // Important for session cookies
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to reset sessions');
        }

        const result = await response.json();
        
        // After a successful reset, refresh the reset logs
        await loadResetLogs();
        
        return result;
    } catch (error) {
        console.error('Error resetting sessions:', error);
        throw error;
    }
}

// Function to fetch reset logs
async function loadResetLogs() {
    try {
        const response = await fetch('http://localhost:3000/reset-logs', {
            method: 'GET',
            credentials: 'include' // Important for session cookies
        });

        if (!response.ok) {
            throw new Error('Failed to fetch reset logs');
        }

        const data = await response.json();
        if (data.success && data.logs) {
            displayResetLogs(data.logs);
        }
    } catch (error) {
        console.error('Error fetching reset logs:', error);
        document.getElementById('reset-logs-table').innerHTML = `
            <tr>
                <td colspan="3" class="p-2 text-center text-red-500">Error loading reset history</td>
            </tr>
        `;
    }
}

// Function to display reset logs
function displayResetLogs(logs) {
    const logsTable = document.getElementById('reset-logs-table');
    
    if (!logs || logs.length === 0) {
        logsTable.innerHTML = `
            <tr>
                <td colspan="3" class="p-2 text-center text-gray-500">No reset operations found</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    logs.forEach(log => {
        const date = new Date(log.timestamp).toLocaleString();
        let details = '';
        
        if (log.resetType === 'user') {
            details = `User ID: ${log.details.userId}<br>
                     Removed: ${log.details.reservationsRemoved} reservations, 
                     ${log.details.sitInsRemoved} sit-ins`;
        } else if (log.resetType === 'semester') {
            details = `Semester: ${log.details.semester}<br>
                     Removed: ${log.details.reservationsRemoved} reservations, 
                     ${log.details.sitInsRemoved} sit-ins`;
        }
        
        html += `
            <tr class="border-t">
                <td class="p-2">${date}</td>
                <td class="p-2">${log.resetType === 'user' ? 'User' : 'Semester'}</td>
                <td class="p-2">${details}</td>
            </tr>
        `;
    });
    
    logsTable.innerHTML = html;
}

// Function to setup reports tab switching
function setupReportsTabs() {
    const tabSitInStats = document.getElementById('tab-sit-in-stats');
    const tabUserFeedback = document.getElementById('tab-user-feedback');
    const tabStudentReports = document.getElementById('tab-student-reports');
    
    const contentSitInStats = document.getElementById('content-sit-in-stats');
    const contentUserFeedback = document.getElementById('content-user-feedback');
    const contentStudentReports = document.getElementById('content-student-reports');
    
    if (!tabSitInStats || !tabUserFeedback || !tabStudentReports) return;
    
    // Function to switch tabs
    function switchTab(activeTab, activeContent) {
        // Reset all tabs
        [tabSitInStats, tabUserFeedback, tabStudentReports].forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            tab.classList.add('text-gray-500');
        });
        
        // Reset all content
        [contentSitInStats, contentUserFeedback, contentStudentReports].forEach(content => {
            content.classList.add('hidden');
        });
        
        // Activate selected tab
        activeTab.classList.remove('text-gray-500');
        activeTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        
        // Show selected content
        activeContent.classList.remove('hidden');
    }
    
    // Add event listeners to tabs
    tabSitInStats.addEventListener('click', () => {
        switchTab(tabSitInStats, contentSitInStats);
        initializeReportsCharts();
    });
    
    tabUserFeedback.addEventListener('click', () => {
        switchTab(tabUserFeedback, contentUserFeedback);
        loadFeedback();
    });
    
    tabStudentReports.addEventListener('click', () => {
        switchTab(tabStudentReports, contentStudentReports);
    });
    
    // Initialize sit-in statistics when reports section is shown
    document.querySelector('a[href="#reports"]').addEventListener('click', () => {
        // This will run after showSection() is called
        setTimeout(() => {
            initializeReportsCharts();
        }, 100);
    });
}

// Function to setup student reports functionality
function setupStudentReports() {
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (!generateReportBtn) return;
    
    generateReportBtn.addEventListener('click', generateStudentReport);
}

// Function to initialize reports charts
async function initializeReportsCharts() {
    try {
        const sitIns = await fetchSitInsData();
        if (!sitIns || sitIns.length === 0) return;
        
        // Calculate statistics
        updateReportsStatistics(sitIns);
        
        // Create weekly activity chart
        createWeeklyActivityChart(sitIns);
        
        // Create department distribution chart
        createDepartmentDistributionChart(sitIns);
        
    } catch (error) {
        console.error('Error initializing reports charts:', error);
    }
}

// Function to update reports statistics
function updateReportsStatistics(sitIns) {
    const totalSessions = sitIns.length;
    document.getElementById('total-sessions').textContent = totalSessions;
    
    // Calculate completion rate
    const completedSessions = sitIns.filter(s => s.status === 'completed').length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    document.getElementById('completion-rate').textContent = completionRate;
    
    // Calculate average duration (in minutes)
    let totalDuration = 0;
    let validDurationCount = 0;
    
    sitIns.forEach(sitIn => {
        if (sitIn.status === 'completed' && sitIn.timeIn && sitIn.timeOut) {
            const timeIn = new Date(sitIn.date + ' ' + sitIn.timeIn);
            const timeOut = new Date(sitIn.timeOut);
            
            if (!isNaN(timeIn) && !isNaN(timeOut)) {
                const durationMinutes = Math.round((timeOut - timeIn) / (1000 * 60));
                if (durationMinutes > 0 && durationMinutes < 1440) { // Exclude unreasonable durations (> 24 hours)
                    totalDuration += durationMinutes;
                    validDurationCount++;
                }
            }
        }
    });
    
    const avgDuration = validDurationCount > 0 ? Math.round(totalDuration / validDurationCount) : 0;
    document.getElementById('avg-duration').textContent = avgDuration;
}

// Function to create weekly activity chart
function createWeeklyActivityChart(sitIns) {
    const canvas = document.getElementById('weeklyActivityChart');
    if (!canvas) return;
    
    // Get current date and calculate dates for the past week
    const today = new Date();
    const weekDates = [];
    const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        weekDates.push(date.toISOString().split('T')[0]);
    }
    
    // Count sit-ins for each day
    const dayCounts = weekDates.map(date => {
        return sitIns.filter(sitIn => sitIn.date === date).length;
    });
    
    // Create chart
    if (window.weeklyChart) {
        window.weeklyChart.destroy();
    }
    
    window.weeklyChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: weekLabels,
            datasets: [{
                label: 'Daily Sit-ins',
                data: dayCounts,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Function to create department distribution chart
function createDepartmentDistributionChart(sitIns) {
    const canvas = document.getElementById('departmentDistributionChart');
    if (!canvas) return;
    
    // Group sit-ins by course/department
    const courseMap = {};
    sitIns.forEach(sitIn => {
        const course = sitIn.course || 'Unknown';
        if (courseMap[course]) {
            courseMap[course]++;
        } else {
            courseMap[course] = 1;
        }
    });
    
    // Convert to arrays for chart
    const courses = Object.keys(courseMap);
    const counts = Object.values(courseMap);
    
    // Define colors
    const backgroundColors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(199, 199, 199, 0.5)'
    ];
    
    // Create chart
    if (window.departmentChart) {
        window.departmentChart.destroy();
    }
    
    window.departmentChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: courses,
            datasets: [{
                label: 'Sessions by Department',
                data: counts,
                backgroundColor: backgroundColors.slice(0, courses.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

// Function to generate student report
async function generateStudentReport() {
    const studentId = document.getElementById('student-report-id').value.trim();
    const startDate = document.getElementById('report-date-start').value;
    const endDate = document.getElementById('report-date-end').value;
    const resultsContainer = document.getElementById('student-report-results');
    
    if (!resultsContainer) return;
    
    // Show loading state
    resultsContainer.innerHTML = '<p class="text-center py-4">Loading report data...</p>';
    
    try {
        // Fetch student data
        let student = null;
        if (studentId) {
            student = await fetchStudentById(studentId);
            if (!student) {
                resultsContainer.innerHTML = '<p class="text-center py-4 text-red-600">Student with ID ' + studentId + ' not found</p>';
                return;
            }
        }
        
        // Fetch sit-ins
        const sitIns = await fetchSitInsData();
        
        // Filter sit-ins based on criteria
        let filteredSitIns = [...sitIns];
        
        // Filter by student if specified
        if (student) {
            filteredSitIns = filteredSitIns.filter(sitIn => sitIn.idNumber === student.idNumber);
        }
        
        // Filter by date range if specified
        if (startDate) {
            filteredSitIns = filteredSitIns.filter(sitIn => sitIn.date >= startDate);
        }
        
        if (endDate) {
            filteredSitIns = filteredSitIns.filter(sitIn => sitIn.date <= endDate);
        }
        
        // Generate report HTML
        if (filteredSitIns.length === 0) {
            resultsContainer.innerHTML = '<p class="text-center py-4">No data found for the selected criteria</p>';
            return;
        }
        
        let reportHtml = '';
        
        // Student details section if a specific student was selected
        if (student) {
            reportHtml += `
            <div class="bg-gray-50 p-4 rounded mb-4">
                <h4 class="font-medium text-lg mb-2">Student Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p><strong>ID:</strong> ${student.idNumber}</p>
                        <p><strong>Name:</strong> ${student.firstName} ${student.lastName}</p>
                    </div>
                    <div>
                        <p><strong>Course:</strong> ${student.course}</p>
                        <p><strong>Year:</strong> ${student.year}</p>
                    </div>
                </div>
            </div>`;
        }
        
        // Activity summary
        const totalSessions = filteredSitIns.length;
        const completedSessions = filteredSitIns.filter(s => s.status === 'completed').length;
        
        reportHtml += `
        <div class="bg-gray-50 p-4 rounded mb-4">
            <h4 class="font-medium text-lg mb-2">Activity Summary</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white p-3 rounded shadow">
                    <p class="text-sm text-gray-600">Total Sessions</p>
                    <p class="text-2xl font-bold text-blue-600">${totalSessions}</p>
                </div>
                <div class="bg-white p-3 rounded shadow">
                    <p class="text-sm text-gray-600">Completed</p>
                    <p class="text-2xl font-bold text-green-600">${completedSessions}</p>
                </div>
                <div class="bg-white p-3 rounded shadow">
                    <p class="text-sm text-gray-600">Completion Rate</p>
                    <p class="text-2xl font-bold text-purple-600">${totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%</p>
                </div>
            </div>
        </div>`;
        
        // Session details table
        reportHtml += `
        <div class="bg-gray-50 p-4 rounded">
            <h4 class="font-medium text-lg mb-2">Session Details</h4>
            <div class="overflow-x-auto">
                <table class="min-w-full border-collapse border border-gray-300">
                    <thead>
                        <tr class="bg-gray-200">
                            <th class="border px-4 py-2">Date</th>
                            <th class="border px-4 py-2">Time In</th>
                            <th class="border px-4 py-2">Time Out</th>
                            <th class="border px-4 py-2">Purpose</th>
                            <th class="border px-4 py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        // Sort sit-ins by date (newest first)
        filteredSitIns.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        filteredSitIns.forEach(sitIn => {
            const timeOut = sitIn.timeOut ? new Date(sitIn.timeOut).toLocaleTimeString() : 'N/A';
            reportHtml += `
                        <tr>
                            <td class="border px-4 py-2">${new Date(sitIn.date).toLocaleDateString()}</td>
                            <td class="border px-4 py-2">${sitIn.timeIn}</td>
                            <td class="border px-4 py-2">${timeOut}</td>
                            <td class="border px-4 py-2">${sitIn.purpose}</td>
                            <td class="border px-4 py-2">
                                <span class="px-2 py-1 rounded text-sm ${
                                    sitIn.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                    sitIn.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-gray-100 text-gray-800'
                                }">
                                    ${sitIn.status}
                                </span>
                            </td>
                        </tr>`;
        });
        
        reportHtml += `
                    </tbody>
                </table>
            </div>
        </div>`;
        
        // Add export button
        reportHtml += `
        <div class="mt-4 flex justify-end">
            <button id="export-report-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                Export Report
            </button>
        </div>`;
        
        // Add to results container
        resultsContainer.innerHTML = reportHtml;
        
        // Add export functionality
        document.getElementById('export-report-btn').addEventListener('click', () => {
            exportReport(student, filteredSitIns, startDate, endDate);
        });
        
    } catch (error) {
        console.error('Error generating report:', error);
        resultsContainer.innerHTML = '<p class="text-center py-4 text-red-600">Error generating report: ' + error.message + '</p>';
    }
}

// Function to fetch student by ID
async function fetchStudentById(studentId) {
    try {
        const response = await fetch(`http://localhost:3000/get-profile?id=${studentId}`);
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching student:', error);
        return null;
    }
}

// Function to export report
async function exportReport(student, sitIns, startDate, endDate) {
    // Implementation of export functionality
    console.log('Exporting report...');
}

// Function to fetch sit-ins data
async function fetchSitInsData() {
    // Implementation of fetching sit-ins data
    console.log('Fetching sit-ins data...');
    return [];
}

// Function to check for auto-logouts
async function checkAutoLogouts() {
    try {
        const response = await fetch("http://localhost:3000/check-auto-logouts");
        const data = await response.json();
        
        if (data.success && data.loggedOutUsers.length > 0) {
            // Refresh the sit-ins table if any users were logged out
            fetchSitIns();
            
            // Show notification
            data.loggedOutUsers.forEach(user => {
                showNotification(`User ${user.idNumber} was automatically logged out at ${user.timeOut}`);
            });
        }
    } catch (error) {
        console.error("Error checking auto-logouts:", error);
    }
}

// Function to show notifications
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Start auto-logout checker
setInterval(checkAutoLogouts, 60000); // Check every minute

// Add search functionality for unified table
document.getElementById('unified-search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const tableBody = document.getElementById('unified-sit-ins-table');
    const rows = tableBody.getElementsByTagName('tr');

    for (let row of rows) {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    }
});