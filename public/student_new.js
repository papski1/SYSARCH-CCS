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
    
    // Set up periodic checks for new announcements
    setInterval(checkNewAnnouncements, 30000);
    
    // Load initial data based on active section
    loadInitialData();

    // Setup modal event listeners
    setupModalEventListeners();

    // Debug check for modal elements
    const modal = document.getElementById('quickReserveModal');
    const reserveButton = document.querySelector('button[onclick="openQuickReserveModal()"]');
    const changePasswordModal = document.getElementById('changePasswordModal');
    console.log('Modal elements check:', {
        modalExists: !!modal,
        reserveButtonExists: !!reserveButton,
        changePasswordModalExists: !!changePasswordModal
    });

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
        // Get the current user ID
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        
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
        
        // Set select fields if they exist
        const yearFields = ['year', 'yearModal'];
        yearFields.forEach(fieldId => {
            const select = document.getElementById(fieldId);
            if (select && profileData.year) {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === profileData.year) {
                        select.selectedIndex = i;
                        break;
                    }
                }
            }
        });
        
        const courseFields = ['course', 'courseModal'];
        courseFields.forEach(fieldId => {
            const select = document.getElementById(fieldId);
            if (select && profileData.course) {
                let found = false;
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === profileData.course) {
                        select.selectedIndex = i;
                        found = true;
                        break;
                    }
                }
                
                // If course is not in options, select "Other"
                if (!found && profileData.course) {
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === "Other") {
                            select.selectedIndex = i;
                            break;
                        }
                    }
                }
            }
        });

        // Update profile picture if it exists
        const storedImagePath = localStorage.getItem("profileImagePath");
        const profilePicUrl = storedImagePath || profileData.profilePicture || '/uploads/default-profile.png';
        
        // Update sidebar profile picture
        document.getElementById("sidebarProfilePic").src = profilePicUrl;

        // Save to localStorage for persistence
        localStorage.setItem('profileData', JSON.stringify(profileData));

        // Update sidebar profile
        updateSidebarProfile();

    } catch (error) {
        console.error("Error loading profile:", error);
        // Try to load from localStorage if server request fails
        const storedData = localStorage.getItem('profileData');
        if (storedData) {
            const profileData = JSON.parse(storedData);
            updateBothForms(profileData);
            updateSidebarProfile();
        }
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
                
                // Update profile picture if exists
                if (data.profilePicture) {
                    document.getElementById('sidebarProfilePic').src = data.profilePicture;
                }
            }
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            // Load from localStorage as fallback
            const savedName = localStorage.getItem('profileName');
            const savedCourse = localStorage.getItem('profileCourse');
            
            if (savedName) document.getElementById('sidebarProfileName').textContent = savedName;
            if (savedCourse) document.getElementById('sidebarProfileCourse').textContent = savedCourse;
        });
    
    // Load profile picture from localStorage if exists
    const savedProfilePic = localStorage.getItem('profilePicture');
    if (savedProfilePic) {
        document.getElementById('sidebarProfilePic').src = savedProfilePic;
    }
    
    // Initialize other settings
    initializeDarkMode();
    initializeNotificationSettings();
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

// Function to handle quick session reservation
async function quickReserveSession() {
    try {
        const purpose = document.getElementById("quickPurpose").value.trim();
        const date = document.getElementById("quickDate").value;
        const time = document.getElementById("quickTime").value;
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
        const submitButton = document.querySelector('#quickReservationForm button');
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
            document.getElementById("quickReservationForm").reset();
            
            // Refresh dashboard data
            loadDashboardData();
            
            // Also refresh reservation history if that tab is open
            const reservationHistorySection = document.getElementById("reservation-history");
            if (reservationHistorySection && !reservationHistorySection.classList.contains("hidden")) {
                await loadReservationHistory();
            }
        } else {
            throw new Error(result.message || 'Failed to make reservation');
        }
    } catch (error) {
        console.error("Error making reservation:", error);
        alert(`Failed to make reservation: ${error.message}`);
    } finally {
        // Restore button state
        const submitButton = document.querySelector('#quickReservationForm button');
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
    const contentDiv = document.getElementById('announcementsModalContent');
    if (!contentDiv) return;

    try {
        const response = await fetch('http://localhost:3000/get-announcements');
        if (!response.ok) throw new Error('Failed to fetch announcements');
        
        const announcements = await response.json();
        
        if (announcements.length === 0) {
            contentDiv.innerHTML = '<p class="text-gray-500 text-center">No announcements available.</p>';
            return;
        }

        // Sort announcements by date (newest first)
        announcements.sort((a, b) => new Date(b.date) - new Date(a.date));

        const announcementsHTML = announcements.map(announcement => `
            <div class="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
                <div class="flex justify-between items-start">
                    <h4 class="text-lg font-semibold text-gray-900">${announcement.title || 'Announcement'}</h4>
                    <span class="text-sm text-gray-500">${new Date(announcement.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                <p class="mt-2 text-gray-700">${announcement.message}</p>
            </div>
        `).join('');

        contentDiv.innerHTML = announcementsHTML;
        
        // Update last seen timestamp
        localStorage.setItem("lastSeenAnnouncement", new Date().getTime().toString());
        
        // Clear notification dot if present
        clearAnnouncementNotification();
    } catch (error) {
        console.error('Error loading announcements:', error);
        contentDiv.innerHTML = '<p class="text-red-500 text-center">Failed to load announcements. Please try again later.</p>';
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