function showFeedbackMessage(message, type = "success") {
    const feedbackDiv = document.getElementById("feedbackMessage");
    
    // Apply styles based on type
    feedbackDiv.className = `mt-4 p-2 rounded text-center ${type === "success" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`;
    
    // Set message text
    feedbackDiv.innerText = message;

    // Show the feedback message
    feedbackDiv.classList.remove("hidden");

    // Auto-hide after 5 seconds
    setTimeout(() => {
        feedbackDiv.classList.add("hidden");
    }, 5000);
}
function processSitIn(user, status) {
    if (status === "success") {
        addFeedbackToAdmin(`Sit-in recorded successfully for ${user}.`, user, "success");
    } else {
        addFeedbackToAdmin(`Error: Unable to record sit-in for ${user}.`, user, "error");
    }
}

// Example trigger when a sit-in is recorded
processSitIn("John Doe", "success");

function openChangePasswordModal() {
    document.getElementById("changePasswordModal").classList.remove("hidden");
}

function closeChangePasswordModal() {
    document.getElementById("changePasswordModal").classList.add("hidden");
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