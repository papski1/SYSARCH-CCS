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
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
}

// Function to show a specific section
async function showSection(sectionId) {
    hideAllSections();
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
        // Save the active section to localStorage
        localStorage.setItem("activeSection", sectionId);
        
        // Load data based on section
        if (sectionId === 'reserve-session') {
            initializeCalendar();
        } else if (sectionId === 'dashboard') {
            loadDashboardData();
        } else if (sectionId === 'sit-in-history') {
            // Update the section title to show "Reservation History" instead of "Sit-in History"
            const sectionTitle = section.querySelector('h2');
            if (sectionTitle) {
                sectionTitle.textContent = 'Reservation History';
            }
            
            // Call setupHistoryTabs to ensure the reservation tab is selected
            setupHistoryTabs();
        } else if (sectionId === 'profile') {
            // When profile section is shown, update profile data
            await updateProfileDisplay();
        }
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
    
    // Update the navigation link text from "Sit-in History" to "Reservation History"
    const historyNavLink = document.querySelector('a[href="#sit-in-history"]');
    if (historyNavLink) {
        // Find the text node within the link (it's usually the last child)
        for (let i = 0; i < historyNavLink.childNodes.length; i++) {
            const node = historyNavLink.childNodes[i];
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === 'Sit-in History') {
                node.textContent = 'Reservation History';
                break;
            }
        }
    }
    
    // Setup navigation
    setupNavigation();
    
    // Remove any existing sessions counter that might have been previously added
    const existingCounter = document.getElementById('nav-sessions-counter');
    if (existingCounter) {
        existingCounter.remove();
    }
    
    // Setup history tabs
    setupHistoryTabs();
    
    // Setup lab rules toggle
    setupLabRulesToggle();
    
    // Setup reservation form
    setupReservationForm();
    
    // Initialize calendar
    initializeCalendar();
    
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
    
    // Set up profile picture upload handler
    const uploadProfilePicInput = document.getElementById('uploadProfilePic');
    if (uploadProfilePicInput) {
        uploadProfilePicInput.addEventListener('change', function() {
            updateProfilePicture(this);
        });
    }
});

// Function to load initial data based on active section
function loadInitialData() {
    // Get active section from localStorage or default to dashboard
    const activeSection = localStorage.getItem("activeSection") || "dashboard";
    
    // Show the active section
    showSection(activeSection);
}

// Function to setup navigation
function setupNavigation() {
    // Add click event listeners to navigation links
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener("click", function(event) {
            event.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            showSection(targetId);
        });
    });
    
    // Remove the sessions counter from nav
    // addSessionsCounterToNav(); - This line is removed
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
        
        // Update remaining sessions count everywhere
        const remainingSessions = userData.remainingSessions || 0;
        const remainingSessionsElements = document.querySelectorAll('.remaining-sessions');
        remainingSessionsElements.forEach(element => {
            element.textContent = remainingSessions;
        });

        // Add a sessions warning if needed
        updateSessionsWarning(remainingSessions);

        // Store the remaining sessions count in localStorage for persistence
        localStorage.setItem('remainingSessions', remainingSessions);
        
    } catch (error) {
        console.error("Error updating dashboard stats:", error);
        // If there's an error, try to use the cached value from localStorage
        const cachedRemainingSessions = localStorage.getItem('remainingSessions') || '30';
        const remainingSessionsElements = document.querySelectorAll('.remaining-sessions');
        remainingSessionsElements.forEach(element => {
            element.textContent = cachedRemainingSessions;
        });
    }
}

// Function to update sessions warning
function updateSessionsWarning(remainingSessions) {
    // Remove any existing warning
    const existingWarning = document.getElementById('sessions-warning');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    // Only add warning if sessions are low
    if (remainingSessions <= 5) {
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            const warningElement = document.createElement('div');
            warningElement.id = 'sessions-warning';
            warningElement.className = remainingSessions === 0 
                ? 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-md dark:bg-red-900/30 dark:text-red-300'
                : 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded shadow-md dark:bg-yellow-900/30 dark:text-yellow-300';
            
            const message = remainingSessions === 0
                ? 'You have no remaining sessions. Please contact the administrator to reset your sessions.'
                : `You only have ${remainingSessions} ${remainingSessions === 1 ? 'session' : 'sessions'} remaining.`;
            
            warningElement.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p>${message}</p>
                    </div>
                </div>
            `;
            
            // Insert after the stats cards
            const statCards = dashboardSection.querySelector('.grid');
            if (statCards) {
                statCards.parentNode.insertBefore(warningElement, statCards.nextSibling);
            } else {
                dashboardSection.appendChild(warningElement);
            }
        }
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

        // Fetch active sessions for this user (both walk-ins and reservations)
        try {
            const [sitInsResponse, reservationsResponse] = await Promise.all([
                fetch(`http://localhost:3000/sit-ins`),
                fetch(`http://localhost:3000/reservations`)
            ]);

            if (!sitInsResponse.ok || !reservationsResponse.ok) {
                throw new Error('Failed to fetch session data');
            }

            const sitIns = await sitInsResponse.json();
            const reservations = await reservationsResponse.json();
            
            // Find active sessions for this user
            const activeSitIn = sitIns.find(s => s.idNumber === userId && s.status === 'active');
            const activeReservation = reservations.find(r => r.idNumber === userId && r.status === 'active');
            
            // Current active session can be either a sit-in or reservation
            const currentActiveSession = activeSitIn || activeReservation;
            
            console.log('Current active session:', currentActiveSession);
            
            // Update last session display
            const lastSessionElement = document.getElementById('lastSession');
            if (lastSessionElement) {
                if (currentActiveSession) {
                    // Format date for display
                    const date = new Date(currentActiveSession.date);
                    const formattedDate = date.toLocaleDateString();
                    
                    // Get session type
                    const sessionType = activeSitIn ? 'Walk-in' : 'Reservation';
                    
                    // Update display
                    lastSessionElement.innerHTML = `
                        <span class="text-green-600 font-medium">Active: ${sessionType}</span>
                        <br>
                        <span class="text-sm font-normal">${formattedDate}</span>
                    `;
                    
                    lastSessionElement.parentElement.parentElement.parentElement.classList.add('bg-green-50');
                    lastSessionElement.parentElement.parentElement.parentElement.classList.add('border-green-500');
                } else {
                    // No active session, find most recent completed session
                    const completedSessions = [
                        ...sitIns.filter(s => s.idNumber === userId && s.status === 'completed'),
                        ...reservations.filter(r => r.idNumber === userId && r.status === 'completed')
                    ];
                    
                    if (completedSessions.length > 0) {
                        // Sort by date (most recent first)
                        completedSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
                        const lastSession = completedSessions[0];
                        
                        // Format date for display
                        const date = new Date(lastSession.date);
                        const formattedDate = date.toLocaleDateString();
                        
                        lastSessionElement.textContent = formattedDate;
                    } else {
                        lastSessionElement.textContent = 'No sessions yet';
                    }
                    
                    // Reset any special styling
                    lastSessionElement.parentElement.parentElement.parentElement.classList.remove('bg-green-50');
                }
            }
        } catch (error) {
            console.error('Error fetching session data:', error);
        }

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

