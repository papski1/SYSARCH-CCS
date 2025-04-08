// Override the global alert function to use ErrorToast
window.alert = function(message) {
    // Check if ErrorToast is available
    if (typeof ErrorToast !== 'undefined') {
        // Try to determine the type of message
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('error') || lowerMessage.includes('failed')) {
            ErrorToast.error(message);
        } else if (lowerMessage.includes('success') || lowerMessage.includes('successfully')) {
            ErrorToast.success(message);
        } else if (lowerMessage.includes('warning') || lowerMessage.includes('please')) {
            ErrorToast.warning(message);
        } else {
            ErrorToast.info(message);
        }
    } else {
        // Fallback to original alert if ErrorToast is not available
        console.warn('ErrorToast not available, falling back to original alert');
        originalAlert(message);
    }
};

// Store the original alert function
const originalAlert = window.alert; 