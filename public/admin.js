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
            setupReportsTabs();
            // User feedback will be shown by default through setupReportsTabs
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
        
        // Initialize walk-in form
        initializeWalkinForm();
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

            // Update the records charts to reflect the new sit-in
            await updateRecordsCharts();

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
                            maintainAspectRatio: false,
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
                                    display: false // Hide title since we have a blue header now
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
                            maintainAspectRatio: false,
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
                                    display: false // Hide title since we have a blue header now
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
    if (typeof Chart !== 'undefined') {
    window.studentStatsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',  // Blue for C#
                        'rgba(255, 99, 132, 0.7)',  // Pink for C
                        'rgba(255, 206, 86, 0.7)',  // Yellow for Java
                        'rgba(255, 159, 64, 0.7)',  // Orange for ASP.Net
                        'rgba(75, 192, 192, 0.7)',  // Teal for PHP
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(75, 192, 192, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        right: 120,
                        bottom: 20,
                        left: 20
                }
            },
            plugins: {
                    legend: {
                        position: 'right',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12,
                                family: "'Inter', sans-serif"
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        // Add appropriate icons based on programming language
                                        let icon = '💻';
                                        if (label.toLowerCase().includes('c#')) icon = '🔵';
                                        if (label.toLowerCase().includes('c')) icon = '🔴';
                                        if (label.toLowerCase().includes('java')) icon = '🟡';
                                        if (label.toLowerCase().includes('asp')) icon = '🟠';
                                        if (label.toLowerCase().includes('php')) icon = '🟢';
                                        return {
                                            text: `${icon} ${label} (${percentage}%)`,
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
                    display: false // Remove the "Statistics" title
                }
            }
        }
    });
    } else {
        console.warn('Chart.js is not loaded yet');
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
        // Fetch users for mapping user information
        const userResponse = await fetch('/get-all-users');
        const usersData = await userResponse.json();
        const usersMap = {};
        
        // Create a map of users by ID for quick lookup
        usersData.forEach(user => {
            usersMap[user.idNumber] = user;
        });

        // Fetch both data sources in parallel
        const [reservationsResponse, walkInsResponse] = await Promise.all([
            fetch('/reservations'),
            fetch('/sit-ins')
        ]);

        const reservations = await reservationsResponse.json();
        const walkIns = await walkInsResponse.json();

        // Process reservations - add entryType and isWalkIn properties
        const taggedReservations = reservations.map(reservation => ({
            ...reservation,
            entryType: 'reservation',
            isWalkIn: false,
            displayTime: reservation.time // Use time property for display
        }));

        // Process walk-ins - ensure they have entryType and isWalkIn properties
        const taggedWalkIns = walkIns.map(walkIn => ({
            ...walkIn,
            entryType: 'walk-in',
            isWalkIn: true,
            displayTime: walkIn.timeIn || walkIn.time // Use timeIn if available, fallback to time
        }));

        // Initialize counts
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        let completedCount = 0;
        let currentSitInsCount = 0;
        
        // Process entries for deduplication and counting
        const processedEntries = [];
        const activeEntries = [];
        const seenKeys = new Set();

        // Process each reservation first
        taggedReservations.forEach(entry => {
            // Count by status - only count each unique entry once
            const timeValue = entry.displayTime || entry.time || '00:00';
            const key = `${entry.idNumber || entry.userId}_${entry.date}_${timeValue}_${entry.entryType}_${entry.programmingLanguage || ''}`;
            
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                
                if (entry.status === 'pending') {
                    pendingCount++;
                } else if (entry.status === 'approved') {
                    approvedCount++;
                    // Approved reservations are considered active for the dashboard
                    activeEntries.push(entry);
                    currentSitInsCount++;
                } else if (entry.status === 'rejected') {
                    rejectedCount++;
                } else if (entry.status === 'completed') {
                    completedCount++;
                } else if (entry.status === 'active') {
                    activeEntries.push(entry);
                    currentSitInsCount++;
                }
                
                processedEntries.push(entry);
            }
        });

        // Then process walk-ins to ensure they don't override reservations
        taggedWalkIns.forEach(entry => {
            const timeValue = entry.displayTime || entry.timeIn || entry.time || '00:00';
            const key = `${entry.idNumber || entry.userId}_${entry.date}_${timeValue}_${entry.entryType}_${entry.programmingLanguage || ''}`;
            
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                
                // For walk-ins, we mainly care about active ones for the dashboard
                if (entry.status === 'active') {
                    activeEntries.push(entry);
                    currentSitInsCount++;
                } else if (entry.status === 'completed') {
                    completedCount++;
                }
                
                processedEntries.push(entry);
            }
        });

        // Add user data to all entries
        const enrichedEntries = processedEntries.map(entry => {
            const userId = entry.userId || entry.idNumber;
            const user = usersMap[userId];
            
            return {
                ...entry,
                name: entry.name || (user ? `${user.firstName} ${user.lastName}` : 'Unknown'),
                course: entry.course || (user ? user.course : 'Unknown'),
                year: entry.year || (user ? user.year : 'Unknown')
            };
        });

        // Sort entries by date and time
        enrichedEntries.sort((a, b) => {
            // Sort by date first
            const dateComparison = new Date(a.date) - new Date(b.date);
            if (dateComparison !== 0) return dateComparison;
            
            // If dates are the same, sort by time
            const aTime = a.displayTime || a.time || a.timeIn || '00:00';
            const bTime = b.displayTime || b.time || b.timeIn || '00:00';
            return aTime.localeCompare(bTime);
        });

        // Update dashboard counts
        if (document.getElementById('pending-count')) document.getElementById('pending-count').textContent = pendingCount;
        if (document.getElementById('approved-count')) document.getElementById('approved-count').textContent = approvedCount;
        if (document.getElementById('rejected-count')) document.getElementById('rejected-count').textContent = rejectedCount;
        if (document.getElementById('completed-count')) document.getElementById('completed-count').textContent = completedCount;
        if (document.getElementById('current-sit-ins-count')) document.getElementById('current-sit-ins-count').textContent = currentSitInsCount;

        console.log(`Total Entries: ${enrichedEntries.length}, Active: ${currentSitInsCount}`);
        
        // Display in table
        displayUnifiedTable(enrichedEntries);
        
        // Display in charts
        updateCharts(enrichedEntries);
        
    } catch (error) {
        console.error('Error fetching sit-ins data:', error);
        document.getElementById('unified-sit-ins-table').innerHTML = `
            <tr>
                <td colspan="11" class="px-6 py-3 text-center text-red-500">
                    Error loading data. Please try again.
                </td>
            </tr>
        `;
    }
}