// Function to handle profile photo upload
function updateProfilePicture(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        
        if (!userId) {
            alert("User ID not found. Please try logging in again.");
            return;
        }

        // Get file details
        const file = input.files[0];
        console.log("File selected:", file.name, "Type:", file.type, "Size:", file.size);
        
        // Validate file type - only allow PNG, JPG, or JPEG
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validImageTypes.includes(file.type)) {
            alert("Please select a valid image file (PNG, JPG, or JPEG only)");
            return;
        }
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Maximum size is 5MB");
            return;
        }

        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'profileUploadLoading';
        loadingIndicator.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        loadingIndicator.innerHTML = '<div class="bg-white p-4 rounded-md shadow-md"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-2"></div><p class="text-center">Uploading profile photo...</p></div>';
        document.body.appendChild(loadingIndicator);

        reader.onload = function(e) {
            // Show preview immediately using the DataURL result from FileReader
            const previewUrl = e.target.result; // This is a data URL representation of the image
            console.log("Setting preview with data URL");
            directUpdateAllProfileImages(previewUrl);

            // Create FormData for upload
            const formData = new FormData();
            formData.append("profileImage", file); // Send the actual file
            formData.append("userId", userId);
            
            // Upload to server
            fetch("http://localhost:3000/upload-profile", {
                method: "POST",
                body: formData
            })
            .then(response => {
                console.log("Upload response status:", response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Upload response data:", data);
                
                if (data.success) {
                    // Extract the image path from the response
                    let imagePath = data.imagePath || data.path || data.profileImage || data.image || data.url;
                    console.log("Server returned image path:", imagePath);
                    
                    // If image path is empty or null, use the data URL preview instead
                    if (!imagePath) {
                        console.warn("Server did not return a valid image path, using data URL instead");
                        // Just keep using the preview - don't throw an error
                        
                        // Update localStorage with the data URL for persistence
                        localStorage.setItem("profileImagePath", previewUrl);
                        
                        // Remove loading indicator
                        const loadingElement = document.getElementById('profileUploadLoading');
                        if (loadingElement) loadingElement.remove();
                        
                        alert("Profile picture updated successfully (local only)!");
                        return;
                    }
                    
                    // Make sure the path is absolute and not just a filename
                    if (imagePath && !imagePath.includes('://') && !imagePath.startsWith('/')) {
                        imagePath = '/uploads/' + imagePath;
                    }
                    
                    // Create full URL to the image with a random timestamp to prevent caching
                    const randomTimestamp = new Date().getTime() + Math.floor(Math.random() * 10000);
                    const imageUrl = imagePath.startsWith('http') 
                        ? `${imagePath}?t=${randomTimestamp}`
                        : `http://localhost:3000${imagePath.startsWith('/') ? '' : '/'}${imagePath}?t=${randomTimestamp}`;
                    
                    console.log("Full image URL with timestamp:", imageUrl);
                    
                    // Store the path in localStorage
                    localStorage.setItem("profileImagePath", imagePath);
                    
                    // Force the browser to pre-load the image before updating the UI
                    const tempImg = new Image();
                    tempImg.onload = function() {
                        console.log("Image preloaded successfully, updating UI");
                        // Now update all profile images with the new URL since we know it loads
                        directUpdateAllProfileImages(imageUrl);
                        
                        try {
                            // Update the database with the new image path
                            // This is now wrapped in try-catch to ensure the success message still appears
                            // even if the database update fails
                            updateProfileImageInDatabase(userId, imagePath);
                        } catch (err) {
                            console.error("Error when updating profile image in database:", err);
                            // Even if database update fails, we still show success since the image is shown locally
                        }
                        
                        // Show success message
                        alert("Profile picture updated successfully!");
                    };
                    
                    tempImg.onerror = function() {
                        console.error("Failed to load the uploaded image, keeping preview");
                        // Keep using the data URL preview since the server image failed to load
                        
                        try {
                            // Still update the database with the path in case it becomes available later
                            updateProfileImageInDatabase(userId, imagePath);
                        } catch (err) {
                            console.error("Error when updating profile image in database:", err);
                            // Continue even if database update fails
                        }
                        
                        alert("Profile picture uploaded but couldn't be displayed. It will appear after refresh.");
                    };
                    
                    // Start loading the image
                    tempImg.src = imageUrl;
                } else {
                    throw new Error(data.message || "Unknown error");
                }
            })
            .catch(error => {
                console.error("Error uploading profile picture:", error);
                alert("Error uploading profile picture: " + error.message);
            })
            .finally(() => {
                // Remove loading indicator
                const loadingElement = document.getElementById('profileUploadLoading');
                if (loadingElement) {
                    loadingElement.remove();
                }
            });
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Direct update of profile images without any checks - guarantees update
function directUpdateAllProfileImages(imageSrc) {
    console.log("Directly updating all profile images with:", imageSrc);
    
    // List of profile image elements to update
    const profileImageElements = [
        document.getElementById('sidebarProfilePic'),
        document.getElementById('profilePic'),
        document.getElementById('profilePicModal')
    ];
    
    // Update each element if it exists
    profileImageElements.forEach(element => {
        if (element) {
            // Remove any previous error handler
            element.onerror = null;
            
            // Set the new source
            element.src = imageSrc;
            console.log(`Directly updated image element: ${element.id}`);
            
            // Add error handler after setting src
            element.onerror = function() {
                console.log(`Error loading image for ${element.id}, using fallback`);
                this.src = getDefaultAvatarSvg();
                this.onerror = null; // Prevent infinite loop
            };
        }
    });
}

// Helper function to update profile image in database
function updateProfileImageInDatabase(userId, imagePath) {
    // Check if the endpoint is available
    fetch("http://localhost:3000/update-profile-image", {
        method: "HEAD"
    })
    .then(response => {
        if (response.ok) {
            // Endpoint exists, proceed with the update
            return fetch("http://localhost:3000/update-profile-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: userId,
                    profileImage: imagePath
                })
            });
        } else {
            // Endpoint doesn't exist, try to update user profile endpoint instead
            return fetch("http://localhost:3000/update-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    idNumber: userId,
                    profileImage: imagePath
                })
            });
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Profile image path updated in database:", data);
    })
    .catch(error => {
        console.error("Error updating profile image in database:", error);
        // Continue gracefully despite the error - the image is already displayed locally
        console.log("Profile image will remain displayed locally only until next login");
        
        // Save to localStorage for persistence
        localStorage.setItem("profileImagePath", imagePath);
    });
}

