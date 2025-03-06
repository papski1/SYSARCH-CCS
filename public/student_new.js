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
        localStorage.setItem("activeSection", sectionId);
        
        // Load announcements when announcements section is shown
        if (sectionId === "announcements") {
            loadAnnouncements();
            // Clear notification dot when viewing announcements
            clearAnnouncementNotification();
        }
    }
}

// Function to check for new announcements
async function checkNewAnnouncements() {
    try {
        const response = await fetch("http://localhost:3000/get-announcements");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const announcements = await response.json();
        
        if (announcements.length === 0) return;

        const lastSeenTime = localStorage.getItem("lastSeenAnnouncement") || "0";
        const latestAnnouncement = announcements[0]; // First announcement is the newest
        
        if (new Date(latestAnnouncement.date).getTime() > parseInt(lastSeenTime)) {
            showAnnouncementNotification();
        }
    } catch (error) {
        console.error("Error checking announcements:", error);
    }
}

// Function to show notification dot
function showAnnouncementNotification() {
    const announcementLink = document.querySelector('a[href="#announcements"]');
    if (announcementLink) {
        // Check if notification dot already exists
        if (!announcementLink.querySelector('.notification-dot')) {
            const dot = document.createElement('span');
            dot.className = 'notification-dot absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full';
            announcementLink.style.position = 'relative';
            announcementLink.appendChild(dot);
        }
    }
}

// Function to clear notification dot
function clearAnnouncementNotification() {
    const announcementLink = document.querySelector('a[href="#announcements"]');
    const dot = announcementLink?.querySelector('.notification-dot');
    if (dot) {
        dot.remove();
    }
    
    // Update last seen timestamp
    const now = new Date().getTime();
    localStorage.setItem("lastSeenAnnouncement", now.toString());
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
        
        const announcementsSection = document.getElementById('announcements');
        const container = announcementsSection.querySelector('.bg-white');
        container.innerHTML = '';

        if (announcements.length === 0) {
            container.innerHTML = '<p class="text-gray-600">No announcements at this time.</p>';
            return;
        }

        // Create announcements list
        const announcementsList = document.createElement('div');
        announcementsList.className = 'space-y-4';

        announcements.forEach(announcement => {
            const announcementElement = document.createElement('div');
            announcementElement.className = 'p-4 bg-gray-50 rounded-lg border border-gray-200';
            announcementElement.innerHTML = `
                <p class="text-sm text-gray-600 mb-2">${new Date(announcement.date).toLocaleString()}</p>
                <p class="text-gray-800">${announcement.message}</p>
            `;
            announcementsList.appendChild(announcementElement);
        });

        container.appendChild(announcementsList);
    } catch (error) {
        console.error("Error loading announcements:", error);
        const announcementsSection = document.getElementById('announcements');
        const container = announcementsSection.querySelector('.bg-white');
        container.innerHTML = '<p class="text-red-500">Error loading announcements. Please try again later.</p>';
    }
}

// Handle profile picture upload
document.getElementById("uploadProfilePic").addEventListener("change", function (event) {
    const file = event.target.files[0];
    const userId = new URLSearchParams(window.location.search).get("id"); // Get user ID from URL
    if (file && userId) {
        uploadProfilePicture(file, userId);
    } else {
        console.error("No file or user ID found!");
    }
});

function uploadProfilePicture(file, userId) {
    const formData = new FormData();
    formData.append("profileImage", file); // Must match Multer's field name
    formData.append("userId", userId);

    fetch("http://localhost:3000/upload-profile", {
        method: "POST",
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the profile picture dynamically using the permanent path
                document.getElementById("profilePic").src = data.imagePath;
                alert("Profile picture updated successfully!");
            } else {
                alert("Failed to update profile picture: " + data.error);
            }
        })
        .catch(error => {
            console.error("Error uploading profile picture:", error);
            alert("Error updating profile picture.");
        });
}

// Handle profile update
function saveProfile() {
    const userId = new URLSearchParams(window.location.search).get("id");
    if (!userId) {
        alert("User not logged in!");
        return;
    }

    const updatedData = {
        oldIdNumber: userId,
        idNumber: document.getElementById("idNumber").value,
        firstName: document.getElementById("firstname").value,
        middleName: document.getElementById("middlename").value,
        lastName: document.getElementById("lastname").value,
        email: document.getElementById("email").value,
        year: document.getElementById("year").value,
        course: document.getElementById("course").value
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
            } else {
                alert("Failed to update profile: " + (data.message || "Unknown error"));
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error updating profile. Please try again.");
        });
}