// Function to display unified table
function displayUnifiedTable(entries) {
    const tableBody = document.getElementById('unified-sit-ins-table');
    if (!tableBody) {
        console.error("Table body 'unified-sit-ins-table' not found");
        return;
    }

    if (!entries || entries.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="px-6 py-3 text-center text-gray-500">No entries found</td>
            </tr>
        `;
        return;
    }

    console.log(`Displaying ${entries.length} entries in the table`);

    let html = '';
    
    entries.forEach(entry => {
        // Use displayTime property consistently for time display
        const timeIn = entry.displayTime || 'N/A';
        const timeOut = entry.timeOut || entry.timeout || 'N/A';
        const name = entry.name || 'N/A';
        const course = entry.course || 'N/A';
        const year = entry.year || 'N/A';
        
        // Format entry type - capitalize first letter
        const entryType = entry.entryType ? 
            entry.entryType.charAt(0).toUpperCase() + entry.entryType.slice(1) : 
            (entry.isWalkIn ? 'Walk-in' : 'Reservation');

        // Determine row class based on status
        let rowClass = '';
        if (entry.status === 'active') {
            rowClass = 'bg-green-50';
        } else if (entry.status === 'pending') {
            rowClass = 'bg-yellow-50';
        } else if (entry.status === 'completed') {
            rowClass = 'bg-gray-50';
        } else if (entry.status === 'rejected') {
            rowClass = 'bg-red-50';
        } else if (entry.status === 'approved') {
            rowClass = 'bg-blue-50';
        }
        
        // Determine actions column based on entry status and type
        let actionsHtml = '';
        
        if (entry.status === 'active') {
            actionsHtml = `
                <button onclick="completeSitIn('${entry.id}')" class="text-blue-600 hover:text-blue-900 mr-2">
                    Mark as Completed
                </button>
            `;
        } else if (entry.status === 'pending') {
            actionsHtml = `
                <div class="flex space-x-1">
                    <button onclick="approveReservation('${entry.id}')" class="text-green-600 hover:text-green-900 mr-2">
                        Approve
                    </button>
                    <button onclick="rejectReservation('${entry.id}')" class="text-red-600 hover:text-red-900">
                        Reject
                    </button>
                </div>
            `;
        } else if (entry.status === 'completed' || entry.status === 'rejected') {
            actionsHtml = '<span class="text-xs text-gray-500">No actions available</span>';
        } else if (entry.status === 'approved') {
            actionsHtml = `
                <button onclick="completeSitIn('${entry.id}')" class="text-blue-600 hover:text-blue-900 mr-2">
                    Mark as Completed
                </button>
            `;
        }

        // Create a badge for entry type
        const entryTypeBadge = entryType.toLowerCase() === 'walk-in' 
            ? `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Walk-in</span>`
            : `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">Reservation</span>`;

        html += `
            <tr class="${rowClass} hover:bg-gray-100">
                <td class="px-6 py-4 whitespace-nowrap">${entry.idNumber || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${course}</td>
                <td class="px-6 py-4 whitespace-nowrap">${year}</td>
                <td class="px-6 py-4 whitespace-nowrap">${entry.programmingLanguage || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${entry.date || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${timeIn}</td>
                <td class="px-6 py-4 whitespace-nowrap">${timeOut}</td>
                <td class="px-6 py-4 whitespace-nowrap">${entryTypeBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        entry.status === 'active' ? 'bg-green-100 text-green-800' :
                        entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        entry.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        entry.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        entry.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }">
                        ${entry.status || 'Unknown'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    ${actionsHtml}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;

    // Initialize search if not already done
    if (!window.searchInitialized) {
        initializeSearch();
        window.searchInitialized = true;
    }
}

// Setup search for sit-in records
function setupSitInSearch() {
    const searchInput = document.getElementById('sit-in-search');
    if (!searchInput) return;
    
    // Clear existing listeners to avoid duplicates
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    // Add new listener
    newSearchInput.addEventListener('input', function() {
        if (!window.allSitInEntries) return;
        
        const searchTerm = this.value.trim().toLowerCase();
        if (!searchTerm) {
            displayUnifiedTable(window.allSitInEntries);
            return;
        }
        
        // Filter entries by ID or name
        const filteredEntries = window.allSitInEntries.filter(entry => 
            (entry.idNumber && entry.idNumber.toLowerCase().includes(searchTerm)) || 
            (entry.name && entry.name.toLowerCase().includes(searchTerm))
        );
        
        displayUnifiedTable(filteredEntries);
    });
}

async function completeSitIn(sitInId) {
    if (!confirm("Mark this sit-in session as completed?")) {
        return;
    }

    try {
        const now = new Date();
        const timeOut = now.toTimeString().slice(0, 5); // Format HH:MM
        
        const response = await fetch("http://localhost:3000/update-reservation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: sitInId,
                status: "completed",
                timeout: timeOut
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || "Failed to complete sit-in");
        }

        alert("Sit-in marked as completed successfully!");
        
        // Update the dashboard count for active sit-ins
        const activeCountElement = document.getElementById('current-sit-in');
        if (activeCountElement) {
            // We're displaying the total active sit-ins, not just for this user
            // So we need to refresh the data to get the new count
            await fetchSitIns();
        }
        
        // Refresh data
        await fetchSitIns();
        await updateRecordsCharts();
    } catch (error) {
        console.error("Error completing sit-in:", error);
        alert("Error: " + error.message);
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
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.7)',  // Blue for C#
                            'rgba(255, 99, 132, 0.7)',  // Pink for C
                            'rgba(255, 206, 86, 0.7)',  // Yellow for Java
                            'rgba(255, 159, 64, 0.7)',  // Orange for ASP.Net
                            'rgba(75, 192, 192, 0.7)',  // Teal for PHP
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 206, 86, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(75, 192, 192, 1)',
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 20,
                            right: 120,
                            bottom: 20,
                            left: 20
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'right',
                            align: 'center',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: {
                                    size: 12,
                                    family: "'Inter', sans-serif"
                                },
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                            const percentage = ((value / total) * 100).toFixed(1);
                                            // Add appropriate icons based on programming language
                                            let icon = '💻';
                                            if (label.toLowerCase().includes('c#')) icon = '🔵';
                                            if (label.toLowerCase().includes('c')) icon = '🔴';
                                            if (label.toLowerCase().includes('java')) icon = '🟡';
                                            if (label.toLowerCase().includes('asp')) icon = '🟠';
                                            if (label.toLowerCase().includes('php')) icon = '🟢';
                                            return {
                                                text: `${icon} ${label} (${percentage}%)`,
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
                            display: false // Remove the "Statistics" title
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
    const tabUserFeedback = document.getElementById('tab-user-feedback');
    const tabStudentReports = document.getElementById('tab-student-reports');
    
    const contentUserFeedback = document.getElementById('content-user-feedback');
    const contentStudentReports = document.getElementById('content-student-reports');
    
    if (!tabUserFeedback || !tabStudentReports) {
        console.error('Report tabs not found');
        return;
    }
    
    // Function to switch tabs
    function switchTab(activeTab, activeContent) {
        // Reset all tabs
        [tabUserFeedback, tabStudentReports].forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            tab.classList.add('text-gray-500');
        });
        
        // Reset all content
        [contentUserFeedback, contentStudentReports].forEach(content => {
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
    tabUserFeedback.addEventListener('click', () => {
        switchTab(tabUserFeedback, contentUserFeedback);
    });
    
    tabStudentReports.addEventListener('click', () => {
        switchTab(tabStudentReports, contentStudentReports);
    });
    
    // Show user feedback tab by default
    switchTab(tabUserFeedback, contentUserFeedback);
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
    const departmentStats = {};
    sitIns.forEach(sitIn => {
        const department = sitIn.course ? sitIn.course.split(' ')[0] : 'Unknown';
        departmentStats[department] = (departmentStats[department] || 0) + 1;
    });

    // Destroy existing chart if it exists
    if (window.departmentChart) {
        window.departmentChart.destroy();
    }
    
    // Create chart
    window.departmentChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: Object.keys(departmentStats),
            datasets: [{
                data: Object.values(departmentStats),
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
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Department Distribution',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Function to initialize reset session section
async function initResetSession() {
    try {
        // Load reset logs
        await loadResetLogs();
        
        // Add event listeners for reset buttons
        const resetUserBtn = document.getElementById('reset-user-btn');
        const resetSemesterBtn = document.getElementById('reset-semester-btn');
        
        if (resetUserBtn) {
            resetUserBtn.addEventListener('click', async () => {
                const idNumber = document.getElementById('user-id-input').value.trim();
                if (!idNumber) {
                    alert('Please enter a user ID');
                    return;
                }
                
                try {
                    await resetSessions(idNumber);
                    alert('User sessions reset successfully');
                } catch (error) {
                    alert('Error resetting user sessions: ' + error.message);
                }
            });
        }
        
        if (resetSemesterBtn) {
            resetSemesterBtn.addEventListener('click', async () => {
                const semester = document.getElementById('semester-select').value.trim();
                if (!semester) {
                    alert('Please select a semester');
                    return;
                }
                
                try {
                    await resetSessions(null, semester);
                    alert('Semester sessions reset successfully');
                } catch (error) {
                    alert('Error resetting semester sessions: ' + error.message);
                }
            });
        }
    } catch (error) {
        console.error('Error initializing reset session:', error);
        alert('Error initializing reset session section');
    }
}

// Function to fetch sit-ins data for reports
async function fetchSitInsData() {
    try {
        const response = await fetch("http://localhost:3000/sit-ins");
        if (!response.ok) {
            throw new Error("Failed to fetch sit-ins data");
        }
        const sitIns = await response.json();
        return sitIns;
    } catch (error) {
        console.error("Error fetching sit-ins data:", error);
        return [];
    }
}

// Function to load today's sit-in records
async function loadTodaysSitInRecords() {
    try {
        // Just call the updateRecordsCharts function which already has the logic we need
        await updateRecordsCharts();
    } catch (error) {
        console.error("Error loading records data:", error);
        alert("Error loading records data: " + error.message);
    }
}

// Function to load feedback
async function loadFeedback() {
    try {
        const response = await fetch("http://localhost:3000/feedback");
        if (!response.ok) {
            throw new Error("Failed to fetch feedback data");
        }
        const feedback = await response.json();
        
        // Sort feedback by date (newest first)
        feedback.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Display feedback in the table
        const feedbackTableBody = document.getElementById('feedbackTableBody');
        if (!feedbackTableBody) return;

        if (feedback.length === 0) {
            feedbackTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-3 text-center text-sm text-gray-500">
                        No feedback found
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        feedback.forEach(item => {
            const date = new Date(item.date).toLocaleString();
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm text-gray-900">${item.userId || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.laboratory || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${date}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.message}</td>
                </tr>
            `;
        });

        feedbackTableBody.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading feedback:", error);
        const feedbackTableBody = document.getElementById('feedbackTableBody');
        if (feedbackTableBody) {
            feedbackTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-3 text-center text-sm text-red-500">
                        Error loading feedback: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// Function to delete feedback
async function deleteFeedback(id) {
    if (!confirm("Are you sure you want to delete this feedback?")) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/delete-feedback/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            alert("Feedback deleted successfully!");
            await loadFeedback(); // Reload the feedback table
        } else {
            throw new Error("Failed to delete feedback");
        }
    } catch (error) {
        console.error("Error deleting feedback:", error);
        alert("Failed to delete feedback. Please try again.");
    }
}