// Helper function to get the default avatar SVG
function getDefaultAvatarSvg() {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzY0NzQ4QiI+PHBhdGggZD0iTTEyIDJDNi40NzcgMiAyIDYuNDc3IDIgMTJzNC40NzcgMTAgMTAgMTAgMTAtNC40NzcgMTAtMTBTMTcuNTIzIDIgMTIgMnptLTEuNSA2LjVhMS41IDEuNSAwIDEgMSAzIDAgMS41IDEuNSAwIDEgMS0zIDB6TTE1IDE3SDlhMSAxIDAgMSAxIDAtMmg2YTEgMSAwIDAgMSAwIDJ6Ii8+PC9zdmc+';
}

// Function to handle when user clicks "Change Profile Picture" button
function triggerProfilePictureUpload() {
    console.log("Triggering profile picture upload");
    // Create a file input if it doesn't exist
    let fileInput = document.getElementById('profileImageInput');
    
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'profileImageInput';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.onchange = function() { 
            updateProfilePicture(this); 
        };
        document.body.appendChild(fileInput);
    }
    
    // Trigger click on file input
    fileInput.click();
}

// Function to load profile data
async function loadProfile() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId') || new URLSearchParams(window.location.search).get("id");
        
        if (!userId) {
            console.error("No user ID found for loading profile");
            return;
        }

        // Fetch profile data from server
        const response = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch profile data: ${response.status}`);
        }

        const profileData = await response.json();
        console.log("Profile data loaded:", profileData); // Debug log

        // Update profile information in the main form
        const mainFormFields = {
            'idNumber': profileData.idNumber || '',
            'firstname': profileData.firstName || '',
            'middlename': profileData.middleName || '',
            'lastname': profileData.lastName || '',
            'email': profileData.email || '',
            'year': profileData.year || '1st Year',
            'course': profileData.course || 'BS Computer Science',
            'oldIdNumber': profileData.idNumber || ''
        };

        // Update main form fields
        Object.entries(mainFormFields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value;
            }
        });

        // Make ID number field non-editable
        const idNumberInput = document.getElementById('idNumber');
        if (idNumberInput) {
            idNumberInput.readOnly = true;
            idNumberInput.classList.add('bg-gray-100', 'cursor-not-allowed');
        }

        // Update modal form fields
        const modalFormFields = {
            'idNumberModal': profileData.idNumber || '',
            'firstnameModal': profileData.firstName || '',
            'middlenameModal': profileData.middleName || '',
            'lastnameModal': profileData.lastName || '',
            'emailModal': profileData.email || '',
            'yearModal': profileData.year || '1st Year',
            'courseModal': profileData.course || 'BS Computer Science',
            'oldIdNumberModal': profileData.idNumber || ''
        };

        // Update modal form fields
        Object.entries(modalFormFields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value;
            }
        });

        // Make ID number field non-editable in modal
        const idNumberModalInput = document.getElementById('idNumberModal');
        if (idNumberModalInput) {
            idNumberModalInput.readOnly = true;
            idNumberModalInput.classList.add('bg-gray-100', 'cursor-not-allowed');
        }

        // Update profile image if it exists
        if (profileData.profileImage) {
            // Create URL with timestamp to prevent caching
            const profileImageWithTimestamp = `${profileData.profileImage}?t=${new Date().getTime()}`;
            
            // Update all profile pictures
            updateAllProfileImages(profileImageWithTimestamp);
            
            // Save to localStorage
            localStorage.setItem('profileImagePath', profileData.profileImage);
        } else {
            // Use SVG fallback if no profile image exists
            updateAllProfileImages(null); // Will use default avatar
        }

        // Update remaining sessions count
        const remainingSessions = profileData.remainingSessions || 0;
        const remainingSessionsElements = document.querySelectorAll('.remaining-sessions');
        remainingSessionsElements.forEach(element => {
            element.textContent = remainingSessions;
        });
        
        // Save to localStorage for persistence
        localStorage.setItem('profileData', JSON.stringify(profileData));
        localStorage.setItem('remainingSessions', remainingSessions);

        // Update sidebar profile
        updateSidebarProfile();
        
        // Update profile display fields - using direct query selectors for flexibility
        const fullName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
        const profileDisplayElements = {
            // Main profile elements with ID
            'profile-name': fullName,
            'profile-id': profileData.idNumber || '',
            'profile-course': profileData.course || '',
            'profile-year': profileData.year || '',
            'profile-email': profileData.email || '',
            // Profile section elements with ID
            'profile-section-name': fullName,
            'profile-section-id': profileData.idNumber || '',
            'profile-section-course': profileData.course || '',
            'profile-section-year': profileData.year || '',
            'profile-section-email': profileData.email || '',
            'profile-section-middle': profileData.middleName || ''
        };

        // Try multiple query methods to update profile fields
        Object.entries(profileDisplayElements).forEach(([selector, value]) => {
            // Try by ID first
            const elementById = document.getElementById(selector);
            if (elementById) {
                elementById.textContent = value || 'N/A';
            }
            
            // Also try by class selector
            const elementsByClass = document.querySelectorAll(`.${selector}`);
            elementsByClass.forEach(element => {
                element.textContent = value || 'N/A';
            });
        });

        console.log("Profile display updated successfully");

    } catch (error) {
        console.error("Error loading profile:", error);
        alert("Failed to load profile data. Please try again.");
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
                const sidebarProfileName = document.getElementById('sidebarProfileName');
                const sidebarProfileCourse = document.getElementById('sidebarProfileCourse');
                
                if (sidebarProfileName) {
                    sidebarProfileName.textContent = fullName || 'Loading...';
                }
                if (sidebarProfileCourse) {
                    sidebarProfileCourse.textContent = data.course || 'Loading...';
                }
                
                // Update remaining sessions count
                const remainingSessions = data.remainingSessions || 0;
                const remainingSessionsElements = document.querySelectorAll('.remaining-sessions');
                remainingSessionsElements.forEach(element => {
                    element.textContent = remainingSessions;
                });
                
                // Save to localStorage
                localStorage.setItem('profileName', fullName);
                localStorage.setItem('profileCourse', data.course || '');
                localStorage.setItem('remainingSessions', remainingSessions);
                
                // Update all profile pictures if exists
                if (data.profileImage) {
                    // Create URL with timestamp to prevent caching
                    const profileImageWithTimestamp = `${data.profileImage}?t=${new Date().getTime()}`;
                    updateAllProfileImages(profileImageWithTimestamp);
                    
                    // Save to localStorage
                    localStorage.setItem('profileImagePath', data.profileImage);
                } else {
                    // Use SVG fallback if no profile image exists
                    updateAllProfileImages(null); // Will use default avatar
                }
            }
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            // Load from localStorage as fallback
            const savedName = localStorage.getItem('profileName');
            const savedCourse = localStorage.getItem('profileCourse');
            const savedProfileImage = localStorage.getItem('profileImagePath');
            const savedRemainingSessions = localStorage.getItem('remainingSessions') || '0';
            
            // Safely update sidebar profile elements
            const sidebarProfileName = document.getElementById('sidebarProfileName');
            const sidebarProfileCourse = document.getElementById('sidebarProfileCourse');
            
            if (sidebarProfileName && savedName) {
                sidebarProfileName.textContent = savedName;
            }
            if (sidebarProfileCourse && savedCourse) {
                sidebarProfileCourse.textContent = savedCourse;
            }
            
            // Update remaining sessions from localStorage
            const remainingSessionsElements = document.querySelectorAll('.remaining-sessions');
            remainingSessionsElements.forEach(element => {
                element.textContent = savedRemainingSessions;
            });
            
            // Safely update profile pictures from localStorage
            if (savedProfileImage) {
                // Create URL with timestamp to prevent caching
                const profileImageWithTimestamp = `${savedProfileImage}?t=${new Date().getTime()}`;
                updateAllProfileImages(profileImageWithTimestamp);
            } else {
                // Use SVG fallback if no profile image exists in localStorage
                updateAllProfileImages(null); // Will use default avatar
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
        console.log("Loading reservation history...");
        
        // Get user data - try multiple sources
        const idNumber = localStorage.getItem('idNumber') || localStorage.getItem('currentUserId');
        const userData = localStorage.getItem('user');
        let userId = idNumber;
        
        if (!userId && userData) {
            try {
                const user = JSON.parse(userData);
                userId = user.idNumber || user.id;
                console.log("Retrieved user ID from user data:", userId);
            } catch (e) {
                console.error("Error parsing user data:", e);
            }
        }
        
        if (!userId) {
            console.error("No user ID found in localStorage");
            document.getElementById('reservationTableBody').innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-3 text-center text-gray-500">User data not found. Please log in again.</td>
                </tr>
            `;
            return;
        }

        console.log("Loading reservation history for user ID:", userId);

        // Show loading state
        document.getElementById('reservationTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-3 text-center text-gray-500">
                    <div class="flex justify-center items-center">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading history...
                    </div>
                </td>
            </tr>
        `;

        // Use the new unified endpoint to get both reservations and walk-ins
        console.log("Fetching history from unified endpoint...");
        const response = await fetch('/student-history/' + userId);
        
        if (!response.ok) {
            console.error("Failed to fetch history:", response.status);
            throw new Error("Failed to fetch history data");
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || "Unknown error occurred");
        }
        
        const allEntries = result.history;
        console.log(`Retrieved ${allEntries.length} history entries`);
        
        // Update the table
        const tableBody = document.getElementById('reservationTableBody');
        if (!tableBody) {
            console.error("Reservation history table body not found");
            return;
        }
        
        if (allEntries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-3 text-center text-gray-500">No history found.</td>
                </tr>
            `;
            return;
        }

        let html = '';
        
        allEntries.forEach(entry => {
            const date = entry.date || 'N/A';
            const time = entry.displayTime || entry.time || entry.timeIn || 'N/A';
            const purpose = entry.programmingLanguage || entry.purpose || 'N/A';
            const status = entry.status || 'N/A';
            const laboratory = entry.labRoom || entry.laboratory || 'N/A';
            const id = entry._id || entry.id || '';
            
            // Determine styling based on type
            const entryType = entry.type || 'N/A';
            const typeClass = entryType === 'Walk-in' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800';
            
            // Determine status badge class
            let statusClass = 'bg-gray-100 text-gray-800';
            if (status === 'approved') {
                statusClass = 'bg-blue-100 text-blue-800';
            } else if (status === 'active') {
                statusClass = 'bg-green-100 text-green-800';
            } else if (status === 'completed') {
                statusClass = 'bg-gray-100 text-gray-800';
            } else if (status === 'pending') {
                statusClass = 'bg-yellow-100 text-yellow-800';
            } else if (status === 'rejected') {
                statusClass = 'bg-red-100 text-red-800';
            }

            html += `
                <tr class="hover:bg-gray-100" data-entry-id="${id}" data-entry-type="${entryType}">
                    <td class="px-6 py-4 whitespace-nowrap">${date}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${time}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${purpose}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                            ${entryType}
                        </span>
                    </td>
                </tr>
            `;
            
            // Add feedback row for all reservations that haven't been rated
            if (!entry.feedback) {
                html += `
                    <tr class="bg-gray-50 dark:bg-gray-800 feedback-row" data-for-entry-id="${id}">
                        <td colspan="5" class="px-6 py-4">
                            <div class="space-y-4">
                                <div class="space-y-2">
                                    <label class="block text-sm text-gray-600 dark:text-gray-400">How was your experience? Please leave your feedback:</label>
                                    <div class="flex items-center space-x-2">
                                        <textarea 
                                            class="w-full px-2 py-1 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" 
                                            rows="2" 
                                            placeholder="Add your comments..."
                                            data-entry-id="${id}"
                                        ></textarea>
                                        <button 
                                            onclick="submitReservationFeedback('${id}', '${laboratory}')" 
                                            class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }
        });

        tableBody.innerHTML = html;
        console.log("Reservation history table updated successfully");
        
    } catch (error) {
        console.error('Error loading reservation history:', error);
        document.getElementById('reservationTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-3 text-center text-red-500">Error loading reservation history: ${error.message}</td>
            </tr>
        `;
    }
}

// Function to submit feedback
async function submitFeedback(sitInId) {
    try {
        const textarea = document.querySelector(`textarea[data-sit-in-id="${sitInId}"]`);
        const message = textarea.value.trim();
        
        if (!message) {
            alert('Please enter your feedback before submitting.');
            return;
        }

        const userData = JSON.parse(localStorage.getItem('userData'));
        const userId = userData?.idNumber || localStorage.getItem('currentUserId');
        
        const response = await fetch('http://localhost:3000/submit-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                sitInId,
                type: 'Sit-In',
                message,
                laboratory: 'Computer Laboratory',
                date: new Date().toISOString()
            })
        });

        // Check for errors
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit feedback');
        }

        // Remove the feedback form
        const feedbackRow = textarea.closest('tr');
        feedbackRow.remove();
        
        alert('Feedback submitted successfully!');

    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Failed to submit feedback. Please try again.');
    }
}

