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
            // If purpose contains a programming language name after a label (e.g., "Programming Assistance: Java")
            // Extract just the programming language name
            const match = session.purpose.match(/:\s*(.+)$/);
            if (match && match[1]) {
                purposes.add(match[1].trim());
            } else {
                purposes.add(session.purpose);
            }
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
    
    if (!purposeFilter || !window.originalSessionsData) {
        console.warn('Filter elements or original data not found');
        return;
    }
    
    const purposeValue = purposeFilter.value;
    const labValue = labFilter ? labFilter.value : 'all';
    
    // Filter data based on selections
    let filteredData = window.originalSessionsData;
    
    if (purposeValue !== 'all') {
        filteredData = filteredData.filter(session => {
            if (!session.purpose) return false;
            
            // Check if purpose matches exactly or if it contains the selected value after a colon
            return session.purpose === purposeValue || 
                   session.purpose.match(new RegExp(`: ${purposeValue}($|\\s)`)) ||
                   session.purpose.includes(`: ${purposeValue}`);
        });
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
    
    // Update the current filtered data for printing/exporting
    window.currentFilteredData = filteredData;
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

// Function to enhance the setupReportsTabs function
function enhanceSetupReportsTabs() {
    // Store the original function
    const originalSetupReportsTabs = window.setupReportsTabs;
    
    // Replace with our enhanced version
    window.setupReportsTabs = function() {
        // Call the original implementation
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

// Enhanced print table function to use filtered data
function enhancePrintTable() {
    // Store the original function
    const originalPrintTable = window.printTable;
    
    // Replace with enhanced version that uses filtered data
    window.printTable = function() {
        // Check if we have filtered data
        if (window.currentFilteredData && window.currentFilteredData.length > 0) {
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow pop-ups to print the table.');
                return;
            }
            
            // Get filters for the title
            const purposeFilter = document.getElementById('purpose-filter');
            const labFilter = document.getElementById('lab-filter');
            
            let filterText = "";
            if (labFilter && labFilter.value !== 'all') {
                filterText += `Lab Room: ${labFilter.value} | `;
            }
            if (purposeFilter && purposeFilter.value !== 'all') {
                filterText += `Purpose: ${purposeFilter.value} | `;
            }
            
            // Remove trailing separator if exists
            if (filterText.endsWith(' | ')) {
                filterText = filterText.substring(0, filterText.length - 3);
            }
            
            // HTML content for the print window
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Sit-in History Report</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                        }
                        h2 {
                            color: #333;
                            margin-bottom: 5px;
                        }
                        .filter-text {
                            color: #666;
                            font-size: 14px;
                            margin-bottom: 10px;
                        }
                        .timestamp {
                            color: #666;
                            font-size: 12px;
                            margin-bottom: 20px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #f2f2f2;
                            font-weight: bold;
                        }
                        tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                        .type-badge {
                            display: inline-block;
                            padding: 3px 8px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: bold;
                        }
                        .type-walkin {
                            background-color: #e8f0fe;
                            color: #1a73e8;
                        }
                        .type-reservation {
                            background-color: #f0e8fe;
                            color: #8e24aa;
                        }
                        @media print {
                            body {
                                padding: 0;
                            }
                            button {
                                display: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h2>Sit-in History Report</h2>
                    ${filterText ? `<div class="filter-text">${filterText}</div>` : ''}
                    <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>ID Number</th>
                                <th>Name</th>
                                <th>Course</th>
                                <th>Year</th>
                                <th>Purpose</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Lab Room</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
            `);
            
            // Add the filtered data to the table
            window.currentFilteredData.forEach(session => {
                const date = session.date || 'N/A';
                const time = session.time || session.timeIn || 'N/A';
                const type = session.type || (session.isWalkIn ? 'Walk-in' : 'Reservation');
                const typeClass = type === 'Walk-in' ? 'type-walkin' : 'type-reservation';
                
                printWindow.document.write(`
                    <tr>
                        <td>${session.idNumber || 'N/A'}</td>
                        <td>${session.name || 'N/A'}</td>
                        <td>${session.course || 'N/A'}</td>
                        <td>${session.year || 'N/A'}</td>
                        <td>${session.purpose || 'N/A'}</td>
                        <td>${date}</td>
                        <td>${time}</td>
                        <td>${session.labRoom || session.laboratory || 'N/A'}</td>
                        <td><span class="type-badge ${typeClass}">${type}</span></td>
                    </tr>
                `);
            });
            
            // Complete the HTML
            printWindow.document.write(`
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <button onclick="window.print();" style="padding: 10px 20px; background-color: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
                    </div>
                </body>
                </html>
            `);
            
            // Finalize the document
            printWindow.document.close();
            
            // Focus the print window
            printWindow.focus();
            
            // Auto print (with a slight delay to ensure content is loaded)
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } else if (originalPrintTable) {
            // Fall back to original function if no filtered data
            originalPrintTable();
        }
    };
}

// Function to modify setupExportFunctionsReports to use filtered data
function enhanceSetupExportFunctionsReports() {
    // Store the original function
    const originalSetupExportFunctionsReports = window.setupExportFunctionsReports;
    
    // Replace with our enhanced version
    window.setupExportFunctionsReports = function(sessionsData) {
        // Setup CSV Export
        const exportCsvBtn = document.getElementById('export-csv-reports');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => {
                // Use filtered data if available, otherwise use original data
                const dataToExport = window.currentFilteredData || sessionsData;
                exportToCSV(dataToExport);
            });
        }
        
        // Setup Excel Export
        const exportExcelBtn = document.getElementById('export-excel-reports');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => {
                // Use filtered data if available, otherwise use original data
                const dataToExport = window.currentFilteredData || sessionsData;
                exportToExcel(dataToExport);
            });
        }
        
        // Setup PDF Export
        const exportPdfBtn = document.getElementById('export-pdf-reports');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => {
                // Use filtered data if available, otherwise use original data
                const dataToExport = window.currentFilteredData || sessionsData;
                
                // Get filter information for PDF title
                let filterText = "";
                const purposeFilter = document.getElementById('purpose-filter');
                const labFilter = document.getElementById('lab-filter');
                
                if (labFilter && labFilter.value !== 'all') {
                    filterText += `Lab Room: ${labFilter.value} | `;
                }
                if (purposeFilter && purposeFilter.value !== 'all') {
                    filterText += `Purpose: ${purposeFilter.value} | `;
                }
                
                // Remove trailing separator if exists
                if (filterText.endsWith(' | ')) {
                    filterText = filterText.substring(0, filterText.length - 3);
                }
                
                // Call the original function
                if (window.exportToPDF) {
                    // Temporarily override the exportToPDF function to include filter info
                    const originalExportToPDF = window.exportToPDF;
                    window.exportToPDF = function(data) {
                        // Only proceed if jsPDF is available
                        if (typeof jsPDF === 'undefined') {
                            console.error('jsPDF library not loaded');
                            alert('PDF export library not loaded. Please try again.');
                            return;
                        }
                        
                        try {
                            // Create a new jsPDF instance
                            const doc = new jsPDF();
                            
                            // Add title
                            doc.setFontSize(16);
                            doc.text('Sit-in History Report', 14, 15);
                            
                            // Add filter information if available
                            if (filterText) {
                                doc.setFontSize(10);
                                doc.text(`Filters: ${filterText}`, 14, 22);
                                
                                // Add timestamp on next line
                                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);
                            } else {
                                // Add timestamp on same line if no filters
                                doc.setFontSize(10);
                                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
                            }
                            
                            // Define table columns and rows
                            const columns = [
                                {header: 'ID Number', dataKey: 'idNumber'},
                                {header: 'Name', dataKey: 'name'},
                                {header: 'Course', dataKey: 'course'},
                                {header: 'Year', dataKey: 'year'},
                                {header: 'Purpose', dataKey: 'purpose'},
                                {header: 'Date', dataKey: 'date'},
                                {header: 'Time', dataKey: 'time'},
                                {header: 'Lab Room', dataKey: 'labRoom'},
                                {header: 'Type', dataKey: 'type'}
                            ];
                            
                            // Format data for the table
                            const rows = data.map(session => ({
                                idNumber: session.idNumber || 'N/A',
                                name: session.name || 'N/A',
                                course: session.course || 'N/A',
                                year: session.year || 'N/A',
                                purpose: session.purpose || 'N/A',
                                date: session.date || 'N/A',
                                time: session.time || session.timeIn || 'N/A',
                                labRoom: session.labRoom || session.laboratory || 'N/A',
                                type: session.type || (session.isWalkIn ? 'Walk-in' : 'Reservation')
                            }));
                            
                            // Calculate start Y based on whether we have filters
                            const startY = filterText ? 32 : 25;
                            
                            // Generate the table
                            doc.autoTable({
                                columns: columns,
                                body: rows,
                                startY: startY,
                                margin: {top: 30},
                                styles: {
                                    fontSize: 8,
                                    cellPadding: 2
                                },
                                headStyles: {
                                    fillColor: [66, 133, 244],
                                    textColor: 255
                                },
                                alternateRowStyles: {
                                    fillColor: [240, 240, 240]
                                }
                            });
                            
                            // Save the PDF with appropriate name
                            const fileName = filterText ? 
                                `sit-in-history-filtered.pdf` : 
                                'sit-in-history.pdf';
                                
                            doc.save(fileName);
                        } catch (error) {
                            console.error('Error generating PDF:', error);
                            alert('Error generating PDF. Please try again.');
                        }
                        
                        // Restore original function
                        window.exportToPDF = originalExportToPDF;
                    };
                    
                    // Call the modified function
                    window.exportToPDF(dataToExport);
                } else {
                    // Fallback if exportToPDF function doesn't exist
                    console.error('exportToPDF function not found');
                    alert('PDF export function not found. Please try again later.');
                }
            });
        }
        
        // Setup Print - use our enhanced print function that supports filters
        const printTableBtn = document.getElementById('print-table-reports');
        if (printTableBtn) {
            printTableBtn.addEventListener('click', () => {
                if (window.printTable) {
                    window.printTable();
                }
            });
        }
    };
}

// Wait for DOM content to be loaded and then enhance the functions
document.addEventListener('DOMContentLoaded', function() {
    enhanceLoadCompletedSessionsHistory();
    enhanceSetupReportsTabs();
    enhancePrintTable();
    enhanceSetupExportFunctionsReports();
    
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