// Function to check authentication
function checkAuthentication() {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId') || new URLSearchParams(window.location.search).get("id");
    
    if (!userId) {
        window.location.href = '/';
        return false;
    }
    
    // Store userId in localStorage for consistency
    localStorage.setItem('userId', userId);
    localStorage.setItem('currentUserId', userId);
    return true;
}

// Function to hide all sections
function hideAllSections() {
    const sections = document.querySelectorAll(".section");
    sections.forEach(section => section.classList.add("hidden"));
}

// Function to show a specific section
async function showSection(sectionId) {
    if (sectionId === 'profile') {
        await showProfileModal();
        return;
    }
    hideAllSections();
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove("hidden");
        // Save the active section to localStorage
        localStorage.setItem("activeSection", sectionId);
    }
}

// Document Ready Event Handler
document.addEventListener("DOMContentLoaded", async function() {
    // Check authentication first
    if (!checkAuthentication()) {
        return;
    }

    // Load announcements immediately
    await loadAnnouncements();
    
    // Setup navigation
    setupNavigation();
    
    // Setup history tabs
    setupHistoryTabs();
    
    // Setup lab rules toggle
    setupLabRulesToggle();
    
    // Setup reservation form
    setupReservationForm();
    
    // Set up periodic checks for new announcements
    setInterval(checkNewAnnouncements, 30000);
    
    // Load initial data based on active section
    loadInitialData();

    // Setup modal event listeners
    setupModalEventListeners();

    // Initialize dark mode
    initializeDarkMode();
    
    // Initialize notification settings
    initializeNotificationSettings();
    
    // Initialize profile information
    initializeProfile();
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
        const data = await response.json();
        const announcements = Array.isArray(data) ? data : [];
        
        const announcementsContainer = document.getElementById('announcements');
        announcementsContainer.innerHTML = '';

        if (announcements.length === 0) {
            announcementsContainer.innerHTML = '<p class="text-gray-500">No announcements yet.</p>';
            return;
        }

        // Display only the 3 most recent announcements in the dashboard
        announcements.slice(0, 3).forEach(announcement => {
            const announcementElement = document.createElement('div');
            announcementElement.className = 'p-4 bg-white rounded-lg shadow-md mb-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer dark:bg-dark-card dark:hover:bg-gray-700';
            announcementElement.onclick = () => openAnnouncementsModal();
            announcementElement.innerHTML = `
                <p class="text-blue-600 font-medium mb-1 dark:text-blue-400">CCS | Admin</p>
                <h3 class="text-lg font-semibold text-gray-800 mb-2 dark:text-gray-100">${announcement.title}</h3>
                <p class="text-gray-600 mb-2 dark:text-gray-300 line-clamp-2">${announcement.message}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${new Date(announcement.date).toLocaleString()}</p>
            `;
            announcementsContainer.appendChild(announcementElement);
        });

        // Update last seen timestamp
        localStorage.setItem("lastSeenAnnouncement", new Date().getTime().toString());
        
        // Clear notification dot if present
        clearAnnouncementNotification();
    } catch (error) {
        console.error("Error loading announcements:", error);
        const announcementsContainer = document.getElementById('announcements');
        announcementsContainer.innerHTML = '<p class="text-red-500">Error loading announcements.</p>';
    }
}

// Function to update dashboard statistics
async function updateDashboardStats(userId) {
    try {
        // Fetch user data
        const response = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        const userData = await response.json();
        
        // Fetch sit-ins and reservations data to update counts
        const [sitInsResponse, reservationsResponse] = await Promise.all([
            fetch(`http://localhost:3000/sit-ins`),
            fetch(`http://localhost:3000/reservations`)
        ]);

        if (!sitInsResponse.ok || !reservationsResponse.ok) {
            throw new Error('Failed to fetch data');
        }

        const sitIns = await sitInsResponse.json();
        const reservations = await reservationsResponse.json();
        
        // Ensure we have arrays to work with
        const sitInsArray = Array.isArray(sitIns) ? sitIns : [];
        const reservationsArray = Array.isArray(reservations) ? reservations : [];
        
        // Filter sit-ins and reservations for this user
        const userSitIns = sitInsArray.filter(s => s.idNumber === userId);
        const userReservations = reservationsArray.filter(r => r.idNumber === userId);
        
        // Update completed sessions count
        if (document.getElementById('completedSessions')) {
            const completedCount = userSitIns.filter(s => s.status === 'completed').length;
            document.getElementById('completedSessions').textContent = completedCount;
        }
        
        // Update pending sessions count
        if (document.getElementById('pendingSessions')) {
            const pendingCount = userReservations.filter(r => r.status === 'pending').length;
            document.getElementById('pendingSessions').textContent = pendingCount;
        }
        
        // Update remaining sessions
        if (document.getElementById('remainingSessions')) {
            document.getElementById('remainingSessions').textContent = userData.remainingSessions || 0;
        }
        
        // Update remaining sessions in modal if it exists
        if (document.getElementById('remainingSessionsModal')) {
            document.getElementById('remainingSessionsModal').textContent = userData.remainingSessions || 0;
        }
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        // Set default values if there's an error
        if (document.getElementById('completedSessions')) document.getElementById('completedSessions').textContent = '0';
        if (document.getElementById('pendingSessions')) document.getElementById('pendingSessions').textContent = '0';
        if (document.getElementById('remainingSessions')) document.getElementById('remainingSessions').textContent = '0';
        if (document.getElementById('remainingSessionsModal')) document.getElementById('remainingSessionsModal').textContent = '0';
    }
}