// Function to submit reservation feedback
async function submitReservationFeedback(entryId, laboratory) {
    try {
        // Get the textarea for this entry
        const textarea = document.querySelector(`textarea[data-entry-id="${entryId}"]`);
        const message = textarea?.value?.trim() || '';
        
        if (!message) {
            alert('Please enter your feedback before submitting.');
            return;
        }
        
        // Get user ID
        const userData = localStorage.getItem('user');
        const idNumber = localStorage.getItem('idNumber') || localStorage.getItem('currentUserId');
        let userId = idNumber;
        
        if (!userId && userData) {
            try {
                const user = JSON.parse(userData);
                userId = user.idNumber || user.id;
            } catch (e) {
                console.error("Error parsing user data:", e);
            }
        }
        
        if (!userId) {
            alert('User information not found. Please log in again.');
            return;
        }
        
        // Get the actual session type from the entry row
        const entryRow = document.querySelector(`tr[data-entry-id="${entryId}"]`);
        let sessionType = 'Reservation'; // Default
        
        if (entryRow) {
            // Get the type from the data attribute
            sessionType = entryRow.getAttribute('data-entry-type') || 'Reservation';
        }
        
        console.log(`Submitting feedback for ${sessionType} session ${entryId}`);
        
        // Show loading state on the button
        const button = textarea.nextElementSibling;
        const originalButtonText = button.textContent;
        button.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mx-auto"></div>';
        button.disabled = true;
        
        // Submit the feedback
        const response = await fetch('/submit-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                sitInId: entryId,
                type: sessionType,
                message,
                laboratory: laboratory || 'Computer Laboratory',
                date: new Date().toISOString()
            })
        });
        
        // Check for errors
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit feedback');
        }
        
        // Process successful response
        const result = await response.json();
        
        if (result.success) {
            // Remove the feedback row
            const feedbackRow = textarea.closest('.feedback-row');
            if (feedbackRow) {
                feedbackRow.remove();
            }
            
            // Mark the entry as having feedback in the DOM
            const entryRow = document.querySelector(`tr[data-entry-id="${entryId}"]`);
            if (entryRow) {
                entryRow.setAttribute('data-has-feedback', 'true');
            }
            
            alert('Thank you! Your feedback has been submitted successfully.');
        } else {
            throw new Error(result.message || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error('Error submitting reservation feedback:', error);
        alert(`Failed to submit feedback: ${error.message}`);
        
        // Reset the button state
        const textarea = document.querySelector(`textarea[data-entry-id="${entryId}"]`);
        const button = textarea?.nextElementSibling;
        if (button) {
            button.textContent = 'Submit';
            button.disabled = false;
        }
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

// Function to load sit-in history
async function loadSitInHistory() {
    try {
        const tableBody = document.getElementById('sitInTableBody');
        if (tableBody) {
            // Display a message that no sit-in history is available
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No sit-in history found</td></tr>';
        }
        
        // Note: The code below is commented out as we're no longer fetching sit-in history
        /*
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

        userSitIns.forEach(sitIn => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            
            // Format date and time
            const dateTime = new Date(sitIn.date);
            const formattedDate = dateTime.toLocaleDateString();
            const formattedTime = dateTime.toLocaleTimeString();

            // Generate star rating HTML
            const starRating = sitIn.rating ? generateStarRating(sitIn.rating) : generateStarRating(0);

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
                    <div class="flex items-center space-x-1" data-sit-in-id="${sitIn._id}">
                        ${starRating}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);

            // Only show feedback form for completed sit-ins that haven't been rated
            if (sitIn.status === 'completed' && !sitIn.feedback) {
                const feedbackRow = document.createElement('tr');
                feedbackRow.className = 'bg-gray-50 dark:bg-gray-800';
                feedbackRow.innerHTML = `
                    <td colspan="6" class="px-6 py-4">
                        <div class="space-y-4">
                            <div class="space-y-2">
                                <label class="block text-sm text-gray-600 dark:text-gray-400">Comments:</label>
                                <div class="flex items-center space-x-2">
                                    <textarea 
                                        class="w-full px-2 py-1 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" 
                                        rows="2" 
                                        placeholder="Add your comments..."
                                        data-sit-in-id="${sitIn._id}"
                                    ></textarea>
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
            }

            // Add event listeners for star rating
            if (sitIn.status === 'completed') {
                const stars = row.querySelectorAll('.star');
                stars.forEach((star, index) => {
                    star.addEventListener('click', () => updateRating(sitIn._id, index + 1));
                });
            }
        });
        */
    } catch (error) {
        console.error('Error loading sit-in history:', error);
        const tableBody = document.getElementById('sitInTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-600">Error loading sit-in history</td></tr>';
        }
    }
}

// Function to update rating
async function updateRating(sitInId, rating) {
    try {
        const response = await fetch(`http://localhost:3000/update-rating`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sitInId,
                rating
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update rating');
        }

        // Reload sit-in history to reflect changes
        await loadSitInHistory();
    } catch (error) {
        console.error('Error updating rating:', error);
        alert('Failed to update rating. Please try again.');
    }
}

// Function to update the setupHistoryTabs function to include authentication check
function setupHistoryTabs() {
    if (!checkAuthentication()) return;
    
    const sitInHistoryTab = document.getElementById('sitInHistoryTab');
    const reservationHistoryTab = document.getElementById('reservationHistoryTab');
    const sitInHistoryContent = document.getElementById('sitInHistoryContent');
    const reservationHistoryContent = document.getElementById('reservationHistoryContent');

    // Hide the sit-in history tab completely
    if (sitInHistoryTab) {
        sitInHistoryTab.style.display = 'none';
    }
    
    // Hide sit-in history content
    if (sitInHistoryContent) {
        sitInHistoryContent.classList.add('hidden');
    }
    
    // Show reservation history tab and content by default
    if (reservationHistoryTab) {
        reservationHistoryTab.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        reservationHistoryTab.style.width = '100%'; // Make it take the full width
    }
    
    if (reservationHistoryContent) {
        reservationHistoryContent.classList.remove('hidden');
    }

    // Removed the click handlers for sit-in history tab since it's now hidden
    
    // Keep the reservation history tab click handler
    if (reservationHistoryTab) {
        reservationHistoryTab.addEventListener('click', () => {
            reservationHistoryTab.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
            if (sitInHistoryTab) {
                sitInHistoryTab.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
            }
            if (reservationHistoryContent) {
                reservationHistoryContent.classList.remove('hidden');
            }
            if (sitInHistoryContent) {
                sitInHistoryContent.classList.add('hidden');
            }
            loadReservationHistory();
        });
    }
    
    // Load reservation history by default
    loadReservationHistory();
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
    // Find the reserve button
    const reserveButton = document.querySelector('button[onclick="reserveSession()"]');
    
    // Show loading animation if button exists
    if (reserveButton) {
        reserveButton.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';
        reserveButton.disabled = true;
    } else {
        console.error("Reserve button not found in the DOM");
    }
    
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!userId) {
            throw new Error('User ID not found');
        }
        
        // Get remaining sessions from localStorage
        const remainingSessions = parseInt(localStorage.getItem('remainingSessions') || '0');
        
        // Check if the student has any remaining sessions
        if (remainingSessions <= 0) {
            // Display error message
            const errorElement = document.getElementById('reservation-error');
            if (errorElement) {
                errorElement.innerHTML = `
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium">You have no remaining sessions!</p>
                                <p class="text-xs mt-1">Please contact the administrator to reset your sessions.</p>
                            </div>
                        </div>
                    </div>
                `;
                errorElement.classList.remove('hidden');
            } else {
                // If error element doesn't exist, create one
                const reservationForm = document.getElementById('reservationForm');
                if (reservationForm) {
                    const newErrorElement = document.createElement('div');
                    newErrorElement.id = 'reservation-error';
                    newErrorElement.innerHTML = `
                        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm font-medium">You have no remaining sessions!</p>
                                    <p class="text-xs mt-1">Please contact the administrator to reset your sessions.</p>
                                </div>
                            </div>
                        </div>
                    `;
                    reservationForm.prepend(newErrorElement);
                } else {
                    alert("You have no remaining sessions! Please contact the administrator.");
                }
            }
            
            // Reset button
            if (reserveButton) {
                reserveButton.innerHTML = 'Reserve Now';
                reserveButton.disabled = false;
            }
            
            return;
        }
        
        // Get form values
        const form = document.getElementById('reservationForm');
        if (!form) {
            throw new Error('Reservation form not found');
        }
        
        // Get selected date from calendar data attribute
        const calendar = document.getElementById('calendar');
        const selectedDate = calendar ? calendar.dataset.selectedDate : null;
        
        if (!selectedDate) {
            throw new Error('Please select a date on the calendar');
        }
        
        // Get form data
        const formData = new FormData(form);
        const time = formData.get('time');
        const purpose = formData.get('purpose') || 'Programming Session'; // Provide default purpose if missing
        const labRoom = formData.get('labRoom');
        const programmingLanguage = formData.get('programmingLanguage');
        
        // Basic validation
        if (!time || !labRoom || !programmingLanguage) {
            throw new Error('Please fill out all required fields');
        }
        
        // Get user profile data for name and course
        const profileResponse = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!profileResponse.ok) {
            throw new Error('Failed to get user profile');
        }
        
        const profileData = await profileResponse.json();
        
        // Prepare reservation data
        const reservationData = {
            idNumber: userId,
            email: profileData.email || '',
            name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
            course: profileData.course || '',
            year: profileData.year || '',
            purpose: purpose,
            date: selectedDate,
            time: time,
            labRoom: labRoom,
            programmingLanguage: programmingLanguage
        };
        
        // Send reservation request
        const response = await fetch('http://localhost:3000/reserve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservationData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to reserve session');
        }
        
        // Display success message
        const successElement = document.getElementById('reservation-success');
        if (successElement) {
            successElement.innerHTML = `
                <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium">Reservation successful!</p>
                            <p class="text-xs mt-1">Your session has been reserved for ${selectedDate} at ${time}. You now have ${result.remainingSessions} sessions remaining.</p>
                        </div>
                    </div>
                </div>
            `;
            successElement.classList.remove('hidden');
        } else {
            // If success element doesn't exist, create one
            const reservationForm = document.getElementById('reservationForm');
            if (reservationForm) {
                const newSuccessElement = document.createElement('div');
                newSuccessElement.id = 'reservation-success';
                newSuccessElement.innerHTML = `
                    <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium">Reservation successful!</p>
                                <p class="text-xs mt-1">Your session has been reserved for ${selectedDate} at ${time}. You now have ${result.remainingSessions} sessions remaining.</p>
                            </div>
                        </div>
                    </div>
                `;
                reservationForm.prepend(newSuccessElement);
            } else {
                alert(`Reservation successful! Your session has been reserved for ${selectedDate} at ${time}. You now have ${result.remainingSessions} sessions remaining.`);
            }
        }
        
        // Hide any error message
        const errorElement = document.getElementById('reservation-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
        
        // Update remaining sessions in localStorage
        if (result.remainingSessions !== undefined) {
            localStorage.setItem('remainingSessions', result.remainingSessions.toString());
            
            // Update all remaining sessions displays
            document.querySelectorAll('.remaining-sessions').forEach(el => {
                el.textContent = result.remainingSessions;
            });
        }
        
        // Reset form
        form.reset();
        
        // Refresh calendar to show new reservation
        if (typeof initializeCalendar === 'function') {
            initializeCalendar();
        }
        
    } catch (error) {
        console.error('Error reserving session:', error);
        
        // Display error message
        const errorElement = document.getElementById('reservation-error');
        if (errorElement) {
            errorElement.innerHTML = `
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium">Error reserving session</p>
                            <p class="text-xs mt-1">${error.message}</p>
                        </div>
                    </div>
                </div>
            `;
            errorElement.classList.remove('hidden');
        } else {
            // Create an error element if it doesn't exist
            const reservationForm = document.getElementById('reservationForm');
            if (reservationForm) {
                const newErrorElement = document.createElement('div');
                newErrorElement.id = 'reservation-error';
                newErrorElement.innerHTML = `
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium">Error reserving session</p>
                                <p class="text-xs mt-1">${error.message}</p>
                            </div>
                        </div>
                    </div>
                `;
                reservationForm.prepend(newErrorElement);
            } else {
                alert(`Error reserving session: ${error.message}`);
            }
        }
        
        // Hide success message
        const successElement = document.getElementById('reservation-success');
        if (successElement) {
            successElement.classList.add('hidden');
        }
    } finally {
        // Reset button state
        if (reserveButton) {
            reserveButton.innerHTML = 'Reserve Now';
            reserveButton.disabled = false;
        }
    }
}

