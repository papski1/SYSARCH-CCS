// filters.js - Contains functionality for filtering sit-in history records

// Function to setup and handle filters for sit-in history
function setupHistoryFilters(sessionsData) {
    // Store the original data for filtering
    window.originalSessionsData = sessionsData;
    
    // Get filter elements
    const purposeFilter = document.getElementById('purpose-filter');
    const labFilter = document.getElementById('lab-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    // Exit if elements not found
    if (!purposeFilter || !labFilter || !applyFiltersBtn || !resetFiltersBtn) {
        console.warn('Filter elements not found');
        return;
    }
    
    // Populate purpose filter
    populatePurposeFilter(sessionsData);
    
    // Apply filters button click handler
    applyFiltersBtn.addEventListener('click', () => {
        applySessionsFilters();
    });
    
    // Reset filters button click handler
    resetFiltersBtn.addEventListener('click', () => {
        purposeFilter.value = 'all';
        labFilter.value = 'all';
        displayFilteredSessions(window.originalSessionsData);
    });
}

// Function to populate purpose filter with unique values from data
function populatePurposeFilter(sessionsData) {
    const purposeFilter = document.getElementById('purpose-filter');
    if (!purposeFilter) return;
    
    // Get unique purposes from data
    const purposes = new Set();
    sessionsData.forEach(session => {
        if (session.purpose) {
            purposes.add(session.purpose);
        }
    });
    
    // Clear existing options except the "All" option
    while (purposeFilter.options.length > 1) {
        purposeFilter.remove(1);
    }
    
    // Add unique purposes to filter
    purposes.forEach(purpose => {
        const option = document.createElement('option');
        option.value = purpose;
        option.textContent = purpose;
        purposeFilter.appendChild(option);
    });
}

// Function to apply filters to sessions data
function applySessionsFilters() {
    const purposeFilter = document.getElementById('purpose-filter');
    const labFilter = document.getElementById('lab-filter');
    
    if (!purposeFilter || !labFilter || !window.originalSessionsData) {
        console.warn('Filter elements or original data not found');
        return;
    }
    
    const purposeValue = purposeFilter.value;
    const labValue = labFilter.value;
    
    // Filter data based on selections
    let filteredData = window.originalSessionsData;
    
    if (purposeValue !== 'all') {
        filteredData = filteredData.filter(session => 
            session.purpose && session.purpose === purposeValue
        );
    }
    
    if (labValue !== 'all') {
        filteredData = filteredData.filter(session => {
            const labRoom = session.labRoom || session.laboratory;
            return labRoom && (labRoom === labValue || labRoom.includes(labValue));
        });
    }
    
    // Display filtered data
    displayFilteredSessions(filteredData);
}

// Function to display filtered sessions in the table
function displayFilteredSessions(filteredData) {
    const tableBody = document.getElementById('completed-sessions-table');
    if (!tableBody) {
        console.error('Completed sessions table body not found');
        return;
    }
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-4 text-center text-gray-500">No sessions match the selected filters</td>
            </tr>
        `;
        return;
    }
    
    // Sort by date and time (most recent first)
    filteredData.sort((a, b) => {
        // Compare dates first
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const dateDiff = dateB - dateA;
        
        if (dateDiff !== 0) return dateDiff;
        
        // If dates are the same, compare times
        const timeA = a.time || a.timeIn || '00:00';
        const timeB = b.time || b.timeIn || '00:00';
        return timeB.localeCompare(timeA);
    });
    
    let html = '';
    filteredData.forEach(session => {
        const date = session.date || 'N/A';
        const time = session.time || session.timeIn || 'N/A';
        const type = session.type || (session.isWalkIn ? 'Walk-in' : 'Reservation');
        const typeClass = type === 'Walk-in' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800';
        
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${session.idNumber || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${session.name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${session.course || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${session.year || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${session.purpose || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${time}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${session.labRoom || session.laboratory || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                        ${type}
                    </span>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Function to modify the existing loadCompletedSessionsHistory function
function enhanceLoadCompletedSessionsHistory() {
    // Store the original function
    const originalLoadCompletedSessionsHistory = window.loadCompletedSessionsHistory;
    
    // Replace with our enhanced version
    window.loadCompletedSessionsHistory = async function() {
        try {
            // Call the original function's implementation
            await originalLoadCompletedSessionsHistory();
            
            // After it's done, setup our filters using the loaded data
            if (window.originalSessionsData) {
                setupHistoryFilters(window.originalSessionsData);
            } else {
                // If originalSessionsData wasn't set, try to extract it from the DOM
                const tableRows = document.querySelectorAll('#completed-sessions-table tr');
                if (tableRows.length > 0) {
                    // Create a basic dataset from the table
                    const extractedData = Array.from(tableRows).map(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 8) {
                            return {
                                idNumber: cells[0].textContent.trim(),
                                name: cells[1].textContent.trim(),
                                course: cells[2].textContent.trim(),
                                year: cells[3].textContent.trim(),
                                purpose: cells[4].textContent.trim(),
                                date: cells[5].textContent.trim(),
                                time: cells[6].textContent.trim(),
                                labRoom: cells[7].textContent.trim(),
                                type: cells[8].querySelector('span')?.textContent.trim() || 'Unknown'
                            };
                        }
                        return null;
                    }).filter(item => item !== null);
                    
                    if (extractedData.length > 0) {
                        window.originalSessionsData = extractedData;
                        setupHistoryFilters(extractedData);
                    }
                }
            }
        } catch (error) {
            console.error('Error in enhanced loadCompletedSessionsHistory:', error);
            // Fall back to original function if our enhancement fails
            if (originalLoadCompletedSessionsHistory) {
                return originalLoadCompletedSessionsHistory();
            }
        }
    };
}

// Enhance the setupReportsTabs function to initialize our filter handling
function enhanceSetupReportsTabs() {
    const originalSetupReportsTabs = window.setupReportsTabs;
    
    window.setupReportsTabs = function() {
        // Call the original function
        if (originalSetupReportsTabs) {
            originalSetupReportsTabs();
        }
        
        // Add our enhancement for filter activation
        const completedSessionsTab = document.getElementById('tab-completed-sessions');
        if (completedSessionsTab) {
            completedSessionsTab.addEventListener('click', function() {
                // When the completed sessions tab is clicked, ensure our filters are active
                if (window.originalSessionsData) {
                    setupHistoryFilters(window.originalSessionsData);
                }
            });
        }
    };
}

// Wait for DOM content to be loaded and then enhance the functions
document.addEventListener('DOMContentLoaded', function() {
    enhanceLoadCompletedSessionsHistory();
    enhanceSetupReportsTabs();
    
    // If page is already showing the sit-in history, initialize filters right away
    if (window.location.hash === '#reports' || 
        document.getElementById('reports')?.classList.contains('active') || 
        !document.getElementById('reports')?.classList.contains('hidden')) {
        
        // Check if completed sessions tab is active
        const completedSessionsTab = document.getElementById('tab-completed-sessions');
        if (completedSessionsTab?.classList.contains('active') || 
            document.getElementById('completed-sessions-content')?.classList.contains('active')) {
            
            // Wait a short delay to ensure data is loaded
            setTimeout(() => {
                if (window.originalSessionsData) {
                    setupHistoryFilters(window.originalSessionsData);
                }
            }, 500);
        }
    }
}); 