// Function to load dashboard data
async function loadDashboardData() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!userId) {
            console.error('User ID not found');
            return;
        }

        // Update dashboard stats
        await updateDashboardStats(userId);

        // Load recent activity preview
        const response = await fetch(`http://localhost:3000/get-recent-activity/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch recent activity');
        }

        const activities = await response.json();
        
        // Update recent activity preview
        if (activities.length > 0) {
            const latestActivity = activities[0];
            const formattedDate = new Date(latestActivity.date).toLocaleDateString();
            document.getElementById('recentActivityPreview').textContent = `${latestActivity.type} on ${formattedDate}`;
        } else {
            document.getElementById('recentActivityPreview').textContent = 'No recent activity';
        }

        // Load announcements in the full-width section
        await loadAnnouncements();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('recentActivityPreview').textContent = 'Error loading activity';
    }
}

// Function to update profile picture in both sidebar and modal
function updateProfilePicture(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        
        if (!userId) {
            alert("User ID not found. Please try logging in again.");
        return;
    }

        reader.onload = function(e) {
            // Create FormData for upload
    const formData = new FormData();
            formData.append("profileImage", input.files[0]);
    formData.append("userId", userId);

            // Add loading state
            const profilePic = document.getElementById('profilePicModal');
    const originalSrc = profilePic.src;
    profilePic.style.opacity = "0.5";

            // Upload to server
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
                    
                    // Update all profile pictures
                    document.getElementById('sidebarProfilePic').src = newImagePath;
                    document.getElementById('profilePicModal').src = newImagePath;
                    
                    // Store the new image path in localStorage
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
                // Remove loading state
        profilePic.style.opacity = "1";
    });
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Function to load profile data
async function loadProfile() {
    try {
        // Get the current user ID using consistent method
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        
        if (!userId) {
            console.error("No user ID found for loading profile");
            return;
        }

        // Fetch profile data from server
        const response = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!response.ok) {
            // If server request fails, try to load from localStorage
            const storedData = localStorage.getItem('profileData');
            if (storedData) {
                const profileData = JSON.parse(storedData);
                updateBothForms(profileData);
                updateSidebarProfile();
                return;
            }
            throw new Error(`Failed to fetch profile data: ${response.status}`);
        }

        const profileData = await response.json();
        
        // Store profile data in localStorage for offline access
        localStorage.setItem('profileData', JSON.stringify(profileData));
        
        // Update profile form fields
        document.getElementById("idNumber").value = profileData.idNumber || '';
        document.getElementById("firstname").value = profileData.firstName || '';
        document.getElementById("middlename").value = profileData.middleName || '';
        document.getElementById("lastname").value = profileData.lastName || '';
        document.getElementById("email").value = profileData.email || '';
        
        // Update modal form fields
        document.getElementById("idNumberModal").value = profileData.idNumber || '';
        document.getElementById("firstnameModal").value = profileData.firstName || '';
        document.getElementById("middlenameModal").value = profileData.middleName || '';
        document.getElementById("lastnameModal").value = profileData.lastName || '';
        document.getElementById("emailModal").value = profileData.email || '';
        
        // Update sidebar profile
        updateSidebarProfile();
        
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// Function to update sidebar profile information
function updateSidebarProfile() {
    const firstName = document.getElementById('firstname').value || '';
    const lastName = document.getElementById('lastname').value || '';
    const course = document.getElementById('course').value || '';
    
    // Update sidebar profile name and course
    const fullName = `${firstName} ${lastName}`.trim();
    document.getElementById('sidebarProfileName').textContent = fullName;
    document.getElementById('sidebarProfileCourse').textContent = course;
    
    // Save to localStorage for persistence
    localStorage.setItem('profileName', fullName);
    localStorage.setItem('profileCourse', course);
}

// Function to initialize profile information
function initializeProfile() {
    const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
    
    // Load profile data from server
    fetch(`http://localhost:3000/get-profile?id=${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data) {
                // Update sidebar profile
                const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
                document.getElementById('sidebarProfileName').textContent = fullName || 'Loading...';
                document.getElementById('sidebarProfileCourse').textContent = data.course || 'Loading...';
                
                // Save to localStorage
                localStorage.setItem('profileName', fullName);
                localStorage.setItem('profileCourse', data.course || '');
                
                // Update all profile pictures if exists
                if (data.profileImage) {
                    const profileImageWithTimestamp = `${data.profileImage}?t=${new Date().getTime()}`;
                    document.getElementById('sidebarProfilePic').src = profileImageWithTimestamp;
                    document.getElementById('profilePic').src = profileImageWithTimestamp;
                    document.getElementById('profilePicModal').src = profileImageWithTimestamp;
                    // Save to localStorage
                    localStorage.setItem('profileImagePath', data.profileImage);
                }
            }
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            // Load from localStorage as fallback
            const savedName = localStorage.getItem('profileName');
            const savedCourse = localStorage.getItem('profileCourse');
            const savedProfileImage = localStorage.getItem('profileImagePath');
            
            if (savedName) document.getElementById('sidebarProfileName').textContent = savedName;
            if (savedCourse) document.getElementById('sidebarProfileCourse').textContent = savedCourse;
            if (savedProfileImage) {
                const profileImageWithTimestamp = `${savedProfileImage}?t=${new Date().getTime()}`;
                document.getElementById('sidebarProfilePic').src = profileImageWithTimestamp;
                document.getElementById('profilePic').src = profileImageWithTimestamp;
                document.getElementById('profilePicModal').src = profileImageWithTimestamp;
            }
        });
}