// Function to generate student report
async function generateStudentReport() {
    try {
        const startDate = document.getElementById('report-date-start').value;
        const endDate = document.getElementById('report-date-end').value;
        
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        // ... rest of the function ...
    } catch (error) {
        console.error("Error generating student report:", error);
        alert("Error generating student report. Please try again.");
    }
}

// Function to initialize walk-in form
function initializeWalkinForm() {
    const searchStudentBtn = document.getElementById('search-student-btn');
    const walkinStudentId = document.getElementById('walkin-student-id');
    const addWalkinBtn = document.getElementById('add-walkin-btn');
    const walkinProgLanguage = document.getElementById('walkin-prog-language');
    const walkinOtherLanguage = document.getElementById('walkin-other-language');
    const walkinLabRoom = document.getElementById('walkin-lab-room');
    const otherLanguageContainer = document.getElementById('prog-language-other-container');
    
    // Hide other language input initially
    if (otherLanguageContainer) {
        otherLanguageContainer.style.display = 'none';
    }
    
    // Show/hide other language input when "Other" is selected
    if (walkinProgLanguage) {
        walkinProgLanguage.addEventListener('change', function() {
            if (otherLanguageContainer) {
                otherLanguageContainer.style.display = this.value === 'Other' ? 'block' : 'none';
            }
        });
    }
    
    // Search for student when search button is clicked
    if (searchStudentBtn && walkinStudentId) {
        searchStudentBtn.addEventListener('click', async function() {
            const studentId = walkinStudentId.value.trim();
            if (!studentId) {
                alert('Please enter a student ID');
                return;
            }
            
            try {
                const response = await fetch(`http://localhost:3000/get-user?id=${studentId}`);
                if (!response.ok) {
                    throw new Error('Student not found');
                }
                
                const data = await response.json();
                if (!data.success || !data.user) {
                    throw new Error('Student not found');
                }
                
                const student = data.user;
                
                // Display student info
                const studentInfoContainer = document.getElementById('student-info');
                if (studentInfoContainer) {
                    studentInfoContainer.classList.remove('hidden');
                }
                
                document.getElementById('walkin-student-name').textContent = `${student.firstName} ${student.lastName}`;
                document.getElementById('walkin-student-course').textContent = student.course || 'N/A';
                document.getElementById('walkin-student-year').textContent = student.year || 'N/A';
                
                // Enable add button
                if (addWalkinBtn) {
                    addWalkinBtn.disabled = false;
                }
                
            } catch (error) {
                console.error('Error searching for student:', error);
                alert('Student not found. Please check the ID and try again.');
                
                // Hide student info container
                const studentInfoContainer = document.getElementById('student-info');
                if (studentInfoContainer) {
                    studentInfoContainer.classList.add('hidden');
                }
                
                // Reset student info
                document.getElementById('walkin-student-name').textContent = '-';
                document.getElementById('walkin-student-course').textContent = '-';
                document.getElementById('walkin-student-year').textContent = '-';
                
                // Disable add button
                if (addWalkinBtn) {
                    addWalkinBtn.disabled = true;
                }
            }
        });
    }
    
    // Handle walk-in submission
    if (addWalkinBtn) {
        addWalkinBtn.addEventListener('click', async function() {
            const studentId = walkinStudentId.value.trim();
            if (!studentId) {
                alert('Please enter a student ID');
                return;
            }
            
            try {
                let programmingLanguage = walkinProgLanguage ? walkinProgLanguage.value : 'Not Specified';
                if (programmingLanguage === 'Other' && walkinOtherLanguage) {
                    programmingLanguage = walkinOtherLanguage.value.trim();
                    if (!programmingLanguage) {
                        alert('Please specify the programming language');
                        return;
                    }
                }
                
                const labRoom = walkinLabRoom ? walkinLabRoom.value : '524';
                
                // Get today's date in YYYY-MM-DD format
                const today = new Date().toISOString().split('T')[0];
                const currentTime = new Date().toTimeString().slice(0, 5); // Current time in HH:MM format

                // Use the dedicated walkin endpoint to create an active session directly
                const response = await fetch('http://localhost:3000/create-walkin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        idNumber: studentId,
                        name: document.getElementById('walkin-student-name').textContent,
                        course: document.getElementById('walkin-student-course').textContent,
                        year: document.getElementById('walkin-student-year').textContent,
                        purpose: 'Computer laboratory use', // Add default purpose
                        programmingLanguage: programmingLanguage,
                        otherLanguage: programmingLanguage === 'Other' ? walkinOtherLanguage.value : '',
                        labRoom: labRoom,
                        // These fields will be set on the server side
                        // timeIn: currentTime, 
                        // status: 'active'
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok || !data.success) {
                    throw new Error(data.error || data.message || 'Failed to create walk-in');
                }
                
                // Show success message
                alert('Walk-in successfully created and activated!');
                
                // Reset form
                walkinStudentId.value = '';
                if (walkinProgLanguage) walkinProgLanguage.value = 'Not Specified';
                if (walkinOtherLanguage) {
                    walkinOtherLanguage.value = '';
                }
                if (walkinLabRoom) {
                    walkinLabRoom.value = '524';
                }
                
                // Hide the additional input containers
                if (otherLanguageContainer) otherLanguageContainer.style.display = 'none';
                
                // Reset student info
                document.getElementById('walkin-student-name').textContent = '-';
                document.getElementById('walkin-student-course').textContent = '-';
                document.getElementById('walkin-student-year').textContent = '-';
                
                // Hide student info container
                const studentInfoContainer = document.getElementById('student-info');
                if (studentInfoContainer) {
                    studentInfoContainer.classList.add('hidden');
                }
                
                // Disable add button
                addWalkinBtn.disabled = true;
                
                // Refresh sit-ins table
                await fetchSitIns();
                
                // Update dashboard counts
                const dashboardSitInCount = document.getElementById('current-sit-in');
                if (dashboardSitInCount) {
                    const currentCount = parseInt(dashboardSitInCount.textContent || '0');
                    dashboardSitInCount.textContent = currentCount + 1;
                }
                
                // Update the records charts to reflect the new sit-in
                await updateRecordsCharts();
                
            } catch (error) {
                console.error('Error creating walk-in:', error);
                alert('Error creating walk-in: ' + error.message);
            }
        });
    }
}