// Function to handle quick session reservation
async function quickReserveSession() {
    // Show loading animation
    const quickReserveButton = document.getElementById('quick-reserve-button');
    if (quickReserveButton) {
        quickReserveButton.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';
        quickReserveButton.disabled = true;
    }
    
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
        if (!userId) {
            throw new Error('User ID not found');
        }
        
        // Get remaining sessions from localStorage
        const remainingSessions = parseInt(localStorage.getItem('remainingSessions') || '0');
        
        // Check if the student has any remaining sessions
        if (remainingSessions <= 0) {
            // Display error message
            const errorElement = document.getElementById('quick-reservation-error');
            if (errorElement) {
                errorElement.innerHTML = `
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium">You have no remaining sessions!</p>
                                <p class="text-xs mt-1">Please contact the administrator to reset your sessions.</p>
                            </div>
                        </div>
                    </div>
                `;
                errorElement.classList.remove('hidden');
            }
            
            // Reset button
            if (quickReserveButton) {
                quickReserveButton.innerHTML = 'Reserve Now';
                quickReserveButton.disabled = false;
            }
            
            return;
        }
        
        // Get form values
        const form = document.getElementById('quick-reservation-form');
        if (!form) {
            throw new Error('Quick reservation form not found');
        }
        
        // Get form data
        const formData = new FormData(form);
        const purpose = formData.get('quick-purpose');
        const labRoom = formData.get('quick-labRoom');
        const programmingLanguage = formData.get('quick-programmingLanguage');
        
        // Basic validation
        if (!purpose || !labRoom || !programmingLanguage) {
            throw new Error('Please fill out all required fields');
        }
        
        // Get current date and time
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        // Format time as HH:MM, ensuring two digits for hour and minute
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const time = `${hours}:${minutes}`;
        
        // Get user profile data for name and course
        const profileResponse = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!profileResponse.ok) {
            throw new Error('Failed to get user profile');
        }
        
        const profileData = await profileResponse.json();
        
        // Prepare reservation data
        const reservationData = {
            idNumber: userId,
            email: profileData.email || '',
            name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
            course: profileData.course || '',
            year: profileData.year || '',
            purpose: purpose,
            date: date,
            time: time,
            labRoom: labRoom,
            programmingLanguage: programmingLanguage
        };
        
        // Send reservation request to create-walkin endpoint (different from reserve endpoint)
        const response = await fetch('http://localhost:3000/create-walkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservationData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to create walk-in session');
        }
        
        // Display success message
        const successElement = document.getElementById('quick-reservation-success');
        if (successElement) {
            successElement.innerHTML = `
                <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium">Walk-in successful!</p>
                            <p class="text-xs mt-1">Your sit-in session has been created for today at ${time}. You now have ${result.remainingSessions} sessions remaining.</p>
                        </div>
                    </div>
                </div>
            `;
            successElement.classList.remove('hidden');
        }
        
        // Hide any error message
        const errorElement = document.getElementById('quick-reservation-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
        
        // Update remaining sessions in localStorage
        if (result.remainingSessions !== undefined) {
            localStorage.setItem('remainingSessions', result.remainingSessions.toString());
            
            // Update all remaining sessions displays
            document.querySelectorAll('.remaining-sessions').forEach(el => {
                el.textContent = result.remainingSessions;
            });
        }
        
        // Reset form
        form.reset();
        
        // Close modal
        if (typeof closeQuickReserveModal === 'function') {
            closeQuickReserveModal();
        }
        
        // Update dashboard data
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
        
    } catch (error) {
        console.error('Error creating walk-in session:', error);
        
        // Display error message
        const errorElement = document.getElementById('quick-reservation-error');
        if (errorElement) {
            errorElement.innerHTML = `
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium">Error creating walk-in</p>
                            <p class="text-xs mt-1">${error.message}</p>
                        </div>
                    </div>
                </div>
            `;
            errorElement.classList.remove('hidden');
        }
        
        // Hide success message
        const successElement = document.getElementById('quick-reservation-success');
        if (successElement) {
            successElement.classList.add('hidden');
        }
    } finally {
        // Reset button state
        if (quickReserveButton) {
            quickReserveButton.innerHTML = 'Start Sit-in Now';
            quickReserveButton.disabled = false;
        }
    }
}