// Modify the existing saveProfile function to update sidebar
async function saveProfile(isModal = false) {
    try {
        const suffix = isModal ? 'Modal' : '';
        
        // Get form values
        const oldIdNumber = document.getElementById(`oldIdNumber${suffix}`).value;
        const newIdNumber = document.getElementById(`idNumber${suffix}`).value;

        // Get the existing profile data from localStorage
        const existingData = JSON.parse(localStorage.getItem('profileData') || '{}');
        
        // Create profile data object, using existing data for unchanged fields
        const profileData = {
            oldIdNumber: oldIdNumber,
            idNumber: newIdNumber,
            email: document.getElementById(`email${suffix}`).value || existingData.email,
            firstName: document.getElementById(`firstname${suffix}`).value || existingData.firstName,
            middleName: document.getElementById(`middlename${suffix}`).value || existingData.middleName,
            lastName: document.getElementById(`lastname${suffix}`).value || existingData.lastName,
            year: document.getElementById(`year${suffix}`).value || existingData.year,
            course: document.getElementById(`course${suffix}`).value || existingData.course
        };

        // Validate ID number
        if (!newIdNumber) {
            alert('ID Number is required');
            return;
        }

        // Save to server
        const response = await fetch('http://localhost:3000/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update profile: ${response.status}`);
        }

        // Update the current user ID in localStorage
        localStorage.setItem("currentUserId", newIdNumber);

        // Save to localStorage for persistence
        localStorage.setItem('profileData', JSON.stringify(profileData));

        // Update both forms with new data
        updateBothForms(profileData);

        // Update sidebar profile
        updateSidebarProfile();

        // Show success message
        alert('Profile updated successfully. Please use your new ID number for future logins.');

        // If saving from modal, close it
        if (isModal) {
            closeProfileModal();
        }

        // Reload the page with the new ID number
        window.location.href = `student.html?id=${newIdNumber}`;
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile: ' + error.message);
    }
}

// Helper function to update both forms with the same data
function updateBothForms(profileData) {
    const forms = ['', 'Modal'];
    forms.forEach(suffix => {
        if (document.getElementById(`idNumber${suffix}`)) {
            document.getElementById(`idNumber${suffix}`).value = profileData.idNumber;
            document.getElementById(`email${suffix}`).value = profileData.email;
            document.getElementById(`firstname${suffix}`).value = profileData.firstName;
            document.getElementById(`middlename${suffix}`).value = profileData.middleName;
            document.getElementById(`lastname${suffix}`).value = profileData.lastName;
            document.getElementById(`year${suffix}`).value = profileData.year;
            document.getElementById(`course${suffix}`).value = profileData.course;
            document.getElementById(`oldIdNumber${suffix}`).value = profileData.oldIdNumber;
        }
    });
}

function saveProfileModal() {
    saveProfile(true);
}

// Function to open the change password modal
function openChangePasswordModal() {
    console.log('Opening change password modal...'); // Debug log
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Get password input fields
        const currentPasswordInput = document.getElementById('currentPassword');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
        
        // Reset the form state
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
        currentPasswordInput.disabled = false;
        newPasswordInput.disabled = true;
        confirmNewPasswordInput.disabled = true;
        
        // Remove any existing validation classes
        currentPasswordInput.classList.remove('validated', 'invalid', 'valid');
        newPasswordInput.classList.remove('validated', 'invalid', 'valid');
        confirmNewPasswordInput.classList.remove('invalid', 'valid');
        
        // Add real-time validation for current password
        let currentPasswordTimeout;
        currentPasswordInput.addEventListener('input', function() {
            // Clear any existing timeout
            clearTimeout(currentPasswordTimeout);
            
            // Remove validation classes while typing
            this.classList.remove('valid', 'invalid');
            
            // Set a timeout to validate after user stops typing
            currentPasswordTimeout = setTimeout(async () => {
                if (this.value.length > 0) {
                    const isValid = await validateCurrentPassword(this.value);
                    this.classList.toggle('valid', isValid);
                    this.classList.toggle('invalid', !isValid);
                    
                    // Enable/disable new password field based on validation
                    newPasswordInput.disabled = !isValid;
                    if (isValid) {
                        this.classList.add('validated');
                        newPasswordInput.focus();
                    }
                }
            }, 500); // Wait 500ms after user stops typing
        });
        
        // Simple input handler for new password
        newPasswordInput.addEventListener('input', function() {
            // Enable confirm password field when new password has some value
                if (this.value.length > 0) {
                confirmNewPasswordInput.disabled = false;
            } else {
                confirmNewPasswordInput.disabled = true;
            }
            
            // Clear confirm password field and validation when new password changes
            confirmNewPasswordInput.value = '';
            confirmNewPasswordInput.classList.remove('valid', 'invalid');
            const confirmPasswordMessage = document.getElementById('confirmPasswordMessage');
            if (confirmPasswordMessage) {
                confirmPasswordMessage.textContent = '';
            }
        });
        
        // Add real-time validation for confirm password
        confirmNewPasswordInput.addEventListener('input', function() {
            // Remove validation classes while typing
            this.classList.remove('valid', 'invalid');
            
            if (this.value.length > 0) {
                const isMatch = this.value === newPasswordInput.value;
                this.classList.toggle('valid', isMatch);
                this.classList.toggle('invalid', !isMatch);
                
                // Show validation message
                const messageElement = document.getElementById('confirmPasswordMessage');
                if (messageElement) {
                    messageElement.textContent = isMatch ? 'Passwords match' : 'Passwords do not match';
                    messageElement.className = isMatch ? 'text-green-600 text-sm mt-1' : 'text-red-600 text-sm mt-1';
                }
            }
        });
        
        // Add click outside to close
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeChangePasswordModal();
            }
        });
        
        // Setup submit button event listener
        const submitButton = modal.querySelector('#updatePasswordBtn');
        if (submitButton) {
            submitButton.addEventListener('click', function(event) {
                event.preventDefault();
                changePassword();
            });
        }
    } else {
        console.error('Change password modal not found');
    }
}

// Function to close the change password modal
function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    }
}

// Function to change password
async function validateCurrentPassword(currentPassword) {
    const idNumber = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
    
    try {
        const response = await fetch("http://localhost:3000/validate-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idNumber: idNumber,
                currentPassword: currentPassword
            })
        });
        
        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error("Error validating password:", error);
        return false;
    }
}

