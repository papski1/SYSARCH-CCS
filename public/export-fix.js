/**
 * Export functionality fix for admin reports
 * This script fixes the export buttons in the admin interface
 */

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log("Export fix script loaded");
    
    // Initialize the export buttons once the page is loaded
    setTimeout(initializeExportButtons, 1000);
    
    // Also initialize when the completed sessions tab is clicked
    const completedSessionsTab = document.getElementById('tab-completed-sessions');
    if (completedSessionsTab) {
        completedSessionsTab.addEventListener('click', function() {
            console.log("Completed sessions tab clicked, initializing export buttons");
            // Wait for the data to load
            setTimeout(initializeExportButtons, 1000);
        });
    }
    
    // Add click event to the Reports section link to initialize when clicking on Reports tab
    const reportsLink = document.querySelector('a[href="#reports"]');
    if (reportsLink) {
        reportsLink.addEventListener('click', function() {
            console.log("Reports section clicked, scheduling export buttons initialization");
            setTimeout(initializeExportButtons, 1500);
        });
    }
    
    // Add our own PDF export function that uses jsPDF loaded through UMD
    window.exportToPDF = function(data) {
        console.log("Using custom exportToPDF function");
        
        // jsPDF is loaded as a UMD module, so we need to check the window.jspdf object
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            console.error('jsPDF library not loaded properly');
            alert('PDF export library not loaded. Please refresh the page and try again.');
            return;
        }
        
        try {
            // Create a new jsPDF instance using the UMD version
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(16);
            doc.text('Sit-in History Report', 14, 15);
            
            // Get filter information for the PDF
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
            
            // Add filter information if available
            let yPosition = 22;
            if (filterText) {
                doc.setFontSize(10);
                doc.text(`Filters: ${filterText}`, 14, yPosition);
                yPosition += 5;
            }
            
            // Add timestamp
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPosition);
            
            // Define table columns
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
            
            // Calculate start Y position based on whether we have filters
            const startY = filterText ? yPosition + 5 : yPosition + 3;
            
            // Generate the table using autotable plugin
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
            
            // Save the PDF with a name that indicates if it's filtered
            const fileName = filterText ? 
                `sit-in-history-filtered.pdf` : 
                'sit-in-history.pdf';
            doc.save(fileName);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        }
    };
});

/**
 * Initialize export buttons with event listeners
 */
function initializeExportButtons() {
    console.log("Initializing export buttons");
    
    // Try to get the session data from the global variable or extract from table
    if (!window.originalSessionsData) {
        console.log("No session data found, attempting to extract from table");
        try {
            // Extract data from the completed sessions table
            const tableRows = document.querySelectorAll('#completed-sessions-table tr');
            if (tableRows.length > 1) { // Skip header row
                const sessionsData = Array.from(tableRows).slice(1).map(row => {
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
                            type: cells[8]?.querySelector('span')?.textContent.trim() || 'Unknown'
                        };
                    }
                    return null;
                }).filter(item => item !== null);
                
                if (sessionsData.length > 0) {
                    window.originalSessionsData = sessionsData;
                    console.log("Extracted session data from table:", sessionsData.length, "rows");
                }
            }
        } catch (error) {
            console.error("Error extracting session data from table:", error);
        }
    }
    
    // Setup dropdown button functionality
    const dropdownButton = document.getElementById('export-options-menu-button');
    const dropdownMenu = document.getElementById('export-options-menu');
    
    if (dropdownButton && dropdownMenu) {
        // Remove any existing click event listeners
        const newDropdownButton = dropdownButton.cloneNode(true);
        dropdownButton.parentNode.replaceChild(newDropdownButton, dropdownButton);
        
        // Add the click event listener to toggle the dropdown
        newDropdownButton.addEventListener('click', function(event) {
            event.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!newDropdownButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.classList.add('hidden');
            }
        });
        
        // Close dropdown when ESC key is pressed
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                dropdownMenu.classList.add('hidden');
            }
        });
    }
    
    // Setup CSV Export
    setupExportButton('export-csv', function() {
        // Get currently filtered data if available
        const dataToExport = getFilteredOrOriginalData();
        
        if (window.exportToCSV && dataToExport) {
            window.exportToCSV(dataToExport);
        } else {
            alert('Export functionality is not available or no data to export');
            console.error("Missing exportToCSV function or data for CSV export");
        }
    });
    
    // Setup Excel Export
    setupExportButton('export-excel', function() {
        // Get currently filtered data if available
        const dataToExport = getFilteredOrOriginalData();
        
        if (window.exportToExcel && dataToExport) {
            window.exportToExcel(dataToExport);
        } else {
            alert('Export functionality is not available or no data to export');
            console.error("Missing exportToExcel function or data for Excel export");
        }
    });
    
    // Setup PDF Export
    setupExportButton('export-pdf', function() {
        // Get currently filtered data if available
        const dataToExport = getFilteredOrOriginalData();
        
        if (window.exportToPDF && dataToExport) {
            window.exportToPDF(dataToExport);
        } else {
            alert('Export functionality is not available or no data to export');
            console.error("Missing exportToPDF function or data for PDF export");
        }
    });
    
    // Setup Print
    setupExportButton('print-table', function() {
        if (window.printTable) {
            // Make sure print function uses filtered data
            const dataToExport = getFilteredOrOriginalData();
            window.printTable(dataToExport);
        } else {
            alert('Print functionality is not available');
            console.error("Missing printTable function");
        }
    });
    
    console.log("Export buttons initialized");
}

/**
 * Helper function to setup an export button with a click event listener
 * Removes any existing listeners by cloning the button
 */
function setupExportButton(buttonId, clickHandler) {
    const button = document.getElementById(buttonId);
    if (button) {
        // Remove any existing event listeners by cloning the button
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add new click event listener
        newButton.addEventListener('click', clickHandler);
    } else {
        console.warn(`Button with ID '${buttonId}' not found`);
    }
}

/**
 * Helper function to get the currently filtered data or fall back to original data
 * @returns {Array} - The data to export (filtered or original)
 */
function getFilteredOrOriginalData() {
    // Check if filtered data exists
    if (window.currentFilteredData && window.currentFilteredData.length > 0) {
        console.log("Using filtered data for export:", window.currentFilteredData.length, "rows");
        return window.currentFilteredData;
    }
    
    // If no filtered data, extract visible data from the table
    try {
        const tableRows = document.querySelectorAll('#completed-sessions-table tr');
        // Skip header row and loading/empty message rows
        if (tableRows.length > 1 && !tableRows[1].querySelector('td[colspan]')) {
            const visibleData = Array.from(tableRows).slice(1).map(row => {
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
                        type: cells[8]?.querySelector('span')?.textContent.trim() || 'Unknown'
                    };
                }
                return null;
            }).filter(item => item !== null);
            
            if (visibleData.length > 0) {
                console.log("Extracted visible data from table:", visibleData.length, "rows");
                return visibleData;
            }
        }
    } catch (error) {
        console.error("Error extracting visible data from table:", error);
    }
    
    // Fall back to original data if no filtered data available
    console.log("Using original data for export:", 
        window.originalSessionsData ? window.originalSessionsData.length : 0, "rows");
    return window.originalSessionsData || [];
} 