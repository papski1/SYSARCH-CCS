/**
 * API Configuration Utility
 * Handles dynamic server URLs and intercepts fetch requests to fix URLs
 */

// Get the current server URL based on the client's hostname
function getServerUrl() {
    const hostname = window.location.hostname;
    const port = "3000"; // Backend always runs on port 3000
    return `http://${hostname}:${port}`;
}

// Base URL for all API requests
const API_BASE_URL = getServerUrl();

console.log(`API configured to use server at: ${API_BASE_URL}`);

// Patch the global fetch to intercept any requests to localhost
(function patchFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options) {
        // Fix localhost URLs
        if (typeof url === 'string') {
            // Replace localhost or 127.0.0.1 with the current hostname
            if (url.includes('http://localhost:3000') || url.includes('http://127.0.0.1:3000')) {
                const modifiedUrl = url.replace(/(http:\/\/)(localhost|127\.0\.0\.1)(:\d+)/, API_BASE_URL);
                console.log(`Redirecting fetch from ${url} to ${modifiedUrl}`);
                url = modifiedUrl;
            }
        }
        
        // Continue with the original fetch
        return originalFetch(url, options);
    };
})();

// Expose helper functions for use in other scripts
window.ApiConfig = {
    getBaseUrl: function() {
        return API_BASE_URL;
    },
    
    // Helper function to build API URLs
    buildUrl: function(endpoint) {
        // Make sure there's no double slash between base URL and endpoint
        if (endpoint.startsWith('/')) {
            endpoint = endpoint.substring(1);
        }
        return `${API_BASE_URL}/${endpoint}`;
    },
    
    // Helper function for login
    login: async function(identifier, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            // Add the success flag to make it easier to check in the login page
            if (response.ok) {
                return { ...data, success: true };
            } else {
                return { ...data, success: false };
            }
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, message: "Network or server error. Please try again." };
        }
    },
    
    // Fix relative URLs in the page to use the correct API server
    fixPageUrls: function() {
        // Fix all links in the page that reference localhost:3000
        document.querySelectorAll('a[href*="localhost:3000"], a[href*="127.0.0.1:3000"]').forEach(link => {
            link.href = link.href.replace(/(http:\/\/)(localhost|127\.0\.0\.1)(:\d+)/, API_BASE_URL);
            console.log(`Fixed link: ${link.href}`);
        });
    }
};

// Run URL fixer when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.ApiConfig.fixPageUrls();
}); 