function validatePasswordStrength(password) {
    // Password must be at least 8 characters long and contain at least one number and one special character
    const minLength = 8;
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (!hasNumber) {
        return { valid: false, message: "Password must contain at least one number" };
    }
    if (!hasSpecial) {
        return { valid: false, message: "Password must contain at least one special character" };
    }
    
    return { valid: true };
}

// Function to change password
async function changePassword() {
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const updateButton = document.querySelector('#updatePasswordBtn');
    
    // Disable all inputs initially
    newPasswordInput.disabled = true;
    confirmNewPasswordInput.disabled = true;
    
    // Step 1: Validate current password
    if (!currentPasswordInput.classList.contains('validated')) {
        const isCurrentPasswordValid = await validateCurrentPassword(currentPasswordInput.value);
        
        if (!isCurrentPasswordValid) {
            alert("Current password is incorrect. Please try again.");
            currentPasswordInput.value = '';
            currentPasswordInput.focus();
            return;
        }
        
        // Mark current password as validated and enable new password input
        currentPasswordInput.classList.add('validated');
        currentPasswordInput.disabled = true;
        newPasswordInput.disabled = false;
        newPasswordInput.focus();
        return;
    }
    
    // Step 2: Validate new password strength
    if (!newPasswordInput.classList.contains('validated')) {
        const passwordValidation = validatePasswordStrength(newPasswordInput.value);
        
        if (!passwordValidation.valid) {
            alert(passwordValidation.message);
            newPasswordInput.focus();
            return;
        }
        
        // Mark new password as validated
        newPasswordInput.classList.add('validated');
        return;
    }
    
    // Step 3: Validate password confirmation
    if (newPasswordInput.value !== confirmNewPasswordInput.value) {
        alert("New password and confirmation do not match.");
        confirmNewPasswordInput.value = '';
        confirmNewPasswordInput.focus();
        return;
    }
    
    // All validations passed, proceed with password change
    const idNumber = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
    
    // Show loading state
    updateButton.disabled = true;
    updateButton.textContent = 'Updating...';
    
    try {
        const response = await fetch("http://localhost:3000/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idNumber: idNumber,
                currentPassword: currentPasswordInput.value,
                newPassword: newPasswordInput.value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert("Password changed successfully!");
            closeChangePasswordModal();
        } else {
            throw new Error(data.message || "Failed to change password.");
        }
    } catch (error) {
        console.error("Error changing password:", error);
        alert(error.message || "An error occurred while changing password.");
    } finally {
        // Reset the form and button state
        updateButton.disabled = false;
        updateButton.textContent = 'Update Password';
        currentPasswordInput.classList.remove('validated');
        newPasswordInput.classList.remove('validated');
        currentPasswordInput.disabled = false;
        newPasswordInput.disabled = true;
        confirmNewPasswordInput.disabled = true;
    }
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
async function submitFeedback(sitInId) {
    try {
        const feedbackTextarea = document.querySelector(`textarea[data-sit-in-id="${sitInId}"]`);
        if (!feedbackTextarea) {
            throw new Error('Feedback textarea not found');
        }

        const comments = feedbackTextarea.value.trim();
        if (!comments) {
            alert('Please enter your feedback comments');
            return;
        }

        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        if (!userId) {
            throw new Error('User ID not found');
        }

        const response = await fetch('http://localhost:3000/submit-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                sitInId,
                comments,
                date: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit feedback');
        }

        const data = await response.json();
        if (data.success) {
            alert('Feedback submitted successfully!');
            feedbackTextarea.value = '';
        } else {
            throw new Error(data.message || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback: ' + error.message);
    }
}

// Function to generate star rating HTML
function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `
            <button class="star ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}" data-rating="${i}">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
            </button>
        `;
    }
    return stars;
}

// Function to view sit-in details
async function viewDetails(sitInId) {
    try {
        const response = await fetch(`http://localhost:3000/sit-ins/${sitInId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch sit-in details');
        }
        const sitIn = await response.json();

        // Create and show modal with sit-in details
        const modalHtml = `
            <div id="sitInDetailsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div class="mt-3 text-center">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Sit-in Details</h3>
                        <div class="mt-2 px-7 py-3">
                            <div class="text-left space-y-2">
                                <p><strong>Lab Room:</strong> ${sitIn.labRoom || 'N/A'}</p>
                                <p><strong>Date:</strong> ${new Date(sitIn.date).toLocaleDateString()}</p>
                                <p><strong>Time In:</strong> ${sitIn.timeIn || 'N/A'}</p>
                                <p><strong>Time Out:</strong> ${sitIn.timeOut || 'N/A'}</p>
                                <p><strong>Purpose:</strong> ${sitIn.purpose || 'N/A'}</p>
                                <p><strong>Programming Language:</strong> ${sitIn.programmingLanguage || 'N/A'}</p>
                                <p><strong>Status:</strong> ${sitIn.status || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="items-center px-4 py-3">
                            <button id="closeSitInDetailsModal" class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listener to close button
        document.getElementById('closeSitInDetailsModal').addEventListener('click', () => {
            document.getElementById('sitInDetailsModal').remove();
        });

        // Close modal when clicking outside
        document.getElementById('sitInDetailsModal').addEventListener('click', (e) => {
            if (e.target.id === 'sitInDetailsModal') {
                document.getElementById('sitInDetailsModal').remove();
            }
        });

    } catch (error) {
        console.error('Error viewing details:', error);
        alert('Failed to load sit-in details. Please try again.');
    }
}

// Function to load sit-in history
async function loadSitInHistory() {
    try {
        // Get user data from localStorage
        const userData = JSON.parse(localStorage.getItem('userData'));
        const userId = localStorage.getItem('currentUserId');

        if (!userData && !userId) {
            console.error('User data not found');
            window.location.href = '/login.html';
            return;
        }

        const idToUse = userData?.idNumber || userId;

        const response = await fetch('http://localhost:3000/sit-ins');
        if (!response.ok) {
            throw new Error('Failed to fetch sit-in history');
        }

        const sitIns = await response.json();
        const userSitIns = sitIns.filter(sitIn => sitIn.idNumber === idToUse);

        const tableBody = document.getElementById('sitInTableBody');
        tableBody.innerHTML = '';

        if (userSitIns.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No sit-in history found</td></tr>';
            return;
        }

        // Create main table for sit-in details
        userSitIns.forEach(sitIn => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            
            // Format date and time
            const dateTime = new Date(sitIn.date);
            const formattedDate = dateTime.toLocaleDateString();
            const formattedTime = dateTime.toLocaleTimeString();

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${sitIn.labRoom || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${formattedDate} ${formattedTime}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${sitIn.duration || '1 hour'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${sitIn.programmingLanguage || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        ${sitIn.status || 'N/A'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <button onclick="viewDetails('${sitIn._id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        View Details
                    </button>
                </td>
            `;
            tableBody.appendChild(row);

            // Create feedback section for this sit-in
            const feedbackRow = document.createElement('tr');
            feedbackRow.className = 'bg-gray-50 dark:bg-gray-800';
            
            // Create star rating HTML
            const starRating = sitIn.rating ? generateStarRating(sitIn.rating) : generateStarRating(0);

            feedbackRow.innerHTML = `
                <td colspan="6" class="px-6 py-4">
                    <div class="space-y-4">
                        <h4 class="font-medium text-gray-900 dark:text-gray-100">Feedback</h4>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                            <div class="flex items-center space-x-1" data-sit-in-id="${sitIn._id}">
                                ${starRating}
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-sm text-gray-600 dark:text-gray-400">Comments:</label>
                            <div class="flex items-center space-x-2">
                                <textarea 
                                    class="w-full px-2 py-1 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" 
                                    rows="2" 
                                    placeholder="Add your comments..."
                                    data-sit-in-id="${sitIn._id}"
                                >${sitIn.comments || ''}</textarea>
                                <button 
                                    onclick="submitFeedback('${sitIn._id}')" 
                                    class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </td>
            `;
            tableBody.appendChild(feedbackRow);

            // Add event listeners for star rating
            const stars = feedbackRow.querySelectorAll('.star');
            stars.forEach((star, index) => {
                star.addEventListener('click', () => updateRating(sitIn._id, index + 1));
            });
        });
    } catch (error) {
        console.error('Error loading sit-in history:', error);
        const tableBody = document.getElementById('sitInTableBody');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-600">Error loading sit-in history</td></tr>';
    }
}

// Function to update rating
async function updateRating(sitInId, rating) {
    try {
        const response = await fetch(`http://localhost:3000/update-sit-in-rating`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sitInId,
                rating
            })
        });

        if (response.status === 404) {
            throw new Error('Rating update service is currently unavailable');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update rating');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update rating');
        }

        // Update the star rating display immediately
        const starsContainer = document.querySelector(`div[data-sit-in-id="${sitInId}"]`);
        if (starsContainer) {
            starsContainer.innerHTML = generateStarRating(rating);
            // Reattach event listeners to stars
            const stars = starsContainer.querySelectorAll('.star');
            stars.forEach((star, index) => {
                star.addEventListener('click', () => updateRating(sitInId, index + 1));
            });
        }

    } catch (error) {
        console.error('Error updating rating:', error);
        alert(error.message);
    }
}

// Function to update the setupHistoryTabs function to include authentication check
function setupHistoryTabs() {
    if (!checkAuthentication()) return;
    
    const sitInHistoryTab = document.getElementById('sitInHistoryTab');
    const reservationHistoryTab = document.getElementById('reservationHistoryTab');
    const sitInHistoryContent = document.getElementById('sitInHistoryContent');
    const reservationHistoryContent = document.getElementById('reservationHistoryContent');

    sitInHistoryTab.addEventListener('click', () => {
        sitInHistoryTab.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        reservationHistoryTab.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
        sitInHistoryContent.classList.remove('hidden');
        reservationHistoryContent.classList.add('hidden');
        loadSitInHistory();
    });

    reservationHistoryTab.addEventListener('click', () => {
        reservationHistoryTab.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        sitInHistoryTab.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
        reservationHistoryContent.classList.remove('hidden');
        sitInHistoryContent.classList.add('hidden');
        loadReservationHistory();
    });
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
        const date = document.getElementById("date").value;
        const time = document.getElementById("time").value;
        const labRoom = document.getElementById("labRoom").value;
        const programmingLanguage = document.getElementById("programmingLanguage").value;
        
        // Get user ID from localStorage or URL
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        if (!userId) {
            alert("Please log in first");
            window.location.href = '/login.html';
            return;
        }

        if (!date || !time || !labRoom || !programmingLanguage) {
            alert("Please fill in all fields: lab room, programming language, date, and time.");
            return;
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

        // Get user profile data
        const userResponse = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user data: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        if (!userData || !userData.email || !userData.idNumber) {
            throw new Error("Invalid user data received from server");
        }

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
                purpose: "Programming Session", // Default purpose
                date, 
                time,
                labRoom,
                programmingLanguage
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
    }
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

// Function to handle quick session reservation
async function quickReserveSession() {
    try {
        const labRoom = document.getElementById("quickLabRoom").value;
        const programmingLanguage = document.getElementById("quickProgrammingLanguage").value;
        const date = document.getElementById("quickDate").value;
        const time = document.getElementById("quickTime").value;

        if (!labRoom || !programmingLanguage || !date || !time) {
            alert("Please fill in all fields (Lab Room, Programming Language, Date, and Time)");
            return;
        }

        // Get user ID from localStorage or URL
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        if (!userId) {
            alert("Please log in first");
            window.location.href = '/login.html';
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

        // Create the reservation
        const response = await fetch('http://localhost:3000/reserve', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                email: userData.email,
                idNumber: userData.idNumber,
                purpose: "Programming Session", // Default purpose
                labRoom,
                programmingLanguage,
                date, 
                time 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to make reservation');
        }

        const data = await response.json();
        alert("Reservation successful!");
        
        // Close the modal
        const modal = document.getElementById('quickReserveModal');
        modal.style.display = 'none';
        
        // Reset form
        document.getElementById("quickReservationForm").reset();
        
        // Update dashboard stats
        updateDashboardStats(userId);
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || "Failed to make reservation. Please try again.");
    }
}

// Function to open quick reserve modal
window.openQuickReserveModal = function() {
    console.log('Opening quick reserve modal...'); // Debug log
    const modal = document.getElementById('quickReserveModal');
    if (modal) {
        modal.style.display = 'block';
        // Add opacity transition
        setTimeout(() => {
            modal.classList.remove('hidden', 'opacity-0');
            modal.classList.add('opacity-100');
        }, 10);
        document.body.style.overflow = 'hidden';
    }
}

// Function to close quick reserve modal
window.closeQuickReserveModal = function() {
    console.log('Closing quick reserve modal...'); // Debug log
    const modal = document.getElementById('quickReserveModal');
    if (modal) {
        // Add fade out transition
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
        const form = document.getElementById('quickReservationForm');
        if (form) {
            form.reset();
        }
    }
}

// Function to open lab rules modal
window.openLabRulesModal = function() {
    console.log('Opening lab rules modal...'); // Debug log
    const modal = document.getElementById('labRulesModal');
    if (modal) {
        modal.style.display = 'block';
        // Add opacity transition
        setTimeout(() => {
            modal.classList.remove('hidden', 'opacity-0');
            modal.classList.add('opacity-100');
        }, 10);
        document.body.style.overflow = 'hidden';
    }
}

// Function to close lab rules modal
window.closeLabRulesModal = function() {
    console.log('Closing lab rules modal...'); // Debug log
    const modal = document.getElementById('labRulesModal');
    if (modal) {
        // Add fade out transition
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }
}

// Function to open announcements modal
window.openAnnouncementsModal = function() {
    console.log('Opening announcements modal...'); // Debug log
    const modal = document.getElementById('announcementsModal');
    if (modal) {
        modal.style.display = 'block';
        // Add opacity transition
        setTimeout(() => {
            modal.classList.remove('hidden', 'opacity-0');
            modal.classList.add('opacity-100');
        }, 10);
        document.body.style.overflow = 'hidden';
        loadAnnouncementsIntoModal();
    }
}

// Function to close announcements modal
window.closeAnnouncementsModal = function() {
    console.log('Closing announcements modal...'); // Debug log
    const modal = document.getElementById('announcementsModal');
    if (modal) {
        // Add fade out transition
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }
}

// Function to load announcements into the modal
async function loadAnnouncementsIntoModal() {
    try {
        const response = await fetch("http://localhost:3000/get-announcements");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const announcements = Array.isArray(data) ? data : [];
        
        const modalContent = document.getElementById('announcementsModalContent');
        modalContent.innerHTML = '';

        if (announcements.length === 0) {
            modalContent.innerHTML = '<p class="text-gray-500">No announcements yet.</p>';
            return;
        }

        announcements.forEach(announcement => {
            const announcementElement = document.createElement('div');
            announcementElement.className = 'p-4 bg-white rounded-lg shadow mb-4';
            announcementElement.innerHTML = `
                <p class="text-blue-600 font-medium mb-1">CCS | Admin</p>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">${announcement.title}</h3>
                <p class="text-gray-600 mb-2">${announcement.message}</p>
                <p class="text-sm text-gray-500">${new Date(announcement.date).toLocaleString()}</p>
            `;
            modalContent.appendChild(announcementElement);
        });
    } catch (error) {
        console.error("Error loading announcements:", error);
        const modalContent = document.getElementById('announcementsModalContent');
        modalContent.innerHTML = '<p class="text-red-500">Error loading announcements.</p>';
    }
}

// Function to open settings modal
window.openSettingsModal = function() {
    console.log('Opening settings modal...'); // Debug log
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'block';
        // Add opacity transition
        setTimeout(() => {
            modal.classList.remove('hidden', 'opacity-0');
            modal.classList.add('opacity-100');
        }, 10);
        document.body.style.overflow = 'hidden';
    }
}

// Function to close settings modal
window.closeSettingsModal = function() {
    console.log('Closing settings modal...'); // Debug log
    const modal = document.getElementById('settingsModal');
    if (modal) {
        // Add fade out transition
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }
}

// Function to setup modal event listeners
function setupModalEventListeners() {
    console.log('Setting up modal event listeners...'); // Debug log
    
    // Add event listener for ESC key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            window.closeQuickReserveModal();
            window.closeLabRulesModal();
            window.closeAnnouncementsModal();
            window.closeSettingsModal();
            closeChangePasswordModal();
        }
    });

    // Setup Quick Reserve Modal
    const reserveModal = document.getElementById('quickReserveModal');
    const reserveModalContent = reserveModal ? reserveModal.querySelector('.relative') : null;

    if (reserveModal && reserveModalContent) {
        reserveModal.addEventListener('click', function(event) {
            if (event.target === reserveModal) {
                window.closeQuickReserveModal();
            }
        });

        reserveModalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }

    // Setup Lab Rules Modal
    const labRulesModal = document.getElementById('labRulesModal');
    const labRulesModalContent = labRulesModal ? labRulesModal.querySelector('.relative') : null;

    if (labRulesModal && labRulesModalContent) {
        labRulesModal.addEventListener('click', function(event) {
            if (event.target === labRulesModal) {
                window.closeLabRulesModal();
            }
        });

        labRulesModalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }

    // Setup Announcements Modal
    const announcementsModal = document.getElementById('announcementsModal');
    const announcementsModalContent = announcementsModal ? announcementsModal.querySelector('.relative') : null;

    if (announcementsModal && announcementsModalContent) {
        announcementsModal.addEventListener('click', function(event) {
            if (event.target === announcementsModal) {
                window.closeAnnouncementsModal();
            }
        });

        announcementsModalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }

    // Setup Settings Modal
    const settingsModal = document.getElementById('settingsModal');
    const settingsModalContent = settingsModal ? settingsModal.querySelector('.relative') : null;

    if (settingsModal && settingsModalContent) {
        settingsModal.addEventListener('click', function(event) {
            if (event.target === settingsModal) {
                window.closeSettingsModal();
            }
        });

        settingsModalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }

    // Setup Change Password Button
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function(event) {
            event.preventDefault();
            openChangePasswordModal();
        });
    }

    // Setup Change Password Submit Button
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', function(event) {
            event.preventDefault();
            changePassword();
        });
    }

    // Debug check for modal elements
    console.log('Modal elements check:', {
        quickReserveModal: !!reserveModal,
        labRulesModal: !!labRulesModal,
        announcementsModal: !!announcementsModal,
        settingsModal: !!settingsModal
    });
}

