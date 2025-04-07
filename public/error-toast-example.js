/**
 * Error Toast Integration Example
 * This file demonstrates how to replace alerts with ErrorToast in various scenarios
 */

// Example 1: Basic form validation
function validateForm() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    
    if (!name || !email) {
        // OLD WAY: alert('Please fill in all required fields');
        // NEW WAY:
        ErrorToast.warning('Please fill in all required fields');
        return false;
    }
    
    if (!email.includes('@')) {
        // OLD WAY: alert('Please enter a valid email address');
        // NEW WAY:
        ErrorToast.error('Please enter a valid email address');
        return false;
    }
    
    // Success notification
    // OLD WAY: alert('Form submitted successfully!');
    // NEW WAY:
    ErrorToast.success('Form submitted successfully!');
    return true;
}

// Example 2: API error handling
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        // Process data...
        
        // Success notification
        ErrorToast.success('Data loaded successfully!');
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        
        // OLD WAY: alert('Error loading data: ' + error.message);
        // NEW WAY:
        ErrorToast.error('Error loading data: ' + error.message);
        return null;
    }
}

// Example 3: Confirmation with better UX
function deleteItem(id) {
    // OLD WAY:
    // if (confirm('Are you sure you want to delete this item?')) {
    //     // delete logic
    //     alert('Item deleted!');
    // }
    
    // NEW WAY:
    // Instead of confirm, show a custom modal (not part of ErrorToast)
    // After deletion completes:
    ErrorToast.success('Item deleted successfully!');
}

// Example 4: Warning about potentially dangerous action
function resetData() {
    // OLD WAY: alert('Warning: This action cannot be undone!');
    // NEW WAY:
    ErrorToast.warning('Warning: This action cannot be undone!', { duration: 8000 });
    
    // Proceed with caution...
}

// Example 5: Informational message
function showHelp() {
    // OLD WAY: alert('Click the gear icon to access settings');
    // NEW WAY:
    ErrorToast.info('Click the gear icon to access settings');
}

// Example 6: Replacing alerts in admin.js walk-in creation
function createWalkin() {
    const idNumber = document.getElementById('walkin-student-id').value;
    const programmingLanguage = document.getElementById('walkin-programming-language').value;
    const labRoom = document.getElementById('walkin-lab-room').value;
    
    // Validate required fields
    if (!idNumber || !programmingLanguage || !labRoom) {
        // OLD WAY: alert('Please fill in all required fields');
        // NEW WAY:
        ErrorToast.warning('Please fill in all required fields');
        return;
    }
    
    // Form submission logic...
    
    // On success:
    // OLD WAY: alert(`Walk-in created successfully! The student now has ${remainingSessions} remaining sessions.`);
    // NEW WAY:
    ErrorToast.success(`Walk-in created successfully! The student now has ${remainingSessions} remaining sessions.`);
    
    // On error:
    // OLD WAY: alert('Error creating walk-in: ' + error.message);
    // NEW WAY:
    ErrorToast.error('Error creating walk-in: ' + error.message);
}

// Example 7: Handling announcement actions
function deleteAnnouncement() {
    // On success:
    // OLD WAY: alert('Announcement deleted successfully!');
    // NEW WAY:
    ErrorToast.success('Announcement deleted successfully!');
    
    // On error:
    // OLD WAY: alert('Error: ' + error.message);
    // NEW WAY:
    ErrorToast.error('Error: ' + error.message);
}

// Example 8: Validation with different toast durations
function validateWithCustomDuration() {
    // Short error for simple issues
    ErrorToast.error('Username already taken', { duration: 3000 });
    
    // Longer duration for more complex messages
    ErrorToast.warning(
        'Your session will expire in 5 minutes. Please save your work.',
        { duration: 10000 }
    );
}

/**
 * IMPLEMENTATION STEPS
 * 
 * To replace alerts in your application:
 * 
 * 1. Add the error-toast.js reference to your HTML files:
 *    <script src="/public/error-toast.js"></script>
 * 
 * 2. Replace alert() calls with the appropriate ErrorToast method:
 *    - ErrorToast.error() for errors
 *    - ErrorToast.warning() for warnings
 *    - ErrorToast.success() for success messages
 *    - ErrorToast.info() for informational messages
 * 
 * 3. For alerts that need to block execution, consider using:
 *    - Custom modal dialogs with callbacks
 *    - Async/await patterns with Promises
 * 
 * 4. Reset error tracking when navigating between pages:
 *    ErrorToast.reset();
 */ 