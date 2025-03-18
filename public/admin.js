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
            fetchSitIns();
        } else if (sectionId === "sit-in-records") {
            loadTodaysSitInRecords();
        } else if (sectionId === "reports") {
            // Initialize reports section and show default tab
            initializeReportsCharts();
            setupReportsTabs();
            // Show sit-in statistics tab by default
            const tabSitInStats = document.getElementById('tab-sit-in-stats');
            const contentSitInStats = document.getElementById('content-sit-in-stats');
            if (tabSitInStats && contentSitInStats) {
                tabSitInStats.classList.remove('text-gray-500');
                tabSitInStats.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
                contentSitInStats.classList.remove('hidden');
            }
        } else if (sectionId === "dashboard") {
            initializeDashboard();
        } else if (sectionId === "reset-session") {
            // Initialize reset session section
            initResetSession();
        } else if (sectionId === "students") {
            // Load students when students section is shown
            fetchStudents();
        }
    }
}

// Function to check admin authentication
async function checkAdminAuth() {
    try {
        const response = await fetch('http://localhost:3000/check-admin', {
            method: 'GET',
            credentials: 'include', // Important for session cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Authentication check failed');
        }
        
        const data = await response.json();
        return data.isAdmin === true;
    } catch (error) {
        console.error('Error checking admin auth:', error);
        return false;
    }
}

// Function to verify admin authentication and redirect if needed
async function verifyAdminAuth() {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
        console.warn("Not authenticated as admin. Redirecting to login...");
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// Handle navigation and initialize admin dashboard
document.addEventListener("DOMContentLoaded", async function() {
    try {
        console.log("Initializing admin dashboard...");
        
        // Verify admin authentication first
        const isAuthenticated = await verifyAdminAuth();
        if (!isAuthenticated) {
            return; // Stop initialization if not authenticated
        }

        // Show the last active section or default to dashboard
        const lastActiveSection = localStorage.getItem("adminActiveSection") || "dashboard";
        showSection(lastActiveSection);

        // Add click event listeners to sidebar links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const sectionId = this.getAttribute('href').substring(1);
                showSection(sectionId);
            });
        });

        // Initialize dashboard data
        initializeDashboard();
    } catch (error) {
        console.error("Error initializing admin dashboard:", error);
        alert("Failed to initialize dashboard. Please try again.");
    }
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