// Function to initialize dark mode
function initializeDarkMode() {
    // Check if user has a saved preference
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    
    // Get the toggle button and its span
    const darkModeToggle = document.querySelector('[role="switch"]');
    const toggleSpan = darkModeToggle?.querySelector('span.inline-block');
    
    if (darkModeEnabled) {
        document.documentElement.classList.add('dark');
        if (darkModeToggle) {
            darkModeToggle.classList.remove('bg-gray-200');
            darkModeToggle.classList.add('bg-blue-600');
        }
        if (toggleSpan) {
            toggleSpan.classList.remove('translate-x-1');
            toggleSpan.classList.add('translate-x-6');
        }
    }

    // Add click event listener to the dark mode toggle
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            const isDarkMode = document.documentElement.classList.toggle('dark');
            localStorage.setItem('darkMode', isDarkMode);
            
            // Toggle the switch appearance
            this.classList.toggle('bg-gray-200');
            this.classList.toggle('bg-blue-600');
            
            const toggleSpan = this.querySelector('span.inline-block');
            if (toggleSpan) {
                toggleSpan.classList.toggle('translate-x-1');
                toggleSpan.classList.toggle('translate-x-6');
            }
        });
    }
}

// Function to initialize notification settings
function initializeNotificationSettings() {
    // Get toggle buttons
    const emailToggle = document.querySelector('[aria-label="Enable email notifications"]')?.closest('button');
    const browserToggle = document.querySelector('[aria-label="Enable browser notifications"]')?.closest('button');
    
    if (emailToggle) {
        // Initialize email notifications state
        const emailEnabled = localStorage.getItem('emailNotifications') === 'true';
        updateToggleState(emailToggle, emailEnabled);
        
        // Add click event listener
        emailToggle.addEventListener('click', function() {
            const isEnabled = toggleNotification(this);
            localStorage.setItem('emailNotifications', isEnabled);
        });
    }
    
    if (browserToggle) {
        // Initialize browser notifications state
        const browserEnabled = localStorage.getItem('browserNotifications') === 'true';
        updateToggleState(browserToggle, browserEnabled);
        
        // Add click event listener
        browserToggle.addEventListener('click', function() {
            const isEnabled = toggleNotification(this);
            localStorage.setItem('browserNotifications', isEnabled);
        });
    }
}

