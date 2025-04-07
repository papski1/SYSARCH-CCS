const fs = require('fs');
const path = require('path');

// Path to the admin.js file
const adminJsPath = path.join(__dirname, 'public', 'admin.js');

// Read the file
fs.readFile(adminJsPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Find and replace the displayTodaysSitIns function
  const displayFunctionRegex = /(function displayTodaysSitIns\(todaysSitIns\) \{[\s\S]+?)(row\.innerHTML = `[\s\S]+?`)[\s\S]+?(tableBody\.appendChild\(row\);[\s\S]+?document\.querySelectorAll\('\.todays-complete-btn'\)[\s\S]+?setupTodaysSitInsSearch\(todaysSitIns\);[\s\S]+?\})/;

  // New row content that matches the updated column order and removes the complete button
  const newRowContent = `row.innerHTML = \`
            <td class="px-6 py-3">\${entry.idNumber || '-'}</td>
            <td class="px-6 py-3">\${entry.name || '-'}</td>
            <td class="px-6 py-3">\${entry.course || '-'}</td>
            <td class="px-6 py-3">\${entry.year || '-'}</td>
            <td class="px-6 py-3">
                <span class="px-2 py-1 rounded-full text-xs font-medium \${entry.isWalkIn ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                    \${entryType}
                </span>
            </td>
            <td class="px-6 py-3">
                <span class="px-2 py-1 rounded-full text-xs font-medium \${statusClass}">
                    \${entry.status || 'Unknown'}
                </span>
            </td>
            <td class="px-6 py-3">\${entry.purpose || '-'}</td>
            <td class="px-6 py-3">\${entry.labRoom || '-'}</td>
            <td class="px-6 py-3">\${entry.time || entry.timeIn || '-'}</td>
        \``;

  // Replace the event listeners part to remove the complete button functionality
  const updatedData = data.replace(displayFunctionRegex, (match, part1, oldRowContent, part3) => {
    // Remove the event listeners for complete buttons
    const updatedPart3 = part3.replace(
      /document\.querySelectorAll\('\.todays-complete-btn'\)\.forEach[\s\S]+?}\);/,
      '// No complete buttons to add event listeners to'
    );
    
    return `${part1}${newRowContent}${updatedPart3}`;
  });

  // Also update the search function which has similar structure
  const searchFunctionRegex = /(filteredEntries\.forEach\(entry => \{[\s\S]+?)(row\.innerHTML = `[\s\S]+?`)[\s\S]+?(tableBody\.appendChild\(row\);[\s\S]+?document\.querySelectorAll\('\.todays-complete-btn'\)[\s\S]+?\}\);)/;

  const updatedSearchFunction = updatedData.replace(searchFunctionRegex, (match, part1, oldRowContent, part3) => {
    // Remove the event listeners for complete buttons in search function too
    const updatedPart3 = part3.replace(
      /document\.querySelectorAll\('\.todays-complete-btn'\)\.forEach[\s\S]+?}\);/,
      '// No complete buttons to add event listeners to in search results'
    );
    
    return `${part1}${newRowContent}${updatedPart3}`;
  });

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedSearchFunction, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully updated the Today\'s Sit-in table - removed the complete button and rearranged columns');
  });
}); 