/**
 * This script updates the chart creation code in admin.js to:
 * 1. Use the extractLanguageName function
 * 2. Sort languages alphabetically
 */

const fs = require('fs');
const path = require('path');

// Function to update chart data extraction
function updateChartDataExtraction(content) {
    // Pattern 1: Find code that looks like:
    // const languageStats = {};
    // todaysSitIns.forEach(record => {
    //     const lang = record.purpose || 'Not Specified';
    //     languageStats[lang] = (languageStats[lang] || 0) + 1;
    // });
    
    const pattern1 = /const\s+languageStats\s*=\s*{}\s*;\s*todaysSitIns\.forEach\(\s*record\s*=>\s*{\s*const\s+lang\s*=\s*record\.purpose\s*\|\|\s*['"]Not Specified['"];\s*languageStats\[lang\]\s*=\s*\(languageStats\[lang\]\s*\|\|\s*0\)\s*\+\s*1;\s*}\);/g;
    
    const replacement1 = `const languageStats = {};
    todaysSitIns.forEach(record => {
        const lang = extractLanguageName(record.purpose) || 'Not Specified';
        languageStats[lang] = (languageStats[lang] || 0) + 1;
    });`;
    
    content = content.replace(pattern1, replacement1);
    
    // Pattern 2: Find code that looks like:
    // sessions.forEach(session => {
    //     if (session.purpose) {
    //         const language = session.purpose.trim();
    //         languageStats[language] = (languageStats[language] || 0) + 1;
    //     }
    // });
    
    const pattern2 = /(sessions\.forEach\(\s*session\s*=>\s*{\s*if\s*\(\s*session\.purpose\s*\)\s*{\s*)const\s+language\s*=\s*session\.purpose\.trim\(\);(\s*languageStats\[language\]\s*=\s*\(languageStats\[language\]\s*\|\|\s*0\)\s*\+\s*1;\s*}\s*}\);)/g;
    
    const replacement2 = `$1const language = extractLanguageName(session.purpose.trim());$2`;
    
    content = content.replace(pattern2, replacement2);
    
    // Pattern 3: Find chart creation that doesn't sort languages:
    // window.programmingLanguageChart = new Chart(programmingLanguageCanvas, {
    //     type: 'pie',
    //     data: {
    //         labels: Object.keys(languageStats),
    //         datasets: [{
    //             data: Object.values(languageStats),
    
    const pattern3 = /(window\.programmingLanguageChart\s*=\s*new\s+Chart\(\s*programmingLanguageCanvas,\s*{\s*type:\s*['"]pie['"]\s*,\s*data:\s*{\s*)labels:\s*Object\.keys\(\s*languageStats\s*\),(\s*datasets:\s*\[\{\s*data:\s*)Object\.values\(\s*languageStats\s*\),/g;
    
    const replacement3 = `// Sort languages alphabetically
    const sortedLanguages = Object.keys(languageStats).sort();
    const sortedData = sortedLanguages.map(lang => languageStats[lang]);
    
    $1labels: sortedLanguages,$2sortedData,`;
    
    content = content.replace(pattern3, replacement3);
    
    // Pattern 4: Update updateDashboardChart to sort languages
    const pattern4 = /(function\s+updateDashboardChart\(\s*sessions\s*\)\s*{[\s\S]+?if\s*\(\s*typeof\s+Chart\s*!==\s*['"]undefined['"]\s*\)\s*{\s*window\.studentStatsChart\s*=\s*new\s+Chart\(\s*ctx,\s*{\s*type:\s*['"]pie['"]\s*,\s*data:\s*{\s*)labels:\s*languageLabels,(\s*datasets:\s*\[\{\s*data:\s*)languageData,/g;
    
    const replacement4 = `$1labels: Object.keys(languageStats).sort(),$2Object.keys(languageStats).sort().map(lang => languageStats[lang]),`;
    
    content = content.replace(pattern4, replacement4);
    
    return content;
}

// Main function to update admin.js
function updateAdminJs() {
    try {
        // Path to admin.js file
        const adminJsPath = path.join(__dirname, 'public', 'admin.js');
        
        console.log(`Reading file: ${adminJsPath}`);
        
        // Read the current file
        const fileData = fs.readFileSync(adminJsPath, 'utf8');
        console.log(`Admin.js file content length: ${fileData.length} characters`);
        
        // Make sure we have a backup
        if (!fs.existsSync(`${adminJsPath}.backup`)) {
            fs.writeFileSync(`${adminJsPath}.backup`, fileData, 'utf8');
            console.log(`Created backup at ${adminJsPath}.backup`);
        } else {
            console.log(`Backup already exists at ${adminJsPath}.backup`);
        }
        
        // Update chart code
        const updatedContent = updateChartDataExtraction(fileData);
        
        // Write the updated file
        fs.writeFileSync(adminJsPath, updatedContent, 'utf8');
        console.log(`Updated admin.js chart code to use extractLanguageName and sort languages`);
        
        console.log(`\nSuccess! The admin.js file has been updated.`);
        console.log(`Next steps:`);
        console.log(`1. Refresh your browser to see the changes`);
        console.log(`2. You may need to clear your browser cache`);
        console.log(`3. Charts should now show just language names, sorted alphabetically`);
        
    } catch (error) {
        console.error('Error updating admin.js:', error);
    }
}

// Run the function
updateAdminJs(); 