// Function to toggle notification state
function toggleNotification(toggleButton) {
    const isCurrentlyEnabled = toggleButton.classList.contains('bg-blue-600');
    const toggleSpan = toggleButton.querySelector('span.inline-block');
    
    if (isCurrentlyEnabled) {
        toggleButton.classList.remove('bg-blue-600');
        toggleButton.classList.add('bg-gray-200');
        if (toggleSpan) {
            toggleSpan.classList.remove('translate-x-6');
            toggleSpan.classList.add('translate-x-1');
        }
    } else {
        toggleButton.classList.remove('bg-gray-200');
        toggleButton.classList.add('bg-blue-600');
        if (toggleSpan) {
            toggleSpan.classList.remove('translate-x-1');
            toggleSpan.classList.add('translate-x-6');
        }
    }
    
    return !isCurrentlyEnabled;
}

// Function to update toggle state
function updateToggleState(toggleButton, isEnabled) {
    const toggleSpan = toggleButton.querySelector('span.inline-block');
    
    if (isEnabled) {
        toggleButton.classList.remove('bg-gray-200');
        toggleButton.classList.add('bg-blue-600');
        if (toggleSpan) {
            toggleSpan.classList.remove('translate-x-1');
            toggleSpan.classList.add('translate-x-6');
        }
    } else {
        toggleButton.classList.remove('bg-blue-600');
        toggleButton.classList.add('bg-gray-200');
        if (toggleSpan) {
            toggleSpan.classList.remove('translate-x-6');
            toggleSpan.classList.add('translate-x-1');
        }
    }
}

