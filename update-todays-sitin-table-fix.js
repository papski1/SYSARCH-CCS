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

  // First, let's locate the displayTodaysSitIns function
  const functionMatch = data.match(/function displayTodaysSitIns\s*\(todaysSitIns\)\s*\{[\s\S]+?\}/);
  
  if (!functionMatch) {
    console.error('Could not find the displayTodaysSitIns function in the file');
    return;
  }
  
  // Get the full function text
  const originalFunction = functionMatch[0];
  
  // Create a new version of the function with the Complete button removed
  // and columns rearranged according to the HTML
  let newFunction = `function displayTodaysSitIns(todaysSitIns) {
    const tableBody = document.getElementById('todays-sit-ins-table');
    if (!tableBody) return;
    
    // Clear the table body
    tableBody.innerHTML = '';
    
    if (todaysSitIns.length === 0) {
        tableBody.innerHTML = \`
            <tr>
                <td colspan="9" class="px-6 py-3 text-center text-gray-500">
                    No sit-ins found for today.
                </td>
            </tr>
        \`;
        return;
    }
    
    // Add each sit-in to the table
    todaysSitIns.forEach(entry => {
        const statusClass = getStatusClass(entry.status);
        // Remove canComplete variable since we won't use it
        const entryType = entry.isWalkIn ? 'Walk-in' : 'Reservation';
        const entryId = entry.id.toString();
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';
        row.dataset.entryId = entryId;
        
        row.innerHTML = \`
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
        \`;
        
        tableBody.appendChild(row);
    });
    
    // Remove the event listeners for the complete buttons
    // setupTodaysSitInsSearch function will still be called
    setupTodaysSitInsSearch(todaysSitIns);
}`;

  // Replace the old function with the new one
  const updatedData = data.replace(originalFunction, newFunction);
  
  // Also update the search function to match the same structure
  // First, find the setupTodaysSitInsSearch function that contains the filteredEntries.forEach loop
  const searchFunctionRegex = /(filteredEntries\.forEach\(entry => {[\s\S]+?)(row\.innerHTML = `[\s\S]+?`)([\s\S]+?tableBody\.appendChild\(row\);)([\s\S]+?document\.querySelectorAll\('\.todays-complete-btn'\)[\s\S]+?}\);)/;
  
  // Create replacement for the row.innerHTML part
  const newRowInnerHTML = `row.innerHTML = \`
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
            
  // Update the search function
  const finalUpdatedData = updatedData.replace(searchFunctionRegex, (match, part1, oldRowInnerHTML, part3, part4) => {
    // We'll keep part1 and part3, replace oldRowInnerHTML with our new version,
    // and remove the complete button event listeners from part4
    return part1 + newRowInnerHTML + part3 + '// No complete buttons in search results\n';
  });

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, finalUpdatedData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully fixed the Today\'s Sit-in table - removed the complete button and rearranged columns');
  });
}); 