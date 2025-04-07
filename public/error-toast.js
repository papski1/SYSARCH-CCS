/**
 * Error Toast Component
 * A reusable error toast notification system that ensures errors only appear once
 */

// Track displayed error messages to prevent duplicates
const displayedErrors = new Set();

// Create toast container if it doesn't exist
function ensureToastContainer() {
    let container = document.getElementById('error-toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'error-toast-container';
        container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md';
        document.body.appendChild(container);
    }
    
    return container;
}

/**
 * Show an error toast notification
 * @param {string} message - The error message to display
 * @param {Object} options - Configuration options
 * @param {number} options.duration - How long to show the toast in ms (default: 5000ms)
 * @param {string} options.type - Type of toast: 'error', 'warning', 'success', 'info' (default: 'error')
 * @returns {HTMLElement} The created toast element
 */
function showToast(message, options = {}) {
    const { 
        duration = 5000, 
        type = 'error'
    } = options;
    
    // Don't show duplicate errors
    const errorKey = `${type}:${message}`;
    if (displayedErrors.has(errorKey)) {
        return null;
    }
    
    // Add to displayed errors set
    displayedErrors.add(errorKey);
    
    // Get the container
    const container = ensureToastContainer();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'transition-all transform translate-x-full opacity-0 rounded-lg shadow-lg p-4 mb-2 flex items-start max-w-md';
    
    // Set toast style based on type
    switch (type) {
        case 'success':
            toast.classList.add('bg-green-600', 'text-white');
            break;
        case 'warning':
            toast.classList.add('bg-yellow-500', 'text-white');
            break;
        case 'info':
            toast.classList.add('bg-blue-600', 'text-white');
            break;
        case 'error':
        default:
            toast.classList.add('bg-red-600', 'text-white');
    }
    
    // Create icon based on type
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'mr-3 flex-shrink-0';
    
    let iconSvg = '';
    
    switch (type) {
        case 'success':
            iconSvg = `<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>`;
            break;
        case 'warning':
            iconSvg = `<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>`;
            break;
        case 'info':
            iconSvg = `<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>`;
            break;
        case 'error':
        default:
            iconSvg = `<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>`;
    }
    
    iconWrapper.innerHTML = iconSvg;
    toast.appendChild(iconWrapper);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'flex-1';
    content.textContent = message;
    toast.appendChild(content);
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ml-4 text-white hover:text-gray-100 focus:outline-none';
    closeBtn.innerHTML = `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>`;
    
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    toast.appendChild(closeBtn);
    
    // Add to container
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 10);
    
    // Setup auto-removal
    const timeoutId = setTimeout(() => {
        removeToast(toast);
    }, duration);
    
    // Store timeout ID on the element for cleanup
    toast._timeoutId = timeoutId;
    
    return toast;
}

/**
 * Remove a toast element with animation
 * @param {HTMLElement} toast - The toast element to remove
 */
function removeToast(toast) {
    if (!toast || toast._isRemoving) return;
    
    // Mark as removing to prevent duplicate removal
    toast._isRemoving = true;
    
    // Clear timeout if it exists
    if (toast._timeoutId) {
        clearTimeout(toast._timeoutId);
    }
    
    // Animate out
    toast.classList.add('opacity-0', 'translate-x-full');
    
    // Remove after animation completes
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
        
        // Clean up container if empty
        const container = document.getElementById('error-toast-container');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }, 300);
}

/**
 * Clear all toast messages
 */
function clearAllToasts() {
    const container = document.getElementById('error-toast-container');
    if (container) {
        Array.from(container.children).forEach(removeToast);
    }
    displayedErrors.clear();
}

/**
 * Reset the error tracking system
 * Useful when navigating to a new page or view
 */
function resetErrorTracking() {
    displayedErrors.clear();
}

// Convenience functions for different toast types
function showError(message, options = {}) {
    return showToast(message, { ...options, type: 'error' });
}

function showWarning(message, options = {}) {
    return showToast(message, { ...options, type: 'warning' });
}

function showSuccess(message, options = {}) {
    return showToast(message, { ...options, type: 'success' });
}

function showInfo(message, options = {}) {
    return showToast(message, { ...options, type: 'info' });
}

// Export the functions in a global ErrorToast object
window.ErrorToast = {
    error: showError,
    warning: showWarning,
    success: showSuccess,
    info: showInfo,
    clear: clearAllToasts,
    reset: resetErrorTracking
}; 