// Function to open quick reserve modal
function openQuickReserveModal() {
    const modal = document.getElementById('quickReserveModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('opacity-100');
        // Initialize the calendar when opening the modal
        initializeCalendar();
    }
}

// Function to close quick reserve modal
function closeQuickReserveModal() {
    const modal = document.getElementById('quickReserveModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('opacity-100');
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

        // Show remaining sessions - use the value from profileData
        const remainingSessions = profileData.remainingSessions || 0;
        document.getElementById('remainingSessionsModal').textContent = remainingSessions;
        
        // Store the remaining sessions count in localStorage for consistency
        localStorage.setItem('remainingSessions', remainingSessions);

        // Add event listener for change password button
        const changePasswordButton = document.querySelector('[onclick="openChangePasswordModal()"]');
        if (changePasswordButton) {
            changePasswordButton.addEventListener('click', openChangePasswordModal);
        }

        // Show the modal
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error showing profile modal:', error);
        alert('Failed to load profile data. Please try again.');
    }
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

// Function to initialize calendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        selectable: true,
        select: function(info) {
            const date = info.startStr;
            // Store the selected date in a data attribute
            calendarEl.dataset.selectedDate = date;
            // Highlight the selected date
            const selectedCell = document.querySelector(`[data-date="${date}"]`);
            if (selectedCell) {
                selectedCell.classList.add('bg-blue-100');
            }
        },
        events: async function(info, successCallback, failureCallback) {
            try {
                const response = await fetch('http://localhost:3000/reservations');
                const data = await response.json();
                
                const events = data.map(reservation => ({
                    id: reservation.id,
                    title: `Room ${reservation.labRoom}`,
                    start: `${reservation.date}T${reservation.time}`,
                    backgroundColor: getStatusColor(reservation.status),
                    borderColor: getStatusColor(reservation.status)
                }));
                
                successCallback(events);
            } catch (error) {
                console.error('Error fetching events:', error);
                failureCallback(error);
            }
        }
    });

    calendar.render();
}