// Function to fetch reservations
async function fetchReservations() {
    try {
        const response = await fetch("http://localhost:3000/reservations");
        if (!response.ok) {
            throw new Error("Failed to fetch reservations");
        }
        const reservations = await response.json();
        
        // Update dashboard counts
        const pendingReservations = reservations.filter(res => res.status === 'pending');
        const pendingCount = document.getElementById('pending-reservations');
        if (pendingCount) {
            pendingCount.textContent = pendingReservations.length;
        }
        
        return reservations;
    } catch (error) {
        console.error("Error fetching reservations:", error);
        throw error;
    }
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

            // Fetch current sit-ins for charts
            const sitInsResponse = await fetch("http://localhost:3000/sit-ins");
            if (!sitInsResponse.ok) {
                throw new Error("Failed to fetch sit-ins");
            }
            const sitIns = await sitInsResponse.json();
            
            // Filter for today's records
            const today = new Date().toISOString().split('T')[0];
            const todaysSitIns = sitIns.filter(sitIn => sitIn.date === today);

            // Update records section if visible
            const recordsSection = document.getElementById('sit-in-records');
            if (recordsSection && !recordsSection.classList.contains('hidden')) {
                // Get chart canvases
                const programmingLanguageCanvas = document.getElementById('programmingLanguageChart');
                const labRoomCanvas = document.getElementById('labRoomChart');

                // Destroy existing charts if they exist
                if (window.programmingLanguageChart) {
                    window.programmingLanguageChart.destroy();
                }
                if (window.labRoomChart) {
                    window.labRoomChart.destroy();
                }

                // Count programming languages
                const languageStats = {};
                todaysSitIns.forEach(record => {
                    const lang = record.programmingLanguage || 'Not Specified';
                    languageStats[lang] = (languageStats[lang] || 0) + 1;
                });

                // Count lab rooms
                const labStats = {};
                todaysSitIns.forEach(record => {
                    const lab = record.laboratory || 'Not Specified';
                    labStats[lab] = (labStats[lab] || 0) + 1;
                });

                // Create programming language chart
                if (programmingLanguageCanvas) {
                    window.programmingLanguageChart = new Chart(programmingLanguageCanvas, {
                        type: 'pie',
                        data: {
                            labels: Object.keys(languageStats),
                            datasets: [{
                                data: Object.values(languageStats),
                                backgroundColor: [
                                    'rgba(255, 99, 132, 0.7)',
                                    'rgba(54, 162, 235, 0.7)',
                                    'rgba(255, 206, 86, 0.7)',
                                    'rgba(75, 192, 192, 0.7)',
                                    'rgba(153, 102, 255, 0.7)',
                                    'rgba(255, 159, 64, 0.7)',
                                    'rgba(199, 199, 199, 0.7)'
                                ],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: {
                                    position: 'right',
                                    labels: {
                                        padding: 20,
                                        font: {
                                            size: 12
                                        }
                                    }
                                },
                                title: {
                                    display: true,
                                    font: {
                                        size: 16
                                    }
                                }
                            }
                        }
                    });
                }

                // Create lab room chart
                if (labRoomCanvas) {
                    window.labRoomChart = new Chart(labRoomCanvas, {
                        type: 'pie',
                        data: {
                            labels: Object.keys(labStats),
                            datasets: [{
                                data: Object.values(labStats),
                                backgroundColor: [
                                    'rgba(75, 192, 192, 0.7)',
                                    'rgba(255, 159, 64, 0.7)',
                                    'rgba(54, 162, 235, 0.7)',
                                    'rgba(255, 99, 132, 0.7)',
                                    'rgba(153, 102, 255, 0.7)',
                                    'rgba(255, 206, 86, 0.7)',
                                    'rgba(199, 199, 199, 0.7)'
                                ],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: {
                                    position: 'right',
                                    labels: {
                                        padding: 20,
                                        font: {
                                            size: 12
                                        }
                                    }
                                },
                                title: {
                                    display: true,
                                    font: {
                                        size: 16
                                    }
                                }
                            }
                        }
                    });
                }

                // Update records table
                displaySitInRecords(todaysSitIns);
            }

            // Update dashboard chart
            updateDashboardChart(sitIns);

            // Update total sessions count for today
            const totalSessionsToday = document.getElementById('total-sessions-today');
            if (totalSessionsToday) {
                totalSessionsToday.textContent = todaysSitIns.length;
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

// Function to update dashboard chart
function updateDashboardChart(sitIns) {
    const ctx = document.getElementById('studentStatsChart');
    if (!ctx) return;

    // Count programming language usage
    const languageStats = {};
    sitIns.forEach(sitIn => {
        if (sitIn.programmingLanguage) {
            languageStats[sitIn.programmingLanguage] = (languageStats[sitIn.programmingLanguage] || 0) + 1;
        }
    });

    // Prepare data for chart
    const labels = Object.keys(languageStats);
    const data = Object.values(languageStats);

    // Safely destroy existing chart if it exists
    if (window.studentStatsChart && typeof window.studentStatsChart.destroy === 'function') {
        window.studentStatsChart.destroy();
    }

    // Create new chart
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
        
        // For sit-ins (active or completed), use programming language as purpose
        const displayPurpose = entry.entryType === 'reservation' ? 
            (entry.purpose || 'N/A') : 
            (entry.programmingLanguage ? `${entry.programmingLanguage}` : 'N/A');
        
        row.innerHTML = `
            <td class="border px-4 py-2">${entry.idNumber || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.name || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.course || 'N/A'}</td>
            <td class="border px-4 py-2">${entry.year || 'N/A'}</td>
            <td class="border px-4 py-2">${displayPurpose}</td>
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
async function resetSessions(idNumber = null, semester = null) {
    try {
        const response = await fetch('http://localhost:3000/reset-sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idNumber, semester }),
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
        // Check admin auth first
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            console.warn("Not authenticated as admin. Cannot load reset logs.");
            const logsTable = document.getElementById('reset-logs-table');
            if (logsTable) {
                logsTable.innerHTML = `
                    <tr class="no-logs">
                        <td colspan="4" class="px-4 py-3 text-center text-sm text-red-500">Please log in as administrator to view reset logs.</td>
                    </tr>
                `;
            }
            
            // Update logs count
            const logsCount = document.getElementById('logs-count');
            if (logsCount) {
                logsCount.textContent = '0 logs found';
            }
            
            return;
        }
        
        // Proceed with fetch if authenticated
        const response = await fetch('http://localhost:3000/reset-logs', {
            method: 'GET',
            credentials: 'include', // Important for session cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch reset logs');
        }

        const data = await response.json();
        if (data.success && data.logs) {
            displayResetLogs(data.logs);
            
            // Update logs count
            const logsCount = document.getElementById('logs-count');
            if (logsCount) {
                const count = data.logs.length;
                logsCount.textContent = `${count} log${count !== 1 ? 's' : ''} found`;
            }
            
            // Reset filter to "all"
            const logsFilter = document.getElementById('logs-filter');
            if (logsFilter) {
                logsFilter.value = 'all';
            }
        } else {
            throw new Error(data.message || 'No logs data returned');
        }
    } catch (error) {
        console.error('Error fetching reset logs:', error);
        const logsTable = document.getElementById('reset-logs-table');
        if (logsTable) {
            logsTable.innerHTML = `
                <tr class="no-logs">
                    <td colspan="4" class="px-4 py-3 text-center text-sm text-red-500">Error: ${error.message || 'Unknown error loading reset history'}</td>
                </tr>
            `;
        }
        
        // Update logs count
        const logsCount = document.getElementById('logs-count');
        if (logsCount) {
            logsCount.textContent = '0 logs found';
        }
    }
}

// Function to display reset logs
function displayResetLogs(logs) {
    const logsTable = document.getElementById('reset-logs-table');
    
    if (!logs || logs.length === 0) {
        logsTable.innerHTML = `
            <tr class="no-logs">
                <td colspan="4" class="px-4 py-3 text-center text-sm text-gray-500">No reset operations found</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    logs.forEach(log => {
        const date = new Date(log.timestamp).toLocaleString();
        let details = '';
        
        if (log.resetType === 'user') {
            details = `
                <div class="space-y-1">
                    <div class="font-medium">User ID: ${log.details.userId}</div>
                    <div class="text-sm text-gray-500">
                        Removed: ${log.details.reservationsRemoved} reservations,
                        ${log.details.sitInsRemoved} sit-ins
                    </div>
                </div>
            `;
        } else if (log.resetType === 'semester') {
            details = `
                <div class="space-y-1">
                    <div class="font-medium">Semester: ${log.details.semester}</div>
                    <div class="text-sm text-gray-500">
                        Removed: ${log.details.reservationsRemoved} reservations,
                        ${log.details.sitInsRemoved} sit-ins
                    </div>
                </div>
            `;
        }
        
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">${date}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${log.resetType === 'user' ? 'User' : 'Semester'}</td>
                <td class="px-4 py-3 text-sm">${details}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${log.adminId || 'Unknown'}</td>
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
    
    if (!tabSitInStats || !tabUserFeedback || !tabStudentReports) {
        console.error('Report tabs not found');
        return;
    }
    
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
        
        // Load data for the selected tab
        if (activeTab === tabUserFeedback) {
            loadFeedback();
        } else if (activeTab === tabStudentReports) {
            setupStudentReports();
        }
    }
    
    // Add event listeners to tabs
    tabSitInStats.addEventListener('click', () => {
        switchTab(tabSitInStats, contentSitInStats);
        initializeReportsCharts();
    });
    
    tabUserFeedback.addEventListener('click', () => {
        switchTab(tabUserFeedback, contentUserFeedback);
    });
    
    tabStudentReports.addEventListener('click', () => {
        switchTab(tabStudentReports, contentStudentReports);
    });
}

// Function to setup student reports functionality
function setupStudentReports() {
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (!generateReportBtn) {
        console.error('Generate report button not found');
        return;
    }
    
    // Add event listener for report generation
    generateReportBtn.addEventListener('click', generateStudentReport);
    
    // Initialize date inputs with today's date
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('report-date-start');
    const endDateInput = document.getElementById('report-date-end');
    
    if (startDateInput) startDateInput.value = today;
    if (endDateInput) endDateInput.value = today;
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
    
    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }
    
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
    try {
        // Create export options modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg w-96">
                <h2 class="text-xl font-bold mb-4">Export Report</h2>
                <div class="space-y-3">
                    <button onclick="exportToCSV(${JSON.stringify(sitIns).replace(/"/g, '&quot;')})" 
                        class="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                        Export as CSV
                    </button>
                    <button onclick="exportToExcel(${JSON.stringify(sitIns).replace(/"/g, '&quot;')})" 
                        class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Export as Excel
                    </button>
                    <button onclick="exportToPDF(${JSON.stringify(sitIns).replace(/"/g, '&quot;')})" 
                        class="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                        Export as PDF
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                        class="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error showing export options:', error);
        alert('Error preparing export options. Please try again.');
    }
}

