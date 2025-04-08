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

// Define our toast notification component
const ErrorToast = {
    toasts: [],
    container: null,
    
    init() {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 350px;
                }
                
                .toast {
                    padding: 15px 20px;
                    border-radius: 4px;
                    color: white;
                    font-size: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    animation: slideIn 0.3s ease;
                    word-break: break-word;
                }
                
                .toast-error {
                    background-color: #f44336;
                }
                
                .toast-warning {
                    background-color: #ff9800;
                }
                
                .toast-success {
                    background-color: #4caf50;
                }
                
                .toast-info {
                    background-color: #2196f3;
                }
                
                .toast-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                    margin-left: 10px;
                    opacity: 0.8;
                    padding: 0;
                }
                
                .toast-close:hover {
                    opacity: 1;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    showToast(message, type = 'info', duration = 5000) {
        this.init();
        
        // Check if a toast with the same message is already displayed
        if (this.toasts.some(t => t.message === message)) {
            return;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Create message span
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        toast.appendChild(messageSpan);
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => this.removeToast(toast));
        toast.appendChild(closeButton);
        
        // Add toast to container
        this.container.appendChild(toast);
        
        // Add to tracking array
        const toastObj = { element: toast, message };
        this.toasts.push(toastObj);
        
        // Set auto dismiss
        if (duration) {
            setTimeout(() => {
                if (this.container.contains(toast)) {
                    this.removeToast(toast);
                }
            }, duration);
        }
        
        return toast;
    },
    
    removeToast(toast) {
        // Add fadeout animation
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        
        // Remove after animation
        setTimeout(() => {
            if (this.container.contains(toast)) {
                this.container.removeChild(toast);
                // Remove from tracking array
                this.toasts = this.toasts.filter(t => t.element !== toast);
            }
        }, 300);
    },
    
    // Convenience methods
    error(message, duration = 8000) {
        return this.showToast(message, 'error', duration);
    },
    
    warning(message, duration = 5000) {
        return this.showToast(message, 'warning', duration);
    },
    
    success(message, duration = 5000) {
        return this.showToast(message, 'success', duration);
    },
    
    info(message, duration = 5000) {
        return this.showToast(message, 'info', duration);
    }
};

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    ErrorToast.init();
});

// Store the original alert function
const originalAlert = window.alert;

// Override the default alert function
window.alert = function(message) {
    if (typeof ErrorToast !== 'undefined') {
        // Try to determine the type of message for appropriate styling
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('error') || lowerMessage.includes('fail') || lowerMessage.includes('invalid')) {
            ErrorToast.error(message);
        } else if (lowerMessage.includes('warning') || lowerMessage.includes('caution')) {
            ErrorToast.warning(message);
        } else if (lowerMessage.includes('success') || lowerMessage.includes('successfully')) {
            ErrorToast.success(message);
        } else {
            ErrorToast.info(message);
        }
    } else {
        // Fall back to original alert if ErrorToast is not available
        originalAlert(message);
    }
}; 