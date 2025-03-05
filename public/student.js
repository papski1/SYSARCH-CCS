document.getElementById("reservationForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const purpose = document.getElementById("purpose").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;

    const response = await fetch("/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, purpose, date, time })
    });

    const result = await response.json();
    alert(result.message);
});

// Function to close reservation modal
function closeReservation() {
    document.getElementById("reserve-session").classList.add("hidden");
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
    const updatedData = {
        oldIdNumber: document.getElementById("oldIdNumber").value,
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
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Profile updated successfully!");
            } else {
                alert("Failed to update profile.");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error updating profile.");
        });
}

// Handle page load and section visibility
document.addEventListener("DOMContentLoaded", function () {
    const userId = new URLSearchParams(window.location.search).get("id");

    if (userId) {
        // Fetch user data including profile image path
        fetch(`http://localhost:3000/get-user?id=${userId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.user.profileImage) {
                    // Set the profile picture
                    document.getElementById("profilePic").src = data.user.profileImage;
                }
            })
            .catch(error => console.error("Error fetching user data:", error));
    }

    // Function to hide all sections
    function hideAllSections() {
        document.querySelectorAll("section").forEach(section => {
            section.classList.add("hidden");
        });
    }

    // Function to show the saved section from localStorage
    function showSavedSection() {
        let savedSection = localStorage.getItem("activeSection") || "dashboard"; // Default to dashboard
        let sectionToShow = document.getElementById(savedSection);
        if (sectionToShow) {
            hideAllSections();
            sectionToShow.classList.remove("hidden");
        }
    }

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

    // Show the saved section when the page loads
    showSavedSection();
});

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
document.addEventListener("DOMContentLoaded", function () {
    // Get user ID from the URL (e.g., student.html?id=232323)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("id");

    fetch("data.json")
        .then(response => response.json())
        .then(users => {
            console.log("Fetched Data:", users); // Debugging log

            // Find the user with the matching ID
            const user = users.find(u => u.idNumber === userId);

            if (user) {
                document.getElementById("idNumber").value = user.idNumber;
                document.getElementById("firstname").value = user.firstName;
                document.getElementById("middlename").value = user.middleName;
                document.getElementById("lastname").value = user.lastName;
                document.getElementById("email").value = user.email;
                document.getElementById("year").value = user.year;
                document.getElementById("course").value = user.course;

                // Set Remaining Sessions based on course
                const remainingSessions = ["Computer Science", "IT", "Software Engineering"].includes(user.course) ? 15 : 10;
                document.getElementById("remainingSessions").textContent = remainingSessions;
            } else {
                console.error("User not found!");
            }
        })
        .catch(error => console.error("Error loading profile data:", error));
});

function saveProfile() {
    const updatedData = {
        idNumber: document.getElementById("idNumber").value,
        firstName: document.getElementById("firstname").value,
        middleName: document.getElementById("middlename").value,
        lastName: document.getElementById("lastname").value,
        email: document.getElementById("email").value,
        year: document.getElementById("year").value,
        course: document.getElementById("course").value
    };

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
                alert("Failed to update profile.");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error updating profile.");
        });
}

document.addEventListener("DOMContentLoaded", function () {
    const menuLinks = document.querySelectorAll(".w-64 ul li a");

    function hideAllSections() {
        document.querySelectorAll("section").forEach(section => {
            section.classList.add("hidden");
        });
    }

    function showSavedSection() {
        let savedSection = localStorage.getItem("activeSection") || "dashboard"; // Default to Sit-in History if no selection
        let sectionToShow = document.getElementById(savedSection);
        if (sectionToShow) {
            hideAllSections();
            sectionToShow.classList.remove("hidden");
        }
    }

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

    showSavedSection();
});