// Function to update the charts in Records section with new data
async function updateRecordsCharts() {
    try {
        // Fetch the latest reservations data (which includes both online reservations and walk-ins)
        const reservationsResponse = await fetch("http://localhost:3000/reservations");
        if (!reservationsResponse.ok) {
            throw new Error("Failed to fetch reservations data");
        }
        const reservations = await reservationsResponse.json();
        
        // Filter for approved reservations and active sessions
        const approvedReservations = reservations.filter(reservation => 
            reservation.status === 'approved' || reservation.status === 'active'
        );
        
        console.log("Total sessions for charts:", approvedReservations.length);
        
        // Get chart canvases
        const programmingLanguageCanvas = document.getElementById('programmingLanguageChart');
        const labRoomCanvas = document.getElementById('labRoomChart');
        
        // Update total sessions count
        const totalSessionsToday = document.getElementById('total-sessions-today');
        if (totalSessionsToday) {
            totalSessionsToday.textContent = approvedReservations.length;
        }
        
        if (programmingLanguageCanvas || labRoomCanvas) {
            // Count programming languages
            const languageStats = {};
            approvedReservations.forEach(record => {
                let lang = 'Not Specified';
                
                // Handle different field names and formats
                if (record.programmingLanguage) {
                    lang = record.programmingLanguage;
                }
                
                languageStats[lang] = (languageStats[lang] || 0) + 1;
            });
            
            // Count lab rooms
            const labStats = {};
            approvedReservations.forEach(record => {
                // Handle different possible field names for lab rooms
                let lab = 'Not Specified';
                
                if (record.labRoom) {
                    lab = record.labRoom;
                } else if (record.laboratory) {
                    lab = record.laboratory;
                }
                
                // Convert numeric lab values to room names for consistency
                if (lab === '524') lab = 'Room 524 - Programming Lab';
                else if (lab === '526') lab = 'Room 526 - Networking Lab';
                else if (lab === '530') lab = 'Room 530 - Database Lab';
                else if (lab === '542') lab = 'Room 542 - Web Development Lab';
                else if (lab === '544') lab = 'Room 544 - General Computing Lab';
                else if (lab === 'Walk-in') lab = 'Walk-in Session';
                
                labStats[lab] = (labStats[lab] || 0) + 1;
            });
            
            console.log("Language stats:", languageStats);
            console.log("Lab stats:", labStats);
            
            // Update programming language chart
            if (programmingLanguageCanvas) {
                // Safely destroy existing chart if it exists
                if (window.programmingLanguageChart && typeof window.programmingLanguageChart.destroy === 'function') {
                    window.programmingLanguageChart.destroy();
                }
                
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
                                'rgba(199, 199, 199, 0.7)',
                            ],
                            borderColor: [
                                'rgb(255, 99, 132)',
                                'rgb(54, 162, 235)',
                                'rgb(255, 206, 86)',
                                'rgb(75, 192, 192)',
                                'rgb(153, 102, 255)',
                                'rgb(255, 159, 64)',
                                'rgb(199, 199, 199)',
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
                            },
                            title: {
                                display: true,
                                text: 'Programming Languages Distribution'
                            }
                        }
                    }
                });
            }
            
            // Update lab room chart
            if (labRoomCanvas) {
                // Safely destroy existing chart if it exists
                if (window.labRoomChart && typeof window.labRoomChart.destroy === 'function') {
                    window.labRoomChart.destroy();
                }
                
                window.labRoomChart = new Chart(labRoomCanvas, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(labStats),
                        datasets: [{
                            data: Object.values(labStats),
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.7)',
                                'rgba(54, 162, 235, 0.7)',
                                'rgba(255, 206, 86, 0.7)',
                                'rgba(75, 192, 192, 0.7)',
                                'rgba(153, 102, 255, 0.7)',
                                'rgba(255, 159, 64, 0.7)',
                                'rgba(199, 199, 199, 0.7)',
                            ],
                            borderColor: [
                                'rgb(255, 99, 132)',
                                'rgb(54, 162, 235)',
                                'rgb(255, 206, 86)',
                                'rgb(75, 192, 192)',
                                'rgb(153, 102, 255)',
                                'rgb(255, 159, 64)',
                                'rgb(199, 199, 199)',
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
                            },
                            title: {
                                display: true,
                                text: 'Laboratory Room Distribution'
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error updating records charts:", error);
    }
}

// Document ready event listener
document.addEventListener('DOMContentLoaded', function() {
    // Verify admin authentication
    checkAdminAuth();
    
    // Initialize the dashboard data by default
    initializeDashboard();
    initializeWalkinForm();
    
    // Set up navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            if (targetSection) {
                showSection(targetSection);
            }
        });
    });
});

