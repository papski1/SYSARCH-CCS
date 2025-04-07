/**
 * Script to update purpose fields in sit-ins.json
 * This script removes "Programming assistance" from purpose fields and keeps only the language name
 */

const fs = require('fs');
const path = require('path');

// Function to extract just the programming language name from purpose field
function extractLanguageName(purpose) {
    if (!purpose) return 'Not Specified';
    
    console.log(`Extracting from: "${purpose}"`);
    
    // For format: "Programming assistance (Java)"
    const match = purpose.match(/Programming assistance \(([^)]+)\)/i);
    if (match && match[1]) {
        const extracted = match[1].trim();
        console.log(`  Match found: "${extracted}"`);
        return extracted; // Return just the language name
    }
    
    console.log(`  No match found, returning original`);
    return purpose; // Return the original if no match
}

// Main function to update sit-ins.json
function updateSitInsFile() {
    try {
        // Path to sit-ins.json file
        const sitInsPath = path.join(__dirname, 'sit-ins.json');
        
        console.log(`Reading file: ${sitInsPath}`);
        
        // Read the current file
        const fileData = fs.readFileSync(sitInsPath, 'utf8');
        console.log(`File content length: ${fileData.length} characters`);
        console.log(`File content sample: ${fileData.substring(0, 100)}...`);
        
        // Parse the JSON data
        let sitIns;
        try {
            sitIns = JSON.parse(fileData);
            console.log(`JSON parsed successfully`);
        } catch (err) {
            console.error(`JSON parse error: ${err.message}`);
            return;
        }
        
        if (!Array.isArray(sitIns)) {
            console.error('Error: sit-ins.json does not contain an array');
            console.log(`Type: ${typeof sitIns}`);
            return;
        }
        
        console.log(`Read ${sitIns.length} records from sit-ins.json`);
        
        // Display sample record
        if (sitIns.length > 0) {
            console.log(`Sample record keys: ${Object.keys(sitIns[0]).join(', ')}`);
            console.log(`Sample purpose field: "${sitIns[0].purpose}"`);
        }
        
        // Create a backup of the file
        fs.writeFileSync(`${sitInsPath}.backup`, fileData, 'utf8');
        console.log(`Created backup at ${sitInsPath}.backup`);
        
        // Track changes
        let changesCount = 0;
        
        // Update each record
        sitIns = sitIns.map(record => {
            // Check if purpose field exists
            if (!record.purpose) {
                console.log(`Record ${record.id || 'unknown'}: No purpose field`);
                return record;
            }
            
            console.log(`Record ${record.id || 'unknown'}: Purpose = "${record.purpose}"`);
            
            if (record.purpose.includes('Programming assistance')) {
                const oldPurpose = record.purpose;
                record.purpose = extractLanguageName(record.purpose);
                
                // Log the change
                console.log(`Updated: "${oldPurpose}" → "${record.purpose}"`);
                changesCount++;
            } else {
                console.log(`No match for Programming assistance pattern`);
            }
            return record;
        });
        
        // Write the updated data back to the file
        fs.writeFileSync(sitInsPath, JSON.stringify(sitIns, null, 2), 'utf8');
        
        console.log(`\nComplete: ${changesCount} records updated in sit-ins.json`);
        
    } catch (error) {
        console.error('Error updating sit-ins.json:', error);
    }
}

// Run the update
updateSitInsFile(); 