// Profile Modal Functions
async function showProfileModal() {
    const modal = document.getElementById('profileModal');
    const modalContent = document.getElementById('profileModalContent');

    try {
        // Get user ID
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        
        // Fetch profile data from server
        const response = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!response.ok) throw new Error(`Failed to fetch profile data: ${response.status}`);
        
        const profileData = await response.json();

        // Update form fields with profile data
        document.getElementById('idNumberModal').value = profileData.idNumber || '';
        document.getElementById('emailModal').value = profileData.email || '';
        document.getElementById('firstnameModal').value = profileData.firstName || '';
        document.getElementById('middlenameModal').value = profileData.middleName || '';
        document.getElementById('lastnameModal').value = profileData.lastName || '';
        document.getElementById('yearModal').value = profileData.year || '1st Year';
        document.getElementById('courseModal').value = profileData.course || 'BS Computer Science';
        document.getElementById('oldIdNumberModal').value = profileData.idNumber || '';

        // Update profile picture
        const profilePic = localStorage.getItem('profilePicture') || profileData.profilePicture || '/uploads/default-profile.png';
        document.getElementById('profilePicModal').src = profilePic;

        // Show remaining sessions
        document.getElementById('remainingSessionsModal').textContent = profileData.remainingSessions || '10';

        // Add event listener for change password button
        const changePasswordButton = document.querySelector('[onclick="openChangePasswordModal()"]');
        if (changePasswordButton) {
            changePasswordButton.addEventListener('click', function(event) {
                event.preventDefault();
                openChangePasswordModal();
            });
        }

        // Save data to localStorage for persistence
        localStorage.setItem('profileData', JSON.stringify({
            idNumber: profileData.idNumber,
            email: profileData.email,
            firstname: profileData.firstName,
            middlename: profileData.middleName,
            lastname: profileData.lastName,
            year: profileData.year,
            course: profileData.course
        }));

    } catch (error) {
        console.error('Error loading profile data:', error);
        // Fallback to localStorage if server fetch fails
        const savedData = JSON.parse(localStorage.getItem('profileData')) || {};
        
        document.getElementById('idNumberModal').value = savedData.idNumber || '';
        document.getElementById('emailModal').value = savedData.email || '';
        document.getElementById('firstnameModal').value = savedData.firstname || '';
        document.getElementById('middlenameModal').value = savedData.middlename || '';
        document.getElementById('lastnameModal').value = savedData.lastname || '';
        document.getElementById('yearModal').value = savedData.year || '1st Year';
        document.getElementById('courseModal').value = savedData.course || 'BS Computer Science';
        document.getElementById('oldIdNumberModal').value = savedData.idNumber || '';
    }

    // Show the modal with animation
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 50);
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    const modalContent = document.getElementById('profileModalContent');

    // Hide with animation
    modal.classList.remove('opacity-100');
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function loadProfileData() {
    // Get data from localStorage
    const firstName = localStorage.getItem('firstName') || '';
    const lastName = localStorage.getItem('lastName') || '';
    const course = localStorage.getItem('course') || '';
    const email = localStorage.getItem('email') || '';
    const middleName = localStorage.getItem('middleName') || '';
    const year = localStorage.getItem('year') || '1st Year';
    const idNumber = localStorage.getItem('idNumber') || '';
    const profilePic = localStorage.getItem('profilePicture');

    // Update main profile form
    document.getElementById('firstname').value = firstName;
    document.getElementById('lastname').value = lastName;
    document.getElementById('course').value = course;
    document.getElementById('email').value = email;
    document.getElementById('middlename').value = middleName;
    document.getElementById('year').value = year;
    document.getElementById('idNumber').value = idNumber;
    document.getElementById('oldIdNumber').value = idNumber;

    // Update modal form
    document.getElementById('firstnameModal').value = firstName;
    document.getElementById('lastnameModal').value = lastName;
    document.getElementById('courseModal').value = course;
    document.getElementById('emailModal').value = email;
    document.getElementById('middlenameModal').value = middleName;
    document.getElementById('yearModal').value = year;
    document.getElementById('idNumberModal').value = idNumber;
    document.getElementById('oldIdNumberModal').value = idNumber;

    // Update profile pictures if exists
    if (profilePic) {
        document.getElementById('sidebarProfilePic').src = profilePic;
        document.getElementById('profilePic').src = profilePic;
        document.getElementById('profilePicModal').src = profilePic;
    }

    // Update sidebar profile
    updateSidebarProfile();
}

