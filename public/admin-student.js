// Function to show the add student modal
function showAddStudentModal() {
    const modal = document.getElementById('add-student-modal');
    modal.classList.remove('hidden');
}

// Function to hide the add student modal
function hideAddStudentModal() {
    const modal = document.getElementById('add-student-modal');
    modal.classList.add('hidden');
}

// Function to generate default password
function generateDefaultPassword(idNumber) {
    return `ucmn-${idNumber}`;
}

// Initialize the add student form
document.addEventListener('DOMContentLoaded', function() {
    const addStudentForm = document.getElementById('add-student-form');
    const closeModalBtn = document.getElementById('close-add-student-modal');
    const cancelBtn = document.getElementById('cancel-add-student');

    // Close modal when clicking the close button
    closeModalBtn.addEventListener('click', hideAddStudentModal);
    
    // Close modal when clicking the cancel button
    cancelBtn.addEventListener('click', hideAddStudentModal);
    
    // Handle form submission
    addStudentForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Get form values
        const idNumber = document.getElementById('new-id-number').value.trim();
        const email = document.getElementById('new-email').value.trim();
        const firstName = document.getElementById('new-first-name').value.trim();
        const middleName = document.getElementById('new-middle-name').value.trim();
        const lastName = document.getElementById('new-last-name').value.trim();
        const course = document.getElementById('new-course').value;
        const year = document.getElementById('new-year').value;
        
        // Generate default password
        const defaultPassword = generateDefaultPassword(idNumber);
        
        try {
            // Send request to create new student
            const response = await fetch('/admin/create-student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    idNumber,
                    email,
                    firstName,
                    middleName,
                    lastName,
                    course,
                    year,
                    password: defaultPassword
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Show success message
                ErrorToast.success('Student created successfully!');
                
                // Hide modal
                hideAddStudentModal();
                
                // Refresh student list
                fetchStudents();
                
                // Clear form
                addStudentForm.reset();
            } else {
                // Show error message
                ErrorToast.error(result.message || 'Failed to create student');
            }
        } catch (error) {
            console.error('Error creating student:', error);
            ErrorToast.error('An error occurred while creating the student');
        }
    });
}); 