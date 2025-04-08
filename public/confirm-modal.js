// Confirm Modal Component
// A styled replacement for the browser's default confirm dialog

// Create the modal elements
const createConfirmModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'styled-confirm-modal';
  modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center hidden';
  modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden animate-fadeIn';
  modalContent.style.animation = 'fadeIn 0.2s ease-out';
  
  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-20px); }
    }
  `;
  document.head.appendChild(style);
  
  const modalBody = document.createElement('div');
  modalBody.className = 'p-6';
  
  const messageElement = document.createElement('h3');
  messageElement.id = 'confirm-modal-message';
  messageElement.className = 'text-lg font-medium text-gray-900 mb-4';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex justify-end gap-3 mt-6';
  
  const cancelButton = document.createElement('button');
  cancelButton.id = 'confirm-modal-cancel';
  cancelButton.className = 'px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400';
  cancelButton.textContent = 'Cancel';
  
  const confirmButton = document.createElement('button');
  confirmButton.id = 'confirm-modal-ok';
  confirmButton.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400';
  confirmButton.textContent = 'OK';
  
  // Assemble the modal
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(confirmButton);
  
  modalBody.appendChild(messageElement);
  modalBody.appendChild(buttonContainer);
  
  modalContent.appendChild(modalBody);
  modalContainer.appendChild(modalContent);
  
  return { 
    container: modalContainer, 
    message: messageElement,
    cancelButton,
    confirmButton,
    content: modalContent
  };
};

// Global variables for tracking modal state
let isModalOpen = false;
let currentResolve = null;
let currentReject = null;
let modalElements = null;

// Initialize the modal
const initModal = () => {
  if (!modalElements) {
    modalElements = createConfirmModal();
    document.body.appendChild(modalElements.container);
    
    // Set up permanent event listeners
    modalElements.confirmButton.addEventListener('click', () => {
      if (currentResolve) {
        currentResolve(true);
      }
      hideModal();
    });
    
    modalElements.cancelButton.addEventListener('click', () => {
      if (currentResolve) {
        currentResolve(false);
      }
      hideModal();
    });
    
    // Close on background click
    modalElements.container.addEventListener('click', (e) => {
      if (e.target === modalElements.container) {
        if (currentResolve) {
          currentResolve(false);
        }
        hideModal();
      }
    });
    
    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        if (currentResolve) {
          currentResolve(false);
        }
        hideModal();
      }
    });
  }
};

// Show the modal with a message
const showModal = (message) => {
  initModal();
  modalElements.message.textContent = message;
  modalElements.container.classList.remove('hidden');
  isModalOpen = true;
  
  // Focus the OK button
  setTimeout(() => {
    modalElements.confirmButton.focus();
  }, 100);
};

// Hide the modal
const hideModal = () => {
  if (!modalElements) return;
  
  // Add fade out animation
  modalElements.content.style.animation = 'fadeOut 0.2s ease-out';
  
  // Wait for animation to finish before hiding
  setTimeout(() => {
    modalElements.container.classList.add('hidden');
    modalElements.content.style.animation = 'fadeIn 0.2s ease-out';
    isModalOpen = false;
    currentResolve = null;
    currentReject = null;
  }, 200);
};

// The main function to show a confirmation dialog
const confirmDialog = (message) => {
  return new Promise((resolve, reject) => {
    currentResolve = resolve;
    currentReject = reject;
    showModal(message);
  });
};

// Expose the function globally
window.styledConfirm = confirmDialog;

// Store original window.confirm
const originalConfirm = window.confirm;

// Override window.confirm to use our styled confirm dialog
window.confirm = async function(message) {
  // Show our styled confirm dialog
  const result = await styledConfirm(message);
  
  // Return the result synchronously
  return result;
};

// Function to convert existing code using synchronous confirms to use our async version
window.patchConfirmFunctions = () => {
  // Store references to functions that use confirm()
  const functionsUsingConfirm = [];
  
  // Find and patch reset by semester button
  const resetSemesterBtn = document.getElementById('reset-semester-btn');
  if (resetSemesterBtn) {
    console.log("Found reset semester button, patching...");
    
    // Remove the button and replace with a clone to remove existing event listeners
    const newBtn = resetSemesterBtn.cloneNode(true);
    if (resetSemesterBtn.parentNode) {
      resetSemesterBtn.parentNode.replaceChild(newBtn, resetSemesterBtn);
      
      // Add new event listener with async/await pattern
      newBtn.addEventListener("click", async function(e) {
        // Stop any other event handlers
        e.preventDefault();
        e.stopPropagation();
        
        const semesterSelect = document.getElementById('semester-select');
        const selectedSemester = semesterSelect.value;
        
        if (!selectedSemester) {
          ErrorToast.warning('Please select a semester first');
          return;
        }
        
        // Use our styled confirm instead of browser confirm
        const confirmed = await styledConfirm(`This operation requires administrator privileges. Are you sure you want to reset all ${selectedSemester} sessions? This action cannot be undone.`);
        if (!confirmed) {
          return;
        }
        
        // The rest of the original function...
        let originalButtonText = newBtn.innerHTML;
        
        try {
          // Show loading state
          newBtn.disabled = true;
          newBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          `;
          
          // Ensure admin is authenticated
          let isAdmin = await checkAdminAuth();
          if (!isAdmin) {
            const loginSuccess = await autoLoginAdmin();
            if (!loginSuccess) {
              ErrorToast.error('Authentication failed. Please log in as an administrator.');
              return;
            }
          }
          
          const response = await fetch('http://localhost:3000/reset-sessions', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              semester: selectedSemester 
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            ErrorToast.success(result.message || `${selectedSemester} sessions reset successfully`);
            
            // Log the reset action
            logResetAction('semester', selectedSemester);
            
            // Refresh relevant data
            await fetchSitIns();
            await updateRecordsCharts();
          } else {
            if (response.status === 403 || response.status === 401) {
              ErrorToast.warning('This operation has been logged. Only administrators can reset semester sessions.');
            } else {
              let errorMsg = `Failed to reset semester sessions: ${response.status}`;
              try {
                const data = await response.json();
                if (data && data.error) {
                  errorMsg = data.error;
                }
                console.error('Server returned error:', data);
                ErrorToast.error('Error: ' + errorMsg);
              } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                ErrorToast.error('Error: ' + errorMsg);
              }
            }
          }
        } catch (error) {
          console.error('Error resetting semester sessions:', error);
          if (!error.message.includes('403') && !error.message.includes('401')) {
            ErrorToast.error('Error: ' + (error.message || 'Unknown error occurred while resetting sessions'));
          }
        } finally {
          // Restore button state
          newBtn.disabled = false;
          newBtn.innerHTML = originalButtonText;
        }
      });
    }
  }
  
  // Find and patch reset by user button
  const resetUserBtn = document.getElementById('reset-user-btn');
  if (resetUserBtn) {
    console.log("Found reset user button, patching...");
    
    // Remove the button and replace with a clone to remove existing event listeners
    const newBtn = resetUserBtn.cloneNode(true);
    if (resetUserBtn.parentNode) {
      resetUserBtn.parentNode.replaceChild(newBtn, resetUserBtn);
      
      // Add new event listener with async/await pattern
      newBtn.addEventListener("click", async function(e) {
        // Stop any other event handlers
        e.preventDefault();
        e.stopPropagation();
        
        const userIdInput = document.getElementById('user-id-input');
        const userId = userIdInput.value.trim();
        
        if (!userId) {
          ErrorToast.warning('Please enter a student ID first');
          return;
        }
        
        // Use our styled confirm instead of browser confirm
        const confirmed = await styledConfirm(`Are you sure you want to reset all sessions for student ${userId}? This action cannot be undone.`);
        if (!confirmed) {
          return;
        }
        
        // The rest of the original function...
        let originalButtonText = newBtn.innerHTML;
        
        try {
          // Prevent multiple clicks
          newBtn.disabled = true;
          newBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          `;
          
          // Ensure admin is authenticated
          let isAdmin = await checkAdminAuth();
          if (!isAdmin) {
            const loginSuccess = await autoLoginAdmin();
            if (!loginSuccess) {
              ErrorToast.error('Authentication failed. Please log in as an administrator.');
              return;
            }
          }
          
          const response = await fetch('http://localhost:3000/reset-sessions', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              idNumber: userId
            })
          });
          
          // Check for HTML response
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error('The reset sessions endpoint is not available. The operation could not be completed.');
          }
          
          if (!response.ok) {
            let errorMessage = `Failed to reset user sessions: ${response.status}`;
            try {
              const data = await response.json();
              if (data.error || data.message) {
                errorMessage = data.error || data.message;
              }
            } catch (e) {
              console.warn('Could not parse error response as JSON', e);
            }
            throw new Error(errorMessage);
          }
          
          let result;
          try {
            result = await response.json();
          } catch (e) {
            console.warn('Could not parse success response as JSON', e);
          }
          
          ErrorToast.success(result?.message || `Sessions for student ${userId} reset successfully`);
          
          // Log the reset action
          logResetAction('user', userId);
          
          // Refresh relevant data
          await fetchSitIns();
          await updateRecordsCharts();
          
          // Clear the selected student and input
          const selectedStudentInfo = document.querySelector('.selected-student-info');
          if (selectedStudentInfo) {
            selectedStudentInfo.classList.add('hidden');
          }
          userIdInput.value = '';
          
        } catch (error) {
          console.error('Error resetting user sessions:', error);
          ErrorToast.error('Error: ' + error.message);
        } finally {
          // Re-enable the button
          newBtn.disabled = false;
          newBtn.innerHTML = originalButtonText;
        }
      });
    }
  }
};

// More aggressive approach to ensure our event handlers run
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, running patchConfirmFunctions immediately");
  // Run immediately on DOM content loaded
  patchConfirmFunctions();
  
  // Also run after a short delay to ensure it runs after any other scripts
  setTimeout(patchConfirmFunctions, 100);
  setTimeout(patchConfirmFunctions, 500);
  setTimeout(patchConfirmFunctions, 1000);
});

// Also try to run right away if DOM is already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  console.log("Document already ready, running patchConfirmFunctions now");
  patchConfirmFunctions();
  setTimeout(patchConfirmFunctions, 100);
} 