async function reserveSession() {
    try {
        const purpose = document.getElementById("purpose").value;
        const date = document.getElementById("date").value;
        const time = document.getElementById("time").value;
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");

        if (!userId) {
            alert("Please try making the reservation again. If the issue persists, contact support.");
            return;
        }

        if (!purpose || !date || !time) {
            alert("Please fill in all fields: purpose, date, and time.");
            return;
        }

        console.log("Starting reservation process...");
        console.log("User ID:", userId);
        console.log("Form data:", { purpose, date, time });

        // First get the user's email from the server
        console.log("Fetching user profile...");
        let userResponse;
        try {
            userResponse = await fetch(`http://localhost:3000/get-profile?id=${userId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            console.log("User response status:", userResponse.status);
        } catch (fetchError) {
            console.error("Network error while fetching user profile:", fetchError);
            throw new Error(`Network error while fetching user profile: ${fetchError.message}`);
        }
        
        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error("User profile fetch failed:", errorText);
            throw new Error(`Failed to fetch user data: ${userResponse.status} - ${errorText}`);
        }
        
        let userData;
        try {
            userData = await userResponse.json();
            console.log("User data fetched successfully:", userData);
        } catch (jsonError) {
            console.error("Error parsing user data:", jsonError);
            throw new Error(`Invalid user data received: ${jsonError.message}`);
        }

        if (!userData || !userData.email || !userData.idNumber) {
            console.error("Invalid user data structure:", userData);
            throw new Error("Invalid user data structure received from server");
        }

        // Now make the reservation with the user's email and ID number
        const reservationData = { 
            email: userData.email,
            idNumber: userData.idNumber,
            purpose, 
            date, 
            time 
        };
        console.log("Sending reservation data:", reservationData);

        // Make the reservation request
        console.log("Making reservation request...");
        let response;
        try {
            response = await fetch("http://localhost:3000/reserve", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: 'include',
                body: JSON.stringify(reservationData)
            });
            console.log("Reservation response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Reservation failed:", errorText);
                throw new Error(`Reservation failed: ${response.status} - ${errorText}`);
            }

            const responseData = await response.json();
            console.log("Reservation successful:", responseData);

            alert("Reservation successful! Your session has been booked.");
            // Clear the form
            document.getElementById("reservationForm").reset();
        } catch (fetchError) {
            console.error("Network error while making reservation:", fetchError);
            throw new Error(`Network error while making reservation: ${fetchError.message}`);
        }
    } catch (error) {
        console.error("Detailed error making reservation:", error);
        alert(`Failed to make reservation: ${error.message}`);
    }
}

// Function to close reservation modal
function closeReservation() {
    document.getElementById("reserve-session").classList.add("hidden");
}

function openChangePasswordModal() {
    let modal = document.getElementById("changePasswordModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex"); // Add flex dynamically
}

function closeChangePasswordModal() {
    let modal = document.getElementById("changePasswordModal");
    modal.classList.remove("flex");
    modal.classList.add("hidden");
}

function changePassword() {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword = document.getElementById("confirmNewPassword").value;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert("Please fill out all fields.");
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert("New passwords do not match.");
        return;
    }

    const userId = new URLSearchParams(window.location.search).get("id");
    console.log("User ID being sent:", userId);

    fetch("http://localhost:3000/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            idNumber: userId,
            currentPassword: currentPassword,
            newPassword: newPassword
        }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Password updated successfully!");
                closeChangePasswordModal();
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("An error occurred while updating the password.");
        });
}

function logout() {
    fetch("/logout", { method: "POST" })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            localStorage.clear();  // Clear stored session info
            sessionStorage.clear();
            window.location.href = "login.html"; // Redirect to login
        })
        .catch(error => console.error("Logout error:", error));
}

// Function to load reservation history
async function loadReservationHistory() {
    try {
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        const response = await fetch("http://localhost:3000/reservations");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reservations = await response.json();
        
        // Filter reservations for current user
        const userReservations = reservations.filter(res => res.idNumber === userId);
        
        const tableBody = document.getElementById("reservationTableBody");
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
                    }">
                        ${reservation.status}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading reservations:", error);
        const tableBody = document.getElementById("reservationTableBody");
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Error loading reservations</td></tr>';
    }
}

// Function to submit feedback
async function submitFeedback() {
    const feedbackType = document.getElementById("feedbackType").value;
    const message = document.getElementById("feedbackMessage").value.trim();
    const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");

    if (!message) {
        alert("Please enter your feedback message.");
        return;
    }

    try {
        const response = await fetch("/submit-feedback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId,
                type: feedbackType,
                message,
                date: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            alert("Thank you for your feedback!");
            document.getElementById("feedbackMessage").value = '';
            document.getElementById("feedbackType").selectedIndex = 0;
        } else {
            throw new Error(result.message || "Failed to submit feedback");
        }
    } catch (error) {
        console.error("Error submitting feedback:", error);
        alert("Failed to submit feedback. Please try again later.");
    }
}

// Function to load sit-in history
async function loadSitInHistory() {
    try {
        const userId = localStorage.getItem("currentUserId") || new URLSearchParams(window.location.search).get("id");
        const response = await fetch("http://localhost:3000/sit-ins");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sitIns = await response.json();
        
        // Filter sit-ins for current user
        const userSitIns = sitIns.filter(sitIn => sitIn.idNumber === userId);
        
        const tableBody = document.getElementById("sitInTableBody");
        tableBody.innerHTML = '';

        if (userSitIns.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No sit-in history found</td></tr>';
            return;
        }

        userSitIns.forEach(sitIn => {
            const row = document.createElement("tr");
            const timeIn = new Date(sitIn.timeIn).toLocaleTimeString();
            const timeOut = sitIn.timeOut ? new Date(sitIn.timeOut).toLocaleTimeString() : '-';
            const date = new Date(sitIn.timeIn).toLocaleDateString();
            
            row.innerHTML = `
                <td class="border px-4 py-2">${date}</td>
                <td class="border px-4 py-2">${timeIn}</td>
                <td class="border px-4 py-2">${timeOut}</td>
                <td class="border px-4 py-2">${sitIn.purpose}</td>
                <td class="border px-4 py-2">
                    <span class="px-2 py-1 rounded text-sm ${
                        sitIn.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                        sitIn.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }">
                        ${sitIn.status}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading sit-in history:", error);
        const tableBody = document.getElementById("sitInTableBody");
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-500">Error loading sit-in history</td></tr>';
    }
}

// Handle page load and section visibility
document.addEventListener("DOMContentLoaded", function () {
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

    // Fetch user data from the server endpoint
    fetch(`http://localhost:3000/get-profile?id=${userId || localStorage.getItem("currentUserId")}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch user data");
            }
            return response.json();
        })
        .then(userData => {
            console.log("Fetched User Data:", userData);

            // Update form fields with user data
            document.getElementById("idNumber").value = userData.idNumber;
            document.getElementById("firstname").value = userData.firstName;
            document.getElementById("middlename").value = userData.middleName || "";
            document.getElementById("lastname").value = userData.lastName;
            document.getElementById("email").value = userData.email;
            document.getElementById("year").value = userData.year;
            document.getElementById("course").value = userData.course;

            // Set Remaining Sessions based on course
            const remainingSessions = ["BS Computer Science", "BS Information Technology", "BS Software Engineering"].includes(userData.course) ? 15 : 10;
            document.getElementById("remainingSessions").textContent = remainingSessions;

            // Set the profile picture if it exists
            if (userData.profileImage) {
                document.getElementById("profilePic").src = userData.profileImage;
            }
        })
        .catch(error => {
            console.error("Error loading profile data:", error);
            alert("Failed to load user data. Please try refreshing the page.");
        });

    // Get all menu links
    const menuLinks = document.querySelectorAll(".w-64 ul li a");

    // Add click event listeners to menu links
    menuLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            let targetId = this.getAttribute("href").substring(1);
            let targetSection = document.getElementById(targetId);

            if (targetSection) {
                hideAllSections();
                targetSection.classList.remove("hidden");
                localStorage.setItem("activeSection", targetId);
            }
        });
    });

    // Get the saved section from localStorage or default to dashboard
    const savedSection = localStorage.getItem("activeSection") || "dashboard";
    showSection(savedSection);

    // Load initial data
    loadAnnouncements();
    loadReservationHistory();
    loadSitInHistory();
    
    // Check for new announcements
    checkNewAnnouncements();
    
    // Set up periodic checks for new announcements (every 30 seconds)
    setInterval(checkNewAnnouncements, 30000);
}); 