/**
 * This script updates the walk-in form to not include "Programming assistance" in the purpose field
 */

const fs = require('fs');
const path = require('path');

// Main function to update admin.js
function updateWalkinForm() {
    try {
        // Path to admin.js file
        const adminJsPath = path.join(__dirname, 'public', 'admin.js');
        
        console.log(`Reading file: ${adminJsPath}`);
        
        // Read the current file
        const fileData = fs.readFileSync(adminJsPath, 'utf8');
        console.log(`Admin.js file content length: ${fileData.length} characters`);
        
        // Make sure we have a backup
        if (!fs.existsSync(`${adminJsPath}.backup2`)) {
            fs.writeFileSync(`${adminJsPath}.backup2`, fileData, 'utf8');
            console.log(`Created backup at ${adminJsPath}.backup2`);
        } else {
            console.log(`Backup already exists at ${adminJsPath}.backup2`);
        }
        
        // Pattern to find walk-in form submission
        const pattern = /(body:\s*JSON\.stringify\(\{\s*idNumber,\s*date:[^,]+,\s*time:[^,]+,\s*programmingLanguage,\s*labRoom,\s*)purpose:\s*`Programming assistance \(\${programmingLanguage}\)`/g;
        
        // Replace with just the language name
        const replacement = '$1purpose: programmingLanguage';
        
        // Update the content
        const updatedContent = fileData.replace(pattern, replacement);
        
        // Write the updated file
        fs.writeFileSync(adminJsPath, updatedContent, 'utf8');
        console.log(`Updated walk-in form to not include "Programming assistance" in purpose field`);
        
        console.log(`\nSuccess! The admin.js file has been updated.`);
        console.log(`Next steps:`);
        console.log(`1. New walk-in submissions will now just use the language name in the purpose field`);
        console.log(`2. This change won't affect existing records`);
        
    } catch (error) {
        console.error('Error updating admin.js:', error);
    }
}

// Run the function
updateWalkinForm(); 