async function approveReservation(reservationId) {
    if (!confirm("Approve this reservation?")) {
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/update-reservation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: reservationId,
                status: "approved"
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || "Failed to approve reservation");
        }

        alert("Reservation approved successfully!");
        
        // Update the dashboard count for pending reservations
        const pendingCountElement = document.getElementById('pending-reservations');
        if (pendingCountElement && data.user && typeof data.user.pendingReservations === 'number') {
            // We're displaying the total pending reservations, not just for this user
            // So we need to refresh the data to get the new count
            await fetchSitIns();
        }
        
        // Refresh data
        await fetchSitIns();
        await updateRecordsCharts();
    } catch (error) {
        console.error("Error approving reservation:", error);
        alert("Error: " + error.message);
    }
}

async function rejectReservation(reservationId) {
    if (!confirm("Reject this reservation?")) {
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/update-reservation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: reservationId,
                status: "rejected"
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || "Failed to reject reservation");
        }

        alert("Reservation rejected successfully!");
        
        // Update the dashboard count for pending reservations
        const pendingCountElement = document.getElementById('pending-reservations');
        if (pendingCountElement && data.user && typeof data.user.pendingReservations === 'number') {
            // We're displaying the total pending reservations, not just for this user
            // So we need to refresh the data to get the new count
            await fetchSitIns();
        }
        
        // Refresh data
        await fetchSitIns();
        await updateRecordsCharts();
    } catch (error) {
        console.error("Error rejecting reservation:", error);
        alert("Error: " + error.message);
    }
}

