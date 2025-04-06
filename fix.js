// Fetch and display students
async function fetchStudents() {
    try {
        const tableBody = document.getElementById("students-table");
        tableBody.innerHTML = "<tr><td colspan='5' class='text-center py-4'>Loading students...</td></tr>";

        const response = await fetch("http://localhost:3000/get-all-users?complete=true");
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
        const totalUsersCount = document.getElementById('total-students');
        if (totalUsersCount) {
            totalUsersCount.textContent = students.length;
        }

        // Add search functionality
        const searchBar = document.getElementById('search-bar');
        if (searchBar) {
            searchBar.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                const filteredStudents = students.filter(student => 
                    student.idNumber.toLowerCase().includes(searchTerm)
                );
                displayStudents(filteredStudents);
            });
        }

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