// Function to get color based on reservation status
function getStatusColor(status) {
    switch (status) {
        case 'pending':
            return '#fbbf24'; // yellow
        case 'approved':
            return '#34d399'; // green
        case 'rejected':
            return '#ef4444'; // red
        default:
            return '#6b7280'; // gray
    }
}

// Function to update profile display
async function updateProfileDisplay() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId') || new URLSearchParams(window.location.search).get("id");
        
        if (!userId) {
            console.error("No user ID found for profile display");
            return;
        }
        
        console.log("Updating profile display for user:", userId);
        
        // Fetch profile data from server
        const response = await fetch(`http://localhost:3000/get-profile?id=${userId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch profile data: ${response.status}`);
        }
        
        const profileData = await response.json();
        console.log("Profile data retrieved:", profileData);
        
        // Get profile section
        const profileSection = document.getElementById('profile');
        if (!profileSection) {
            console.error("Profile section not found in DOM");
            return;
        }

        // DIRECT FORM UPDATE: Update input values in the profile form
        const formInputs = {
            // Main form input fields
            'idNumber': profileData.idNumber || '',
            'email': profileData.email || '',
            'firstname': profileData.firstName || '',
            'middlename': profileData.middleName || '',
            'lastname': profileData.lastName || '',
            'year': profileData.year || '',
            'course': profileData.course || '',
            'oldIdNumber': profileData.idNumber || ''
        };

        // Update each form input field with the corresponding value
        Object.entries(formInputs).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value;
            }
        });
        
        // Update profile name display
        const profileNameElement = profileSection.querySelector('.profile-name');
        if (profileNameElement) {
            const fullName = `${profileData.firstName || ''} ${profileData.middleName ? profileData.middleName + ' ' : ''}${profileData.lastName || ''}`;
            profileNameElement.textContent = fullName.trim();
        }
        
        // Update profile course display
        const profileCourseElement = profileSection.querySelector('.profile-course');
        if (profileCourseElement) {
            profileCourseElement.textContent = `${profileData.course || 'Not Set'} - ${profileData.year || 'Not Set'}`;
        }
        
        // Update profile ID display
        const profileIdElement = profileSection.querySelector('.profile-id');
        if (profileIdElement) {
            profileIdElement.textContent = profileData.idNumber || 'Not Set';
        }
        
        // Add sessions indicator to the profile section
        updateProfileSessionsIndicator(profileSection, profileData.remainingSessions || 0);
        
        // Update profile picture if available
        if (profileData.profilePicture) {
            updateAllProfileImages(profileData.profilePicture);
        } else {
            // Set default avatar if no profile picture
            updateAllProfileImages(`data:image/svg+xml;base64,${btoa(getDefaultAvatarSvg())}`);
        }
        
        // Also update the sidebar profile
        updateSidebarProfile();
        
    } catch (error) {
        console.error("Error updating profile display:", error);
    }
}

