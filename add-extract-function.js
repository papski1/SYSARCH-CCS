/**
 * This script adds the extractLanguageName function to admin.js
 */

const fs = require('fs');
const path = require('path');

// Function to be added
const functionToAdd = `
/**
 * Extract just the programming language name from purpose field
 * @param {string} purpose - The purpose field (e.g., "Programming assistance (Java)")
 * @returns {string} - Just the language name (e.g., "Java")
 */
function extractLanguageName(purpose) {
    if (!purpose) return 'Not Specified';
    
    // For format: "Programming assistance (Java)"
    const match = purpose.match(/Programming assistance \\(([^)]+)\\)/i);
    if (match && match[1]) {
        return match[1].trim(); // Return just the language name
    }
    
    return purpose; // Return the original if no match
}
`;

// Main function
function addFunctionToAdminJs() {
    try {
        // Path to admin.js file
        const adminJsPath = path.join(__dirname, 'public', 'admin.js');
        
        console.log(`Reading file: ${adminJsPath}`);
        
        // Read the current file
        const fileData = fs.readFileSync(adminJsPath, 'utf8');
        console.log(`Admin.js file content length: ${fileData.length} characters`);
        
        // Create a backup
        fs.writeFileSync(`${adminJsPath}.backup`, fileData, 'utf8');
        console.log(`Created backup at ${adminJsPath}.backup`);
        
        // Add the function at the beginning of the file
        const newContent = functionToAdd + fileData;
        
        // Write the updated file
        fs.writeFileSync(adminJsPath, newContent, 'utf8');
        console.log(`Updated admin.js with extractLanguageName function`);
        
        console.log(`\nSuccess! The admin.js file has been updated.`);
        console.log(`Next steps:`);
        console.log(`1. Verify that charts are now showing just language names`);
        console.log(`2. If charts still show "Programming assistance", you may need to refresh or clear browser cache`);
        
    } catch (error) {
        console.error('Error updating admin.js:', error);
    }
}

// Run the function
addFunctionToAdminJs(); 