// Function to export to CSV
function exportToCSV(sitIns) {
    try {
        // Define CSV headers
        const headers = [
            'ID Number',
            'Name',
            'Course',
            'Year',
            'Programming Language',
            'Laboratory',
            'Date',
            'Time In',
            'Time Out',
            'Duration (mins)',
            'Status'
        ];

        // Convert sit-ins to CSV rows
        const rows = sitIns.map(sitIn => {
            const timeIn = sitIn.timeIn || 'N/A';
            const timeOut = sitIn.timeOut ? new Date(sitIn.timeOut).toLocaleTimeString() : 'N/A';
            let duration = 'N/A';
            
            if (sitIn.timeIn && sitIn.timeOut) {
                const start = new Date(sitIn.date + ' ' + sitIn.timeIn);
                const end = new Date(sitIn.timeOut);
                const diff = Math.round((end - start) / (1000 * 60));
                duration = diff;
            }

            return [
                sitIn.idNumber || 'N/A',
                sitIn.name || 'N/A',
                sitIn.course || 'N/A',
                sitIn.year || 'N/A',
                sitIn.programmingLanguage || 'N/A',
                sitIn.laboratory || 'N/A',
                sitIn.date || 'N/A',
                timeIn,
                timeOut,
                duration,
                sitIn.status || 'N/A'
            ];
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `student_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        alert('Error exporting to CSV. Please try again.');
    }
}

// Function to export to Excel
function exportToExcel(sitIns) {
    try {
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Prepare data for Excel
        const excelData = sitIns.map(sitIn => {
            const timeIn = sitIn.timeIn || 'N/A';
            const timeOut = sitIn.timeOut ? new Date(sitIn.timeOut).toLocaleTimeString() : 'N/A';
            let duration = 'N/A';
            
            if (sitIn.timeIn && sitIn.timeOut) {
                const start = new Date(sitIn.date + ' ' + sitIn.timeIn);
                const end = new Date(sitIn.timeOut);
                const diff = Math.round((end - start) / (1000 * 60));
                duration = diff;
            }

            return {
                'ID Number': sitIn.idNumber || 'N/A',
                'Name': sitIn.name || 'N/A',
                'Course': sitIn.course || 'N/A',
                'Year': sitIn.year || 'N/A',
                'Programming Language': sitIn.programmingLanguage || 'N/A',
                'Laboratory': sitIn.laboratory || 'N/A',
                'Date': sitIn.date || 'N/A',
                'Time In': timeIn,
                'Time Out': timeOut,
                'Duration (mins)': duration,
                'Status': sitIn.status || 'N/A'
            };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Student Report');
        
        // Generate Excel file
        XLSX.writeFile(wb, `student_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        alert('Error exporting to Excel. Please try again.');
    }
}

// Function to export to PDF
function exportToPDF(sitIns) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text('Student Report', 20, 20);
        doc.setFontSize(12);
        
        // Add date range
        const dateRange = `Generated on: ${new Date().toLocaleDateString()}`;
        doc.text(dateRange, 20, 30);
        
        // Add table headers
        const headers = [
            'ID Number',
            'Name',
            'Course',
            'Year',
            'Programming Language',
            'Laboratory',
            'Date',
            'Time In',
            'Time Out',
            'Duration',
            'Status'
        ];
        
        // Calculate column widths
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        const availableWidth = pageWidth - (margin * 2);
        const columnWidth = availableWidth / headers.length;
        
        // Draw headers
        headers.forEach((header, i) => {
            doc.text(header, margin + (i * columnWidth), 40);
        });
        
        // Draw data rows
        let y = 50;
        sitIns.forEach(sitIn => {
            // Check if we need a new page
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            
            const timeIn = sitIn.timeIn || 'N/A';
            const timeOut = sitIn.timeOut ? new Date(sitIn.timeOut).toLocaleTimeString() : 'N/A';
            let duration = 'N/A';
            
            if (sitIn.timeIn && sitIn.timeOut) {
                const start = new Date(sitIn.date + ' ' + sitIn.timeIn);
                const end = new Date(sitIn.timeOut);
                const diff = Math.round((end - start) / (1000 * 60));
                duration = `${diff} mins`;
            }
            
            const row = [
                sitIn.idNumber || 'N/A',
                sitIn.name || 'N/A',
                sitIn.course || 'N/A',
                sitIn.year || 'N/A',
                sitIn.programmingLanguage || 'N/A',
                sitIn.laboratory || 'N/A',
                sitIn.date || 'N/A',
                timeIn,
                timeOut,
                duration,
                sitIn.status || 'N/A'
            ];
            
            row.forEach((cell, i) => {
                doc.text(cell, margin + (i * columnWidth), y);
            });
            
            y += 10;
        });
        
        // Save the PDF
        doc.save(`student_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        alert('Error exporting to PDF. Please try again.');
    }
}

// Function to fetch sit-ins data
async function fetchSitInsData() {
    try {
        const response = await fetch("http://localhost:3000/sit-ins");
        if (!response.ok) {
            throw new Error("Failed to fetch sit-in records");
        }
        const sitIns = await response.json();
        return sitIns;
    } catch (error) {
        console.error("Error fetching sit-ins data:", error);
        return [];
    }
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

// Function to check admin authentication
async function checkAdminAuth() {
    try {
        const response = await fetch('http://localhost:3000/check-admin', {
            method: 'GET',
            credentials: 'include', // Important for session cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Authentication check failed');
        }
        
        const data = await response.json();
        return data.isAdmin === true;
    } catch (error) {
        console.error('Error checking admin auth:', error);
        return false;
    }
}

// Function to update reset statistics
async function updateResetStatistics() {
    try {
        // Check admin auth first
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            console.warn("Not authenticated as admin. Cannot fetch reset statistics.");
            const statsContainer = document.getElementById('reset-stats-container');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="text-center text-sm text-red-500">
                        Please log in as administrator to view reset statistics.
                    </div>
                `;
            }
            return;
        }

        const response = await fetch('http://localhost:3000/reset-stats', {
            method: 'GET',
            credentials: 'include', // Important for session cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch reset statistics');
        }

        const stats = await response.json();
        
        // Update statistics display
        const totalResets = document.getElementById('total-resets');
        const totalReservationsRemoved = document.getElementById('total-reservations-removed');
        const totalSitInsRemoved = document.getElementById('total-sit-ins-removed');
        
        if (totalResets) totalResets.textContent = stats.totalResets || 0;
        if (totalReservationsRemoved) totalReservationsRemoved.textContent = stats.totalReservationsRemoved || 0;
        if (totalSitInsRemoved) totalSitInsRemoved.textContent = stats.totalSitInsRemoved || 0;
        
    } catch (error) {
        console.error('Error updating reset statistics:', error);
        const statsContainer = document.getElementById('reset-stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="text-center text-sm text-red-500">
                    Error loading reset statistics. Please try again later.
                </div>
            `;
        }
    }
}

// Function to initialize the reset session section
function initResetSession() {
    try {
        console.log("Initializing reset session section...");
        
        // Get elements with null checks
        const resetSemesterBtn = document.getElementById('reset-semester-btn');
        const resetUserBtn = document.getElementById('reset-user-btn');
        const semesterSelect = document.getElementById('semester-select');
        const userIdInput = document.getElementById('user-id-input');
        const refreshLogsBtn = document.getElementById('refresh-logs');
        const logsFilter = document.getElementById('logs-filter');
        const exportLogsBtn = document.getElementById('export-logs');
        
        // Check if required elements exist
        if (!resetSemesterBtn || !resetUserBtn || !semesterSelect || !userIdInput) {
            console.warn("Some reset session elements not found. Functionality may be limited.");
        }
        
        // Initialize reset statistics
        updateResetStatistics();
        
        // Load reset logs
        loadResetLogs();
        
        // Reset Semester Button Event Listener
        if (resetSemesterBtn) {
            resetSemesterBtn.addEventListener('click', async function() {
                const semester = semesterSelect.value;
                if (!semester) {
                    alert('Please select a semester first');
                    return;
                }

                if (!confirm(`Are you sure you want to reset all sessions for ${semester}? This action cannot be undone.`)) {
                    return;
                }

                try {
                    // Disable button and show loading state
                    this.disabled = true;
                    this.innerHTML = `
                        <svg class="animate-spin h-5 w-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resetting...
                    `;

                    const result = await resetSessions(null, semester);
                    
                    if (result.success) {
                        alert(`Successfully reset sessions for ${semester}`);
                        // Reset the select
                        semesterSelect.value = '';
                        // Refresh logs and statistics
                        await loadResetLogs();
                        await updateResetStatistics();
                    } else {
                        throw new Error(result.message || 'Failed to reset sessions');
                    }
                } catch (error) {
                    console.error('Error resetting semester:', error);
                    alert(`Failed to reset semester: ${error.message}`);
                } finally {
                    // Restore button state
                    this.disabled = false;
                    this.innerHTML = 'Reset Semester';
                }
            });
        }
        
        // Reset User Button Event Listener
        if (resetUserBtn) {
            resetUserBtn.addEventListener('click', async function() {
                const userId = userIdInput.value.trim();
                if (!userId) {
                    alert('Please enter a student ID number');
                    return;
                }

                if (!confirm(`Are you sure you want to reset sessions for student ${userId}? This action cannot be undone.`)) {
                    return;
                }

                try {
                    // Disable button and show loading state
                    this.disabled = true;
                    this.innerHTML = `
                        <svg class="animate-spin h-5 w-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resetting...
                    `;

                    const result = await resetSessions(userId);
                    
                    if (result.success) {
                        alert(`Successfully reset sessions for student ${userId}`);
                        // Clear the input
                        userIdInput.value = '';
                        // Refresh logs and statistics
                        await loadResetLogs();
                        await updateResetStatistics();
                    } else {
                        throw new Error(result.message || 'Failed to reset user sessions');
                    }
                } catch (error) {
                    console.error('Error resetting user:', error);
                    alert(`Failed to reset user sessions: ${error.message}`);
                } finally {
                    // Restore button state
                    this.disabled = false;
                    this.innerHTML = 'Reset User Sessions';
                }
            });
        }
        
        // Filter logs event handler
        if (logsFilter) {
            logsFilter.addEventListener('change', function() {
                filterLogs(this.value);
            });
        }
        
        // Export logs event handler
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', function() {
                exportResetLogs();
            });
        }

        // Refresh logs button event handler
        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', async function() {
                try {
                    this.disabled = true;
                    this.innerHTML = `
                        <svg class="animate-spin h-4 w-4 mr-1 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Refreshing...
                    `;
                    await loadResetLogs();
                    await updateResetStatistics();
                } finally {
                    this.disabled = false;
                    this.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        <span>Refresh</span>
                    `;
                }
            });
        }

        console.log("Reset session section initialized successfully");
        
    } catch (error) {
        console.error("Error initializing reset session section:", error);
    }
}

