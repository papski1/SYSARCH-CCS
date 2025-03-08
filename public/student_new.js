// Function to hide all sections
function hideAllSections() {
    const sections = document.querySelectorAll(".section");
    sections.forEach(section => section.classList.add("hidden"));
}

// Function to show a specific section
function showSection(sectionId) {
    hideAllSections();
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove("hidden");
        // Save the active section to localStorage
        localStorage.setItem("activeSection", sectionId);
    }
}

// Document Ready Event Handler
document.addEventListener("DOMContentLoaded", function() {
    // Get user ID from the URL (e.g., student.html?id=232323)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("id");

    // If no user ID in URL, try to get it from localStorage
    if (!userId) {
        const storedUserId = localStorage.getItem("currentUserId");
        if (storedUserId) {
            // If we have a stored ID, update the URL
            window.history.replaceState({}, '', `?id=${storedUserId}`);
        } else {
            console.error("No user ID found!");
            return;
        }
    }

    // Store the user ID in localStorage for persistence
    localStorage.setItem("currentUserId", userId || localStorage.getItem("currentUserId"));
    
    // Set up navigation
    setupNavigation();
    
    // Load profile data
    loadProfile();
    
    // Set up history tabs
    setupHistoryTabs();
    
    // Setup lab rules toggle
    setupLabRulesToggle();
    
    // Setup reservation form
    setupReservationForm();
    
    // Setup profile picture upload listener
    setupProfilePictureUpload();
    
    // Set up periodic checks for new announcements
    setInterval(checkNewAnnouncements, 30000);
    
    // Load initial data based on active section
    loadInitialData();
});

// Function to load initial data based on active section
function loadInitialData() {
    // Get active section from localStorage or default to dashboard
    const activeSection = localStorage.getItem("activeSection") || "dashboard";
    
    // Show the active section
    showSection(activeSection);
    
    // Load data based on active section
    if (activeSection === "dashboard") {
        loadDashboardData();
    } else if (activeSection === "announcements") {
        loadAnnouncements();
    } else if (activeSection === "sit-in-history") {
        loadSitInHistory();
    } else if (activeSection === "reservation-history") {
        loadReservationHistory();
    }
}

// Function to setup navigation
function setupNavigation() {
    const menuLinks = document.querySelectorAll(".sidebar ul li a");
    
    menuLinks.forEach(link => {
        // Skip if this is the logout link with an onclick attribute
        if (link.getAttribute("onclick")) {
            return;
        }
        
        link.addEventListener("click", function(event) {
            event.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            showSection(targetId);
            
            // Load data for the section if needed
            if (targetId === "dashboard") {
                loadDashboardData();
            } else if (targetId === "announcements") {
                loadAnnouncements();
            } else if (targetId === "sit-in-history") {
                loadSitInHistory();
            } else if (targetId === "reservation-history") {
                loadReservationHistory();
            }
        });
    });
}

// Function to check for new announcements
async function checkNewAnnouncements() {
    try {
        // Only check if we're not currently on the announcements page
        const activeSection = localStorage.getItem("activeSection");
        if (activeSection !== "announcements") {
            const response = await fetch("http://localhost:3000/get-announcements");
            const announcements = await response.json();
            
            if (announcements.length > 0) {
                // Get the timestamp of the latest announcement
                const latestTimestamp = Math.max(...announcements.map(a => new Date(a.date).getTime()));
                
                // Get the last seen timestamp from localStorage
                const lastSeen = localStorage.getItem("lastSeenAnnouncement");
                
                // If we have a new announcement that hasn't been seen, show notification
                if (!lastSeen || latestTimestamp > parseInt(lastSeen)) {
                    showAnnouncementNotification();
                }
            }
        }
    } catch (error) {
        console.error("Error checking for new announcements:", error);
    }
}

// Function to show announcement notification
function showAnnouncementNotification() {
    const announcementLink = document.querySelector('a[href="#announcements"]');
    if (announcementLink) {
        // Create notification dot if it doesn't exist
        if (!announcementLink.querySelector('.notification-dot')) {
            const dot = document.createElement('span');
            dot.className = 'notification-dot inline-block h-2 w-2 bg-red-500 rounded-full ml-2';
            announcementLink.appendChild(dot);
        }
    }
}

