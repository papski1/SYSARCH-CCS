        // Add click event listeners for navigation
        const navLinks = document.querySelectorAll("nav a");
        navLinks.forEach(link => {
            link.addEventListener("click", function(event) {
                event.preventDefault();
                const targetId = this.getAttribute("href").substring(1);
                if (targetId) {
                    showSection(targetId);
                }
            });
        });
        
        // Show the dashboard by default or restore the last active section
        const savedSection = localStorage.getItem("adminActiveSection");
        if (savedSection && document.getElementById(savedSection)) {
            showSection(savedSection);
        } else {
            showSection("dashboard");
        }
