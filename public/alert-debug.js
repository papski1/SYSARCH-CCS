// Only initialize if not already initialized
if (typeof window.originalAlert === 'undefined') {
    // Store the original alert function
    const originalAlert = window.alert;

    // Override the alert function
    window.alert = function(message) {
        // Log the stack trace to see where the alert is coming from
        console.error('Alert called with message:', message);
        console.error('Stack trace:', new Error().stack);
        
        // Call the original alert
        originalAlert(message);
    };
} 