// Function to clear announcement notification
function clearAnnouncementNotification() {
    const announcementLink = document.querySelector('a[href="#announcements"]');
    if (announcementLink) {
        const dot = announcementLink.querySelector('.notification-dot');
        if (dot) {
            dot.remove();
        }
    }
}

// Function to load announcements
async function loadAnnouncements() {
    try {
        const response = await fetch("http://localhost:3000/get-announcements");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const announcements = await response.json();
        
        const container = document.getElementById("announcements-container");
        if (!container) return;
        
        if (announcements.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">No announcements at this time.</p>';
            return;
        }
        
        // Sort announcements by date (newest first)
        announcements.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let html = '';
        announcements.forEach(announcement => {
            const date = new Date(announcement.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            html += `
                <div class="mb-4 pb-4 border-b border-gray-200 last:border-0">
                    <div class="flex justify-between items-start">
                        <h3 class="text-md font-semibold text-gray-800">${announcement.title || 'Announcement'}</h3>
                        <span class="text-xs text-gray-500">${date}</span>
                    </div>
                    <p class="text-gray-600 mt-1">${announcement.message}</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Update last seen timestamp
        localStorage.setItem("lastSeenAnnouncement", new Date().getTime().toString());
        
        // Clear notification dot if present
        clearAnnouncementNotification();
        
    } catch (error) {
        console.error("Error loading announcements:", error);
        const container = document.getElementById("announcements-container");
        if (container) {
            container.innerHTML = '<p class="text-red-500 text-center">Error loading announcements. Please try again later.</p>';
        }
    }
}

// Function to update dashboard statistics
async function updateDashboardStats() {
    try {
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        if (!userId) return;
        
        // Fetch sit-ins and reservations data to update counts
        const [sitIns, reservations] = await Promise.all([
            fetch(`http://localhost:3000/sit-ins?userId=${userId}`).then(res => res.json()),
            fetch(`http://localhost:3000/reservations?userId=${userId}`).then(res => res.json())
        ]);
        
        // Update total sessions count
        if (document.getElementById('totalSessions')) {
            const totalCount = (sitIns?.length || 0) + (reservations?.length || 0);
            document.getElementById('totalSessions').textContent = totalCount;
        }
        
        // Update completed sessions count
        if (document.getElementById('completedSessions')) {
            const completedCount = sitIns?.filter(s => s.status === 'completed')?.length || 0;
            document.getElementById('completedSessions').textContent = completedCount;
        }
        
        // Update pending sessions count
        if (document.getElementById('pendingSessions')) {
            const pendingCount = reservations?.filter(r => r.status === 'pending')?.length || 0;
            document.getElementById('pendingSessions').textContent = pendingCount;
        }
        
        // Update remaining sessions on dashboard
        const remainingSessions = document.getElementById('remainingSessions')?.textContent || '0';
        const dashboardRemainingElement = document.getElementById('dashboardRemainingSessions');
        if (dashboardRemainingElement) {
            dashboardRemainingElement.textContent = remainingSessions;
        }
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Function to load dashboard data
async function loadDashboardData() {
    try {
        // Update statistics
        await updateDashboardStats();
        
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

// Function to upload profile picture
function uploadProfilePicture(file, userId) {
    if (!file) {
        console.error("No file selected");
        return;
    }

    const formData = new FormData();
    formData.append("profileImage", file);
    formData.append("userId", userId);

    // Add loading indicator
    const profilePic = document.getElementById("profilePic");
    const originalSrc = profilePic.src;
    profilePic.style.opacity = "0.5";

    fetch("http://localhost:3000/upload-profile", {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Add timestamp to prevent caching
            const newImagePath = data.imagePath + "?t=" + new Date().getTime();
            profilePic.src = newImagePath;
            
            // Store the new image path in localStorage to persist through refreshes
            localStorage.setItem("profileImagePath", data.imagePath);
            
            alert("Profile picture updated successfully!");
        } else {
            alert("Failed to upload profile picture: " + (data.message || "Unknown error"));
            profilePic.src = originalSrc;
        }
    })
    .catch(error => {
        console.error("Error uploading profile picture:", error);
        alert("Error uploading profile picture. Please try again.");
        profilePic.src = originalSrc;
    })
    .finally(() => {
        // Remove loading indicator
        profilePic.style.opacity = "1";
    });
}

// Function to setup profile picture upload
function setupProfilePictureUpload() {
    const uploadInput = document.getElementById("uploadProfilePic");
    if (uploadInput) {
        uploadInput.addEventListener("change", function(event) {
            const file = event.target.files[0];
            const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
            if (file && userId) {
                uploadProfilePicture(file, userId);
            } else {
                console.error("No file or user ID found!");
            }
        });
    }
}

// Function to load profile data
async function loadProfile() {
    try {
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        if (!userId) {
            console.error("No user ID found for loading profile");
            return;
        }

        const response = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch profile data: ${response.status}`);
        }

        const profileData = await response.json();
        
        // Store original ID number for reference
        document.getElementById("oldIdNumber").value = profileData.idNumber || '';
        
        // Update profile form fields
        document.getElementById("idNumber").value = profileData.idNumber || '';
        document.getElementById("firstname").value = profileData.firstName || '';
        document.getElementById("middlename").value = profileData.middleName || '';
        document.getElementById("lastname").value = profileData.lastName || '';
        document.getElementById("email").value = profileData.email || '';
        
        // Set select fields if they exist
        const yearSelect = document.getElementById("year");
        if (yearSelect && profileData.year) {
            for (let i = 0; i < yearSelect.options.length; i++) {
                if (yearSelect.options[i].value === profileData.year) {
                    yearSelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        const courseSelect = document.getElementById("course");
        if (courseSelect && profileData.course) {
            let found = false;
            for (let i = 0; i < courseSelect.options.length; i++) {
                if (courseSelect.options[i].value === profileData.course) {
                    courseSelect.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            
            // If course is not in options, select "Other"
            if (!found && profileData.course) {
                for (let i = 0; i < courseSelect.options.length; i++) {
                    if (courseSelect.options[i].value === "Other") {
                        courseSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        // Update profile picture if it exists
        const profilePic = document.getElementById("profilePic");
        if (profilePic) {
            // Check if we have a stored profile image path from a previous upload
            const storedImagePath = localStorage.getItem("profileImagePath");
            
            if (storedImagePath) {
                // Use the stored image path with a timestamp to prevent caching
                profilePic.src = storedImagePath + "?t=" + new Date().getTime();
            } else if (profileData.profilePicture) {
                // Fall back to the profile data from the server
                profilePic.src = profileData.profilePicture;
            } else {
                // Use default profile picture
                profilePic.src = '/uploads/default-profile.png';
            }
        }
        
        // Update remaining sessions display
        const remainingSessions = document.getElementById("remainingSessions");
        if (remainingSessions && profileData.remainingSessions !== undefined) {
            remainingSessions.textContent = profileData.remainingSessions || '10';
        }

    } catch (error) {
        console.error("Error loading profile:", error);
        alert("Failed to load profile data. Please try refreshing the page.");
    }
}

// Handle profile update
function saveProfile() {
    const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
    const oldIdNumber = document.getElementById("oldIdNumber").value;
    const idNumber = document.getElementById("idNumber").value;
    const firstName = document.getElementById("firstname").value;
    const middleName = document.getElementById("middlename").value;
    const lastName = document.getElementById("lastname").value;
    const email = document.getElementById("email").value;
    const year = document.getElementById("year").value;
    const course = document.getElementById("course").value;
    
    if (!idNumber || !firstName || !lastName || !email) {
        alert("Please fill in all required fields: ID Number, First Name, Last Name, and Email.");
        return;
    }

    // Show loading state
    const saveButton = document.querySelector('button[onclick="saveProfile()"]');
    const originalButtonText = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = "Saving...";
    
    const updatedData = {
        userId: userId,
        oldIdNumber: oldIdNumber,
        idNumber: idNumber,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        email: email,
        year: year,
        course: course
    };

    console.log("Sending data:", updatedData); // Debugging log

    fetch("http://localhost:3000/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to update profile");
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert("Profile updated successfully!");
            
            // Update hidden ID field with new value
            document.getElementById("oldIdNumber").value = idNumber;
            
            // If ID changed, update localStorage and URL
            if (idNumber !== oldIdNumber) {
                localStorage.setItem("currentUserId", idNumber);
                window.history.replaceState({}, '', `?id=${idNumber}`);
            }
        } else {
            alert("Failed to update profile: " + (data.message || "Unknown error"));
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error updating profile. Please try again.");
    })
    .finally(() => {
        // Restore button state
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonText;
    });
}

// Function to open the change password modal
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
}

// Function to close the change password modal
function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    }
}

// Function to change password
function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert("Please fill in all password fields.");
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        alert("New password and confirmation do not match.");
        return;
    }
    
    // Show loading state
    const updateButton = document.querySelector('#changePasswordModal button:last-child');
    const originalButtonText = updateButton.textContent;
    updateButton.disabled = true;
    updateButton.textContent = 'Updating...';
    
    fetch("http://localhost:3000/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId: userId,
            currentPassword: currentPassword,
            newPassword: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Password changed successfully!");
            closeChangePasswordModal();
        } else {
            alert(data.message || "Failed to change password.");
        }
    })
    .catch(error => {
        console.error("Error changing password:", error);
        alert("An error occurred while changing password.");
    })
    .finally(() => {
        // Restore button state
        updateButton.disabled = false;
        updateButton.textContent = originalButtonText;
    });
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

// Function to load reservation history
async function loadReservationHistory() {
    try {
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        const response = await fetch("http://localhost:3000/reservations");
        const reservations = await response.json();
        
        const userReservations = reservations.filter(res => res.idNumber === userId);
        const tableBody = document.getElementById("reservationTableBody");
        
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (userReservations.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No reservations found</td></tr>';
            return;
        }

        userReservations.forEach(reservation => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="border px-4 py-2">${reservation.date}</td>
                <td class="border px-4 py-2">${reservation.time}</td>
                <td class="border px-4 py-2">${reservation.purpose}</td>
                <td class="border px-4 py-2">
                    <span class="px-2 py-1 rounded text-sm ${
                        reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        reservation.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }">${reservation.status}</span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading reservations:", error);
        const tableBody = document.getElementById("reservationTableBody");
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Error loading reservations</td></tr>';
        }
    }
}

// Function to submit feedback
async function submitFeedback() {
    try {
        const feedbackType = document.getElementById("feedbackType").value;
        const feedbackMessage = document.getElementById("feedbackMessage").value.trim();
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");

        if (!feedbackMessage) {
            alert("Please enter a feedback message.");
            return;
        }

        if (!userId) {
            alert("User ID not found. Please try logging in again.");
            return;
        }

        // Disable the button and show loading state
        const submitButton = document.querySelector('#feedbackForm button');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = 'Submitting...';

        // Get user profile data
        const userResponse = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user data: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        if (!userData || !userData.email || !userData.idNumber) {
            throw new Error("Invalid user data received from server");
        }

        // Submit feedback
        const response = await fetch("http://localhost:3000/submit-feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: userId,
                name: `${userData.firstName} ${userData.lastName}`,
                email: userData.email,
                type: feedbackType,
                message: feedbackMessage,
                timestamp: new Date().toISOString()
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            alert("Feedback submitted successfully! Thank you for your input.");
            document.getElementById("feedbackForm").reset();
        } else {
            throw new Error(result.message || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error("Error submitting feedback:", error);
        alert(`Failed to submit feedback: ${error.message}`);
    } finally {
        // Restore button state
        const submitButton = document.querySelector('#feedbackForm button');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Submit Feedback';
        }
    }
}

// Function to load sit-in history
async function loadSitInHistory() {
    try {
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        const response = await fetch("http://localhost:3000/sit-ins");
        const sitIns = await response.json();
        
        const userSitIns = sitIns.filter(sitIn => sitIn.idNumber === userId);
        const tableBody = document.getElementById("sitInTableBody");
        
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (userSitIns.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No sit-in history found</td></tr>';
            return;
        }

        userSitIns.forEach(sitIn => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="border px-4 py-2">${new Date(sitIn.timeIn).toLocaleDateString()}</td>
                <td class="border px-4 py-2">${new Date(sitIn.timeIn).toLocaleTimeString()}</td>
                <td class="border px-4 py-2">${sitIn.timeOut ? new Date(sitIn.timeOut).toLocaleTimeString() : '-'}</td>
                <td class="border px-4 py-2">${sitIn.purpose}</td>
                <td class="border px-4 py-2">
                    <span class="px-2 py-1 rounded text-sm ${
                        sitIn.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                        sitIn.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }">${sitIn.status}</span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading sit-in history:", error);
        const tableBody = document.getElementById("sitInTableBody");
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-500">Error loading sit-in history</td></tr>';
        }
    }
}

// Function to setup lab rules toggle
function setupLabRulesToggle() {
    const toggleBtn = document.getElementById('toggleLabRules');
    const content = document.getElementById('labRulesContent');
    const icon = document.getElementById('labRulesIcon');
    
    if (toggleBtn && content) {
        toggleBtn.addEventListener('click', function() {
            content.classList.toggle('hidden');
            
            if (content.classList.contains('hidden')) {
                icon.setAttribute('d', 'M19 9l-7 7-7-7');
            } else {
                icon.setAttribute('d', 'M5 15l7-7 7 7');
            }
        });
    }
}

// Function to setup history tabs
function setupHistoryTabs() {
    const sitInHistoryTab = document.getElementById('sitInHistoryTab');
    const reservationHistoryTab = document.getElementById('reservationHistoryTab');
    
    const sitInHistoryContent = document.getElementById('sitInHistoryContent');
    const reservationHistoryContent = document.getElementById('reservationHistoryContent');
    
    if (sitInHistoryTab && reservationHistoryTab) {
        sitInHistoryTab.addEventListener('click', function() {
            // Update active tab styling
            sitInHistoryTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            reservationHistoryTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            reservationHistoryTab.classList.add('text-gray-500');
            
            // Show/hide content
            sitInHistoryContent.classList.remove('hidden');
            reservationHistoryContent.classList.add('hidden');
        });
        
        reservationHistoryTab.addEventListener('click', function() {
            // Update active tab styling
            reservationHistoryTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            sitInHistoryTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            sitInHistoryTab.classList.add('text-gray-500');
            
            // Show/hide content
            reservationHistoryContent.classList.remove('hidden');
            sitInHistoryContent.classList.add('hidden');
        });
    }
}

// Function to setup reservation form
function setupReservationForm() {
    const form = document.getElementById('reservationForm');
    if (!form) return;

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        reserveSession();
    });
}

// Function to handle session reservation
async function reserveSession() {
    try {
        const purpose = document.getElementById("purpose").value.trim();
        const date = document.getElementById("date").value;
        const time = document.getElementById("time").value;
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");

        if (!userId) {
            alert("User ID not found. Please try logging in again.");
            return;
        }

        if (!purpose || !date || !time) {
            alert("Please fill in all fields: purpose, date, and time.");
            return;
        }

        // Get user profile data
        const userResponse = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user data: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        if (!userData || !userData.email || !userData.idNumber) {
            throw new Error("Invalid user data received from server");
        }

        // Disable the button and show loading state
        const submitButton = document.querySelector('#reservationForm button');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
        `;

        // Make reservation
        const response = await fetch("http://localhost:3000/reserve", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            credentials: 'include',
            body: JSON.stringify({ 
                email: userData.email,
                idNumber: userData.idNumber,
                purpose, 
                date, 
                time 
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            alert("Reservation successful! Your session has been booked.");
            document.getElementById("reservationForm").reset();
            
            // Refresh dashboard data if we're on the dashboard
            const dashboardSection = document.getElementById("dashboard");
            if (dashboardSection && !dashboardSection.classList.contains("hidden")) {
                loadDashboardData();
            }
            
            // Also refresh reservation history if that tab is open
            await loadReservationHistory();
        } else {
            throw new Error(result.message || 'Failed to make reservation');
        }
    } catch (error) {
        console.error("Error making reservation:", error);
        alert(`Failed to make reservation: ${error.message}`);
    } finally {
        // Restore button state
        const submitButton = document.querySelector('#reservationForm button');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Reserve Now
            `;
        }
    }
} 