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
        if (sectionId === "sit-in") {
            fetchSitIns();
        } else if (sectionId === "feedback") {
            loadFeedback();
            clearFeedbackNotification();
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
    
    // Show the saved section
    showSection(savedSection);
    
    // Fetch initial data
    fetchReservations();
    fetchStudents();
    fetchSitIns();

    // Add Chart.js script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.async = true;
    document.head.appendChild(script);

    // Initialize dashboard data
    initializeDashboard();
});

// Fetch and display reservations
async function fetchReservations() {
    try {
        const response = await fetch("http://localhost:3000/reservations");
        const reservations = await response.json();

        // Store reservations globally for search functionality
        window.allReservations = reservations;

        // Initial display of all reservations
        displayReservations(reservations);

        // Update pending reservations count
        const pendingCount = reservations.filter(r => r.status === 'pending').length;
        document.getElementById('pending-reservations').textContent = pendingCount;

        // Add search functionality
        const searchBar = document.getElementById('reservation-search');
        searchBar.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filteredReservations = reservations.filter(reservation => 
                reservation.idNumber.toLowerCase().includes(searchTerm) ||
                reservation.name.toLowerCase().includes(searchTerm) ||
                reservation.course.toLowerCase().includes(searchTerm)
            );
            displayReservations(filteredReservations);
        });

    } catch (error) {
        console.error("Error fetching reservations:", error);
    }
}

