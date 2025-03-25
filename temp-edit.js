// Function to edit student
async function editStudent(idNumber) {
    try {
        // Find student from the global array
        const student = window.allStudents.find(s => s.idNumber === idNumber);
        if (!student) {
            console.error("Student not found");
            return;
        }

        // Create modal for editing
        const modalHTML = `
        <div id="edit-student-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-700">Edit Student</h3>
                    <button id="close-edit-modal" class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <form id="edit-student-form" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                            <input type="text" id="edit-id-number" class="w-full p-2 border border-gray-300 rounded-lg" value="${student.idNumber}" readonly>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="edit-email" class="w-full p-2 border border-gray-300 rounded-lg" value="${student.email || ''}">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input type="text" id="edit-first-name" class="w-full p-2 border border-gray-300 rounded-lg" value="${student.firstName || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                            <input type="text" id="edit-middle-name" class="w-full p-2 border border-gray-300 rounded-lg" value="${student.middleName || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input type="text" id="edit-last-name" class="w-full p-2 border border-gray-300 rounded-lg" value="${student.lastName || ''}">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
                            <select id="edit-course" class="w-full p-2 border border-gray-300 rounded-lg">
                                <option value="BS Information Technology" ${student.course === 'BS Information Technology' ? 'selected' : ''}>BS Information Technology</option>
                                <option value="BS Computer Science" ${student.course === 'BS Computer Science' ? 'selected' : ''}>BS Computer Science</option>
                                <option value="BS Information Systems" ${student.course === 'BS Information Systems' ? 'selected' : ''}>BS Information Systems</option>
                                <option value="BS Computer Engineering" ${student.course === 'BS Computer Engineering' ? 'selected' : ''}>BS Computer Engineering</option>
                                <option value="BS Business Administration" ${student.course === 'BS Business Administration' ? 'selected' : ''}>BS Business Administration</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <select id="edit-year" class="w-full p-2 border border-gray-300 rounded-lg">
                                <option value="1st Year" ${student.year === '1st Year' ? 'selected' : ''}>1st Year</option>
                                <option value="2nd Year" ${student.year === '2nd Year' ? 'selected' : ''}>2nd Year</option>
                                <option value="3rd Year" ${student.year === '3rd Year' ? 'selected' : ''}>3rd Year</option>
                                <option value="4th Year" ${student.year === '4th Year' ? 'selected' : ''}>4th Year</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mt-4 flex justify-end space-x-3">
                        <button type="button" id="cancel-edit" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
        `;

        // Append modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Add event listeners
        document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
        document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
        document.getElementById('edit-student-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveStudentChanges(idNumber);
        });

    } catch (error) {
        console.error("Error opening edit modal:", error);
        alert("Error opening edit modal. Please try again.");
    }
}

// Save student changes
async function saveStudentChanges(idNumber) {
    try {
        // Get all the form values
        const updatedStudent = {
            idNumber,
            email: document.getElementById('edit-email').value,
            firstName: document.getElementById('edit-first-name').value,
            middleName: document.getElementById('edit-middle-name').value,
            lastName: document.getElementById('edit-last-name').value,
            course: document.getElementById('edit-course').value,
            year: document.getElementById('edit-year').value
        };

        // Validate form
        if (!updatedStudent.firstName || !updatedStudent.lastName || !updatedStudent.email) {
            alert("First name, last name, and email are required fields");
            return;
        }

        // Send update request to server
        const response = await fetch('/update-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedStudent)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update student');
        }

        const data = await response.json();

        // Close modal after successful update
        closeEditModal();

        // Show success message
        const successMessage = document.createElement('div');
        successMessage.classList.add('fixed', 'top-4', 'right-4', 'bg-green-500', 'text-white', 'px-6', 'py-3', 'rounded-lg', 'shadow-md', 'z-50');
        successMessage.innerHTML = `
            <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>Student updated successfully!</span>
            </div>
        `;
        document.body.appendChild(successMessage);

        // Remove success message after 3 seconds
        setTimeout(() => {
            successMessage.remove();
        }, 3000);

        // Refresh student list
        fetchStudents();

    } catch (error) {
        console.error("Error updating student:", error);
        alert("Error updating student: " + (error.message || "Unknown error occurred"));
    }
} 