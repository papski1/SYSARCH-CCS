/**
 * Fix for the tabs display issue in the Reports section
 * This ensures that only one tab content is visible at a time,
 * preventing the sit-in history table from showing up underneath
 * the user feedback table when the page is refreshed.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Tabs fix script loaded");
    
    // Initialize immediately
    fixTabsDisplay();
    
    // Also fix when showing the reports section
    const reportsLink = document.querySelector('a[href="#reports"]');
    if (reportsLink) {
        reportsLink.addEventListener('click', function() {
            // Wait for the section to be shown
            setTimeout(fixTabsDisplay, 100);
        });
    }
});

/**
 * Fix the tabs display by ensuring only one tab content is visible
 */
function fixTabsDisplay() {
    console.log("Fixing tabs display");
    
    // Get tab content areas
    const contentUserFeedback = document.getElementById('content-user-feedback');
    const contentCompletedSessions = document.getElementById('content-completed-sessions');
    
    // Only proceed if both content areas exist
    if (!contentUserFeedback || !contentCompletedSessions) {
        console.log("Tab content elements not found yet");
        return;
    }
    
    // Check which tab is active
    const tabUserFeedback = document.getElementById('tab-user-feedback');
    const tabCompletedSessions = document.getElementById('tab-completed-sessions');
    
    const isUserFeedbackActive = tabUserFeedback && 
        tabUserFeedback.classList.contains('border-blue-500') && 
        tabUserFeedback.classList.contains('text-blue-600');
        
    const isCompletedSessionsActive = tabCompletedSessions && 
        tabCompletedSessions.classList.contains('border-blue-500') && 
        tabCompletedSessions.classList.contains('text-blue-600');
    
    // If user feedback is active (default) or neither is active
    if (isUserFeedbackActive || (!isUserFeedbackActive && !isCompletedSessionsActive)) {
        // Show user feedback content, hide completed sessions
        contentUserFeedback.classList.remove('hidden');
        contentCompletedSessions.classList.add('hidden');
        console.log("Set User Feedback tab as active");
    } 
    // If completed sessions is active
    else if (isCompletedSessionsActive) {
        // Show completed sessions content, hide user feedback
        contentUserFeedback.classList.add('hidden');
        contentCompletedSessions.classList.remove('hidden');
        console.log("Set Completed Sessions tab as active");
    }
    
    // Also add a safeguard - ensure the completed sessions tab initializes properly
    // when it's clicked (reinforcing the existing event handler)
    if (tabCompletedSessions) {
        const originalClickHandler = tabCompletedSessions.onclick;
        tabCompletedSessions.onclick = function(event) {
            // Call original handler if it exists
            if (originalClickHandler) {
                originalClickHandler.call(this, event);
            }
            
            // Also make sure our display is correct
            if (contentUserFeedback && contentCompletedSessions) {
                contentUserFeedback.classList.add('hidden');
                contentCompletedSessions.classList.remove('hidden');
            }
        };
    }
} 