// Function to load today's sit-in records
async function loadTodaysSitInRecords() {
    try {
        console.log("Loading today's sit-in records...");
        const response = await fetch("http://localhost:3000/sit-ins");
        if (!response.ok) {
            throw new Error("Failed to fetch sit-in records");
        }

        const sitIns = await response.json();
        
        // Filter for today's records and active sit-ins
        const today = new Date().toISOString().split('T')[0];
        const todaysSitIns = sitIns.filter(sitIn => 
            sitIn.date === today && 
            sitIn.status === 'active'
        );

        console.log("Today's active sit-ins:", todaysSitIns);

        // Get chart canvases
        const programmingLanguageCanvas = document.getElementById('programmingLanguageChart');
        const labRoomCanvas = document.getElementById('labRoomChart');

        if (!programmingLanguageCanvas || !labRoomCanvas) {
            console.error("Chart canvases not found");
            return;
        }

        // Destroy existing charts if they exist
        const existingProgrammingChart = Chart.getChart(programmingLanguageCanvas);
        if (existingProgrammingChart) {
            existingProgrammingChart.destroy();
        }
        
        const existingLabChart = Chart.getChart(labRoomCanvas);
        if (existingLabChart) {
            existingLabChart.destroy();
        }

        // Count programming languages for active sit-ins
        const languageStats = {};
        todaysSitIns.forEach(record => {
            const lang = record.programmingLanguage || 'Not Specified';
            languageStats[lang] = (languageStats[lang] || 0) + 1;
        });

        // Count lab rooms for active sit-ins
        const labStats = {};
        todaysSitIns.forEach(record => {
            const lab = record.laboratory || 'Not Specified';
            labStats[lab] = (labStats[lab] || 0) + 1;
        });

        // Add default data if no active sit-ins
        if (Object.keys(languageStats).length === 0) {
            languageStats['No Data'] = 1;
        }
        if (Object.keys(labStats).length === 0) {
            labStats['No Data'] = 1;
        }

        // Create programming language chart
        new Chart(programmingLanguageCanvas, {
            type: 'pie',
            data: {
                labels: Object.keys(languageStats),
                datasets: [{
                    data: Object.values(languageStats),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            font: {
                                size: 12
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Programming Language Distribution',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // Create lab room chart
        new Chart(labRoomCanvas, {
            type: 'pie',
            data: {
                labels: Object.keys(labStats),
                datasets: [{
                    data: Object.values(labStats),
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(199, 199, 199, 0.7)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            font: {
                                size: 12
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Lab Room Distribution',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // Update records table with active sit-ins
        displaySitInRecords(todaysSitIns);

        // Update total sessions count for today
        const totalSessionsToday = document.getElementById('total-sessions-today');
        if (totalSessionsToday) {
            totalSessionsToday.textContent = todaysSitIns.length;
        }

    } catch (error) {
        console.error("Error loading sit-in records:", error);
    }
}

// Function to display sit-in records
function displaySitInRecords(records) {
    const tableBody = document.getElementById("sit-in-records-table");
    if (!tableBody) return;

    if (records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4 text-gray-500">
                    No records found for today
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = "";
    records.forEach(record => {
        const timeIn = record.timeIn || 'N/A';
        const timeOut = record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : 'N/A';
        let duration = 'N/A';
        
        if (record.timeIn && record.timeOut) {
            const start = new Date(record.date + ' ' + record.timeIn);
            const end = new Date(record.timeOut);
            const diff = Math.round((end - start) / (1000 * 60)); // Duration in minutes
            duration = `${diff} mins`;
        }

        const row = document.createElement("tr");
        row.className = record.status === 'active' ? 'bg-green-50' : 'bg-gray-50';
        row.innerHTML = `
            <td class="border px-4 py-2">${record.idNumber || 'N/A'}</td>
            <td class="border px-4 py-2">${record.name || 'N/A'}</td>
            <td class="border px-4 py-2">${record.course || 'N/A'}</td>
            <td class="border px-4 py-2">${record.year || 'N/A'}</td>
            <td class="border px-4 py-2">${record.programmingLanguage || 'N/A'}</td>
            <td class="border px-4 py-2">${record.laboratory || 'N/A'}</td>
            <td class="border px-4 py-2">${timeIn}</td>
            <td class="border px-4 py-2">${timeOut}</td>
            <td class="border px-4 py-2">${duration}</td>
            <td class="border px-4 py-2">
                <span class="px-2 py-1 rounded text-sm ${
                    record.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }">
                    ${record.status}
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Function to update programming language distribution chart
function updateProgrammingLanguageChart(records) {
    const canvas = document.getElementById('programmingLanguageChart');
    if (!canvas) return;

    // Count programming languages
    const languageStats = {};
    records.forEach(record => {
        const lang = record.programmingLanguage || 'Not Specified';
        languageStats[lang] = (languageStats[lang] || 0) + 1;
    });

    // Prepare data for chart
    const labels = Object.keys(languageStats);
    const data = Object.values(languageStats);

    // Define colors
    const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)'
    ];

    // Get existing chart instance
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    // Create new chart
    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        font: {
                            size: 12
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                title: {
                    display: true,
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Function to update lab room distribution chart
function updateLabRoomChart(records) {
    const canvas = document.getElementById('labRoomChart');
    if (!canvas) return;

    // Count lab room usage
    const labStats = {};
    records.forEach(record => {
        const lab = record.laboratory || 'Not Specified';
        labStats[lab] = (labStats[lab] || 0) + 1;
    });

    // Prepare data for chart
    const labels = Object.keys(labStats);
    const data = Object.values(labStats);

    // Define colors
    const backgroundColors = [
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(199, 199, 199, 0.7)'
    ];

    // Get existing chart instance
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    // Create new chart
    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        font: {
                            size: 12
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                title: {
                    display: true,
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Add search functionality for records
document.getElementById('records-search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const tableBody = document.getElementById('sit-in-records-table');
    const rows = tableBody.getElementsByTagName('tr');

    for (let row of rows) {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    }
});

// Function to load and display user feedback
async function loadFeedback() {
    try {
        const response = await fetch("http://localhost:3000/feedback");
        if (!response.ok) {
            throw new Error("Failed to fetch feedback");
        }

        const feedback = await response.json();
        const feedbackTableBody = document.getElementById('feedbackTableBody');
        
        if (!feedbackTableBody) {
            console.error('Feedback table body not found');
            return;
        }

        if (feedback.length === 0) {
            feedbackTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-gray-500">
                        No feedback received yet
                    </td>
                </tr>
            `;
            return;
        }

        // Sort feedback by date (newest first)
        feedback.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Generate feedback HTML
        const feedbackHTML = feedback.map(item => `
            <tr>
                <td class="border border-gray-300 px-4 py-2">${item.userId || 'Anonymous'}</td>
                <td class="border border-gray-300 px-4 py-2">${item.laboratory || 'N/A'}</td>
                <td class="border border-gray-300 px-4 py-2">${new Date(item.date).toLocaleString()}</td>
                <td class="border border-gray-300 px-4 py-2">${item.message}</td>
            </tr>
        `).join('');

        feedbackTableBody.innerHTML = feedbackHTML;

        // Clear feedback notification after viewing
        clearFeedbackNotification();
        
    } catch (error) {
        console.error("Error loading feedback:", error);
        const feedbackTableBody = document.getElementById('feedbackTableBody');
        if (feedbackTableBody) {
            feedbackTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-red-500">
                        Error loading feedback. Please try again later.
                    </td>
                </tr>
            `;
        }
    }
}

// Function to search for a student by ID
async function searchStudentById(idNumber) {
    try {
        const response = await fetch(`http://localhost:3000/get-profile?id=${idNumber}`);
        if (!response.ok) {
            throw new Error('Student not found');
        }
        const student = await response.json();
        return student;
    } catch (error) {
        console.error('Error searching for student:', error);
        return null;
    }
}

// Function to handle walk-in form display
function setupWalkInForm() {
    const searchBtn = document.getElementById('search-student-btn');
    const walkinPurpose = document.getElementById('walkin-purpose');
    const otherPurposeContainer = document.getElementById('other-purpose-container');
    const walkinProgLanguage = document.getElementById('walkin-prog-language');
    const progLanguageOtherContainer = document.getElementById('prog-language-other-container');
    const addWalkinBtn = document.getElementById('add-walkin-btn');

    if (!searchBtn || !walkinPurpose || !otherPurposeContainer || 
        !walkinProgLanguage || !progLanguageOtherContainer || !addWalkinBtn) {
        console.error('Walk-in form elements not found');
        return;
    }

    // Handle student search
    searchBtn.addEventListener('click', async () => {
        const studentId = document.getElementById('walkin-student-id').value.trim();
        const statusElement = document.getElementById('student-search-status');
        const studentInfo = document.getElementById('student-info');

        if (!studentId) {
            statusElement.textContent = 'Please enter a student ID';
            return;
        }

        statusElement.textContent = 'Searching...';
        const student = await searchStudentById(studentId);

        if (student) {
            document.getElementById('walkin-student-name').textContent = `${student.firstName} ${student.lastName}`;
            document.getElementById('walkin-student-course').textContent = student.course;
            document.getElementById('walkin-student-year').textContent = student.year;
            studentInfo.classList.remove('hidden');
            addWalkinBtn.disabled = false;
            statusElement.textContent = 'Student found';
        } else {
            statusElement.textContent = 'Student not found';
            studentInfo.classList.add('hidden');
            addWalkinBtn.disabled = true;
        }
    });

    // Handle purpose selection
    walkinPurpose.addEventListener('change', () => {
        otherPurposeContainer.classList.toggle('hidden', walkinPurpose.value !== 'Other');
    });

    // Handle programming language selection
    walkinProgLanguage.addEventListener('change', () => {
        progLanguageOtherContainer.classList.toggle('hidden', walkinProgLanguage.value !== 'Other');
    });

    // Handle walk-in submission
    addWalkinBtn.addEventListener('click', async () => {
        const studentId = document.getElementById('walkin-student-id').value.trim();
        const purpose = document.getElementById('walkin-purpose').value;
        const otherPurpose = document.getElementById('walkin-other-purpose').value;
        const programmingLanguage = document.getElementById('walkin-prog-language').value;
        const otherLanguage = document.getElementById('walkin-other-language').value;

        if (!studentId || !purpose) {
            alert('Please fill in all required fields');
            return;
        }

        if (purpose === 'Other' && !otherPurpose) {
            alert('Please specify the other purpose');
            return;
        }

        if (programmingLanguage === 'Other' && !otherLanguage) {
            alert('Please specify the other programming language');
            return;
        }

        const student = await searchStudentById(studentId);
        if (!student) {
            alert('Student not found');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/create-walkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    idNumber: studentId,
                    name: `${student.firstName} ${student.lastName}`,
                    course: student.course,
                    year: student.year,
                    purpose: purpose === 'Other' ? otherPurpose : purpose,
                    programmingLanguage: programmingLanguage === 'Other' ? otherLanguage : programmingLanguage,
                    otherPurpose: purpose === 'Other' ? otherPurpose : null,
                    otherLanguage: programmingLanguage === 'Other' ? otherLanguage : null
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Walk-in student added successfully');
                // Reset form
                document.getElementById('walkin-student-id').value = '';
                document.getElementById('walkin-purpose').value = '';
                document.getElementById('walkin-other-purpose').value = '';
                document.getElementById('walkin-prog-language').value = '';
                document.getElementById('walkin-other-language').value = '';
                document.getElementById('student-info').classList.add('hidden');
                document.getElementById('add-walkin-btn').disabled = true;
                // Refresh sit-ins table
                fetchSitIns();
            } else {
                throw new Error(data.message || 'Failed to add walk-in student');
            }
        } catch (error) {
            console.error('Error adding walk-in student:', error);
            alert(error.message || 'Failed to add walk-in student');
        }
    });
}

// Add walk-in form setup to the DOMContentLoaded event
document.addEventListener("DOMContentLoaded", function() {
    // ... existing DOMContentLoaded code ...
    
    // Set up walk-in form
    setupWalkInForm();
    
    // ... rest of existing DOMContentLoaded code ...
});

// Function to export and reset logs
async function exportResetLogs() {
    try {
        // First, export the logs
        const response = await fetch('http://localhost:3000/export-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to export logs');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // After successful export, reset the logs
        const resetResponse = await fetch('http://localhost:3000/reset-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!resetResponse.ok) {
            throw new Error('Failed to reset logs');
        }

        // Show success message
        alert('Logs exported and reset successfully!');
        
        // Refresh the logs table
        loadResetLogs();
    } catch (error) {
        console.error('Error exporting/resetting logs:', error);
        alert('Failed to export or reset logs. Please try again.');
    }
}