// Add keyboard event listener for Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeProfileModal();
    }
});

// Add these styles to your CSS
const style = document.createElement('style');
style.textContent = `
    .valid {
        border-color: #10B981 !important;
        background-color: #F0FDF4 !important;
    }
    .invalid {
        border-color: #EF4444 !important;
        background-color: #FEF2F2 !important;
    }
    .validated {
        pointer-events: none;
        opacity: 0.7;
    }
`;
document.head.appendChild(style);

// Function to open recent activity modal
window.openRecentActivityModal = function() {
    const modal = document.getElementById('recentActivityModal');
    if (modal) {
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.remove('hidden', 'opacity-0');
            modal.classList.add('opacity-100');
        }, 10);
        document.body.style.overflow = 'hidden';
        loadRecentActivityIntoModal();
    }
}

// Function to close recent activity modal
window.closeRecentActivityModal = function() {
    const modal = document.getElementById('recentActivityModal');
    if (modal) {
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }
}

// Function to load recent activity into modal
async function loadRecentActivityIntoModal() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!userId) {
            throw new Error('User ID not found');
        }

        const response = await fetch(`http://localhost:3000/get-recent-activity/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch recent activity');
        }

        const activities = await response.json();
        const modalContent = document.getElementById('recentActivityModalContent');
        modalContent.innerHTML = '';

        if (activities.length === 0) {
            modalContent.innerHTML = '<p class="text-gray-500 text-center">No recent activity found.</p>';
            return;
        }

        activities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'p-4 bg-white rounded-lg shadow-md mb-4 dark:bg-gray-800';
            const formattedDate = new Date(activity.date).toLocaleString();
            activityElement.innerHTML = `
                <div class="flex items-center">
                    <div class="p-2 rounded-full bg-blue-100 mr-3 dark:bg-blue-900">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800 dark:text-gray-200">${activity.type}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${formattedDate}</p>
                    </div>
                </div>
            `;
            modalContent.appendChild(activityElement);
        });
    } catch (error) {
        console.error('Error loading recent activity:', error);
        const modalContent = document.getElementById('recentActivityModalContent');
        modalContent.innerHTML = '<p class="text-red-500 text-center">Error loading recent activity.</p>';
    }
} 