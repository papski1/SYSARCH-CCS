/**
 * Chart Labels Fix - SYSARCH-CCS
 * 
 * This file contains code to modify chart labels to:
 * 1. Extract only programming language names (remove "Programming assistance")
 * 2. Sort languages alphabetically
 * 
 * INSTRUCTIONS:
 * 1. Add the extractLanguageName function to your admin.js file
 * 2. Look for all occurrences where purpose is used for chart labels and apply the fix
 */

/**
 * Extract just the programming language name from purpose field
 * @param {string} purpose - The purpose field (e.g., "Programming assistance (Java)")
 * @returns {string} - Just the language name (e.g., "Java")
 */
function extractLanguageName(purpose) {
    if (!purpose) return 'Not Specified';
    
    // Check if it matches the pattern "Programming assistance (LanguageName)"
    const match = purpose.match(/Programming assistance \(([^)]+)\)/i);
    if (match && match[1]) {
        return match[1]; // Return just the language name
    }
    
    return purpose; // Return the original if no match
}

/**
 * Example modification for counting programming languages
 * 
 * Original code:
 */
// Count programming languages
const languageStats = {};
todaysSitIns.forEach(record => {
    const lang = record.purpose || 'Not Specified';
    languageStats[lang] = (languageStats[lang] || 0) + 1;
});

/**
 * Modified code:
 */
// Count programming languages
const languageStats = {};
todaysSitIns.forEach(record => {
    const lang = extractLanguageName(record.purpose || 'Not Specified');
    languageStats[lang] = (languageStats[lang] || 0) + 1;
});

/**
 * Example modification for creating the chart
 * 
 * Original code:
 */
window.programmingLanguageChart = new Chart(programmingLanguageCanvas, {
    type: 'pie',
    data: {
        labels: Object.keys(languageStats),
        datasets: [{
            data: Object.values(languageStats),
            // rest of the code...
        }]
    },
    // rest of options...
});

/**
 * Modified code with sorting:
 */
// Sort languages alphabetically
const sortedLanguages = Object.keys(languageStats).sort();
const sortedData = sortedLanguages.map(lang => languageStats[lang]);

window.programmingLanguageChart = new Chart(programmingLanguageCanvas, {
    type: 'pie',
    data: {
        labels: sortedLanguages,
        datasets: [{
            data: sortedData,
            // rest of the code...
        }]
    },
    // rest of options...
});

/**
 * Apply this pattern to all chart creation functions in admin.js
 * There are multiple occurrences of similar code throughout the file.
 * 
 * ADDITIONAL TIPS:
 * 
 * 1. If you want to modify the walk-in creation to not include "Programming assistance" in the purpose,
 *    change the lines that look like:
 * 
 *    purpose: `Programming assistance (${programmingLanguage})`
 * 
 *    to simply:
 * 
 *    purpose: programmingLanguage
 * 
 * 2. For existing data, you'll still need the extractLanguageName function to handle already stored records.
 * 
 * 3. Make sure to back up your files before making changes.
 */ 