// Function to update the sessions indicator in the profile section
function updateProfileSessionsIndicator(profileSection, remainingSessions) {
    // Check if sessions indicator already exists
    let sessionsIndicator = profileSection.querySelector('#profile-sessions-indicator');
    
    // If not, create it
    if (!sessionsIndicator) {
        sessionsIndicator = document.createElement('div');
        sessionsIndicator.id = 'profile-sessions-indicator';
        sessionsIndicator.className = 'mt-4 p-4 rounded-lg shadow-md';
        
        // Find a good spot to insert it (after the main profile info)
        const profileInfo = profileSection.querySelector('.profile-info') || 
                           profileSection.querySelector('form') ||
                           profileSection.querySelector('.card');
        
        if (profileInfo) {
            profileInfo.parentNode.insertBefore(sessionsIndicator, profileInfo.nextSibling);
        } else {
            // If we can't find a good spot, just append to the section
            profileSection.appendChild(sessionsIndicator);
        }
    }
    
    // Set appropriate color based on remaining sessions
    let bgColor, textColor, borderColor;
    if (remainingSessions === 0) {
        bgColor = 'bg-red-100 dark:bg-red-900/30';
        textColor = 'text-red-800 dark:text-red-300';
        borderColor = 'border-red-500';
    } else if (remainingSessions <= 5) {
        bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
        textColor = 'text-yellow-800 dark:text-yellow-300';
        borderColor = 'border-yellow-500';
    } else {
        bgColor = 'bg-green-100 dark:bg-green-900/30';
        textColor = 'text-green-800 dark:text-green-300';
        borderColor = 'border-green-500';
    }
    
    // Update classes
    sessionsIndicator.className = `mt-4 p-4 rounded-lg shadow-md border-l-4 ${bgColor} ${textColor} ${borderColor}`;
    
    // Set content with appropriate message
    const sessionWord = remainingSessions === 1 ? 'session' : 'sessions';
    let message;
    
    if (remainingSessions === 0) {
        message = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="font-medium">No remaining sessions!</p>
                    <p class="text-sm mt-1">You have used all your allocated lab sessions. Please contact the administrator to reset your sessions.</p>
                </div>
            </div>
        `;
    } else if (remainingSessions <= 5) {
        message = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="font-medium">Low sessions warning</p>
                    <p class="text-sm mt-1">You have only ${remainingSessions} ${sessionWord} remaining. Use them wisely!</p>
                </div>
            </div>
        `;
    } else {
        message = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="font-medium">Sessions status</p>
                    <p class="text-sm mt-1">You have ${remainingSessions} ${sessionWord} remaining.</p>
                </div>
            </div>
        `;
    }
    
    sessionsIndicator.innerHTML = message;
}

// Helper function to update all profile image elements - used by other functions
function updateAllProfileImages(imageSrc) {
    // If imageSrc is null or undefined, use the default avatar
    if (!imageSrc) {
        imageSrc = getDefaultAvatarSvg();
    }
    
    console.log("Updating all profile images with:", imageSrc);
    
    // List of profile image elements to update
    const profileImageElements = [
        document.getElementById('sidebarProfilePic'),
        document.getElementById('profilePic'),
        document.getElementById('profilePicModal')
    ];
    
    // Update each element if it exists
    profileImageElements.forEach(element => {
        if (element) {
            element.src = imageSrc;
            console.log(`Updated image element: ${element.id}`);
            
            element.onerror = function() {
                console.log(`Error loading image for ${element.id}, using fallback`);
                // Use a generic avatar SVG instead of default.png
                this.src = getDefaultAvatarSvg();
                this.onerror = null; // Prevent infinite loop
            };
        }
    });
}

// Function to mark a reservation as active (check-in)
async function markAsActive(reservationId) {
    try {
        if (!reservationId) {
            alert('Reservation ID is missing');
            return;
        }
        
        const confirmed = confirm('Are you sure you want to check in for this reservation?');
        if (!confirmed) return;
        
        const response = await fetch(`http://localhost:3000/update-reservation-status/${reservationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'active' })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update reservation status');
        }
        
        const result = await response.json();
        
        // Update UI to reflect the changes
        alert('Successfully checked in!');
        
        // Reload reservation history to update the table
        await loadReservationHistory();
        
        // If the dashboard is visible, update it too
        if (!document.getElementById('dashboard').classList.contains('hidden')) {
            await loadDashboardData();
        }
        
        // If this function was called from another section, show the dashboard
        if (document.getElementById('sit-in-history') && 
            !document.getElementById('dashboard').classList.contains('hidden')) {
            showSection('dashboard');
        }
        
    } catch (error) {
        console.error('Error checking in:', error);
        alert('Error checking in: ' + error.message);
    }
}

// Function to mark a reservation as completed (check-out)
async function markAsCompleted(reservationId) {
    try {
        if (!reservationId) {
            alert('Reservation ID is missing');
            return;
        }
        
        const confirmed = confirm('Are you sure you want to check out from this session?');
        if (!confirmed) return;
        
        const response = await fetch(`http://localhost:3000/update-reservation-status/${reservationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update reservation status');
        }
        
        const result = await response.json();
        
        // Update UI to reflect the changes
        alert('Successfully checked out!');
        
        // Reload reservation history to update the table
        await loadReservationHistory();
        
        // If the dashboard is visible, update it too
        if (!document.getElementById('dashboard').classList.contains('hidden')) {
            await loadDashboardData();
        }
        
    } catch (error) {
        console.error('Error checking out:', error);
        alert('Error checking out: ' + error.message);
    }
}