// Function to display reservations in the table
function displayReservations(reservations) {
    const tableBody = document.getElementById("reservations-table");
    tableBody.innerHTML = ""; // Clear previous data

    if (reservations.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='9' class='text-center py-4'>No reservations found</td></tr>";
        return;
    }

    reservations.forEach((reservation) => {
        const row = document.createElement("tr");
        row.setAttribute('data-reservation-id', reservation.id);
        row.innerHTML = `
            <td class="border px-4 py-2">${reservation.idNumber}</td>
            <td class="border px-4 py-2">${reservation.name}</td>
            <td class="border px-4 py-2">${reservation.course}</td>
            <td class="border px-4 py-2">${reservation.year}</td>
            <td class="border px-4 py-2">${reservation.purpose}</td>
            <td class="border px-4 py-2">${reservation.date}</td>
            <td class="border px-4 py-2">${reservation.time}</td>
            <td class="border px-4 py-2">
                <span class="px-2 py-1 rounded text-sm ${
                    reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    reservation.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                }">
                    ${reservation.status}
                </span>
            </td>
            <td class="border px-4 py-2">
                <div class="flex space-x-2">
                    ${reservation.status === 'pending' ? `
                        <button onclick="updateReservationStatus(${reservation.id}, 'approved')" 
                            class="bg-green-500 text-white px-2 py-1 rounded text-sm">
                            Approve
                        </button>
                        <button onclick="updateReservationStatus(${reservation.id}, 'rejected')" 
                            class="bg-red-500 text-white px-2 py-1 rounded text-sm">
                            Reject
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

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
        const response = await fetch("http://localhost:3000/update-reservation-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reservationId, status })
        });

        if (response.ok) {
            // Remove the reservation from the UI if it's rejected
            if (status === 'rejected') {
                const row = document.querySelector(`tr[data-reservation-id="${reservationId}"]`);
                if (row) {
                    row.remove();
                }
            }
            
            // Refresh the reservations list
            fetchReservations();
            
            // Show success message
            alert("Reservation status updated successfully!");
        } else {
            alert("Failed to update reservation status");
        }
    } catch (error) {
        console.error("Error updating reservation status:", error);
        alert("Error updating reservation status");
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

// Add this to your existing JavaScript section
async function fetchSitIns() {
    try {
        const response = await fetch("http://localhost:3000/sit-ins");
        const sitIns = await response.json();

        // Separate active and completed sit-ins
        const activeSitIns = sitIns.filter(sitIn => sitIn.status === 'active');
        const completedSitIns = sitIns.filter(sitIn => sitIn.status === 'completed');

        // Update active sit-ins table
        const activeTableBody = document.getElementById("active-sit-ins-table");
        activeTableBody.innerHTML = "";
        activeSitIns.forEach(sitIn => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="border px-4 py-2">${sitIn.idNumber}</td>
                <td class="border px-4 py-2">${sitIn.name}</td>
                <td class="border px-4 py-2">${sitIn.course}</td>
                <td class="border px-4 py-2">${sitIn.year}</td>
                <td class="border px-4 py-2">${sitIn.purpose}</td>
                <td class="border px-4 py-2">${sitIn.date}</td>
                <td class="border px-4 py-2">${sitIn.timeIn}</td>
                <td class="border px-4 py-2">
                    <span class="px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                        ${sitIn.status}
                    </span>
                </td>
                <td class="border px-4 py-2">
                    <button onclick="completeSitIn(${sitIn.id})" 
                        class="bg-blue-500 text-white px-2 py-1 rounded text-sm">
                        Mark as Completed
                    </button>
                </td>
            `;
            activeTableBody.appendChild(row);
        });

        // Update completed sit-ins table
        const completedTableBody = document.getElementById("completed-sit-ins-table");
        completedTableBody.innerHTML = "";
        completedSitIns.forEach(sitIn => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="border px-4 py-2">${sitIn.idNumber}</td>
                <td class="border px-4 py-2">${sitIn.name}</td>
                <td class="border px-4 py-2">${sitIn.course}</td>
                <td class="border px-4 py-2">${sitIn.year}</td>
                <td class="border px-4 py-2">${sitIn.purpose}</td>
                <td class="border px-4 py-2">${sitIn.date}</td>
                <td class="border px-4 py-2">${sitIn.timeIn}</td>
                <td class="border px-4 py-2">${sitIn.timeOut}</td>
                <td class="border px-4 py-2">
                    <span class="px-2 py-1 rounded text-sm bg-gray-100 text-gray-800">
                        ${sitIn.status}
                    </span>
                </td>
            `;
            completedTableBody.appendChild(row);
        });

        // Update current sit-in count in dashboard
        document.getElementById('current-sit-in').textContent = activeSitIns.length;
    } catch (error) {
        console.error("Error fetching sit-ins:", error);
    }
}

async function completeSitIn(sitInId) {
    try {
        const response = await fetch("http://localhost:3000/update-sit-in-status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sitInId: sitInId,
                status: 'completed'
            })
        });

        if (response.ok) {
            // Remove the sit-in from the active table
            const row = document.querySelector(`tr[data-sit-in-id="${sitInId}"]`);
            if (row) {
                row.remove();
            }
            
            // Refresh both tables
            fetchSitIns();
            
            // Show success message
            alert("Sit-in marked as completed successfully!");
        } else {
            alert("Failed to update sit-in status");
        }
    } catch (error) {
        console.error("Error completing sit-in:", error);
        alert("Error completing sit-in");
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

        // Create statistics chart
        createStudentStatsChart(students);

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

// Function to create student statistics chart
function createStudentStatsChart(students) {
    // Group students by course
    const courseStats = {};
    students.forEach(student => {
        courseStats[student.course] = (courseStats[student.course] || 0) + 1;
    });

    // Create chart data
    const chartData = {
        labels: Object.keys(courseStats),
        datasets: [{
            data: Object.values(courseStats),
            backgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56',
                '#4BC0C0',
                '#9966FF',
                '#FF9F40'
            ]
        }]
    };

    // Create chart
    const ctx = document.getElementById('studentStatsChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Function to post announcement
async function postAnnouncement() {
    const announcementText = document.getElementById('announcementText').value.trim();
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
                message: announcementText
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert("Announcement posted successfully!");
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
                <textarea id="editAnnouncementText" class="w-full p-2 border rounded mb-4" rows="4">${announcement.message}</textarea>
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
    const message = document.getElementById('editAnnouncementText').value.trim();
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
            body: JSON.stringify({ message })
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

// Function to load feedback
async function loadFeedback() {
    try {
        const response = await fetch("http://localhost:3000/feedback");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const feedback = await response.json();
        
        const tableBody = document.getElementById("feedbackTableBody");
        tableBody.innerHTML = '';

        if (feedback.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No feedback received yet</td></tr>';
            return;
        }

        feedback.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="border px-4 py-2">${new Date(item.date).toLocaleString()}</td>
                <td class="border px-4 py-2">${item.userId}</td>
                <td class="border px-4 py-2">${item.message}</td>
                <td class="border px-4 py-2">
                    <span class="px-2 py-1 rounded text-sm ${
                        item.type === 'complaint' ? 'bg-red-100 text-red-800' :
                        item.type === 'suggestion' ? 'bg-green-100 text-green-800' :
                        item.type === 'bug' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${item.type}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Check for new feedback and show notification dot
        const lastSeenFeedback = localStorage.getItem("lastSeenFeedback") || "0";
        const newFeedback = feedback.filter(f => new Date(f.date).getTime() > parseInt(lastSeenFeedback));
        
        if (newFeedback.length > 0) {
            showFeedbackNotification();
        }
    } catch (error) {
        console.error("Error loading feedback:", error);
        const tableBody = document.getElementById("feedbackTableBody");
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Error loading feedback</td></tr>';
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