// Initialize search functionality for the sit-ins table
function initializeSearch() {
    const searchInput = document.getElementById('sit-in-search');
    if (!searchInput) {
        console.error("Search input not found");
        return;
    }
    
    console.log("Initializing search functionality");
    
    // Clear existing listeners to avoid duplicates
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    // Add new listener
    newSearchInput.addEventListener('input', function() {
        if (!window.allSitInEntries) {
            console.warn("No sit-in entries available for search");
            return;
        }
        
        const searchTerm = this.value.trim().toLowerCase();
        if (!searchTerm) {
            displayUnifiedTable(window.allSitInEntries);
            return;
        }
        
        // Filter entries by ID or name
        const filteredEntries = window.allSitInEntries.filter(entry => 
            (entry.idNumber && entry.idNumber.toLowerCase().includes(searchTerm)) || 
            (entry.name && entry.name.toLowerCase().includes(searchTerm))
        );
        
        displayUnifiedTable(filteredEntries);
    });
    
    console.log("Search functionality initialized");
}

function updateCharts(entries) {
    try {
        // Get today's date in YYYY-MM-DD format for filtering
        const today = new Date();
        const formattedToday = today.toISOString().split('T')[0];
        
        // Count entries by type for pie chart
        const walkInCount = entries.filter(entry => entry.entryType === 'walk-in' || entry.isWalkIn).length;
        const reservationCount = entries.filter(entry => entry.entryType === 'reservation' && !entry.isWalkIn).length;
        
        // Count entries by language for bar chart
        const languageCounts = {};
        entries.forEach(entry => {
            const language = entry.programmingLanguage || 'Unknown';
            if (!languageCounts[language]) {
                languageCounts[language] = 0;
            }
            languageCounts[language]++;
        });
        
        // Count entries by status
        const statusCounts = {
            'active': 0,
            'pending': 0,
            'approved': 0,
            'completed': 0,
            'rejected': 0
        };
        
        entries.forEach(entry => {
            const status = entry.status || 'Unknown';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            }
        });
        
        // Count entries for today
        const todayEntries = entries.filter(entry => entry.date === formattedToday);
        const todayWalkInCount = todayEntries.filter(entry => entry.entryType === 'walk-in' || entry.isWalkIn).length;
        const todayReservationCount = todayEntries.filter(entry => entry.entryType === 'reservation' && !entry.isWalkIn).length;
        
        // Update pie chart (entry types)
        const typeCtxElement = document.getElementById('pieChartTypes');
        if (typeCtxElement) {
            const typeCtx = typeCtxElement.getContext('2d');
            if (window.typeChart) {
                window.typeChart.destroy();
            }
            window.typeChart = new Chart(typeCtx, {
                type: 'pie',
                data: {
                    labels: ['Walk-in', 'Reservation'],
                    datasets: [{
                        data: [walkInCount, reservationCount],
                        backgroundColor: ['#6366F1', '#8B5CF6'],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        title: {
                            display: true,
                            text: 'Entry Types Distribution'
                        }
                    }
                }
            });
        }
        
        // Update bar chart (programming languages)
        const langCtxElement = document.getElementById('barChartLanguages');
        if (langCtxElement) {
            const langCtx = langCtxElement.getContext('2d');
            if (window.langChart) {
                window.langChart.destroy();
            }
            
            const languages = Object.keys(languageCounts);
            const languageData = languages.map(lang => languageCounts[lang]);
            
            window.langChart = new Chart(langCtx, {
                type: 'bar',
                data: {
                    labels: languages,
                    datasets: [{
                        label: 'Language Usage',
                        data: languageData,
                        backgroundColor: '#4F46E5',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Language Usage Distribution'
                        }
                    },
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
        
        // Update doughnut chart (status distribution)
        const statusCtxElement = document.getElementById('doughnutChartStatus');
        if (statusCtxElement) {
            const statusCtx = statusCtxElement.getContext('2d');
            if (window.statusChart) {
                window.statusChart.destroy();
            }
            
            window.statusChart = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Pending', 'Approved', 'Completed', 'Rejected'],
                    datasets: [{
                        data: [
                            statusCounts.active,
                            statusCounts.pending,
                            statusCounts.approved,
                            statusCounts.completed,
                            statusCounts.rejected
                        ],
                        backgroundColor: [
                            '#10B981', // green for active
                            '#F59E0B', // yellow for pending
                            '#3B82F6', // blue for approved
                            '#6B7280', // gray for completed
                            '#EF4444'  // red for rejected
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        title: {
                            display: true,
                            text: 'Status Distribution'
                        }
                    }
                }
            });
        }
        
        // Update line chart (today's entries)
        const todayCtxElement = document.getElementById('lineChartToday');
        if (todayCtxElement) {
            const todayCtx = todayCtxElement.getContext('2d');
            if (window.todayChart) {
                window.todayChart.destroy();
            }
            
            window.todayChart = new Chart(todayCtx, {
                type: 'line',
                data: {
                    labels: ['Walk-in', 'Reservation'],
                    datasets: [{
                        label: 'Today\'s Entries',
                        data: [todayWalkInCount, todayReservationCount],
                        fill: false,
                        borderColor: '#8B5CF6',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `Today's Entries (${formattedToday})`
                        }
                    },
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
        
        console.log('Charts updated successfully');
        
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

