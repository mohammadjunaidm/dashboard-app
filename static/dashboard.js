// Global variables
let incidents = [];
let filteredIncidents = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSortColumn = 'created_on';
let sortDirection = 'desc';


const ASSIGNMENT_GROUPS = ['GTS', 'FTS', 'Experts Engine', 'Sourcing 2.0'];

// Add this function to your Code.gs file
function onMessage(event) {
    try {
      const message = event.message.text.toLowerCase();
      
      if (message.includes('@dashboard')) {
        // Get the deployment URL dynamically
        const deploymentUrl = ScriptApp.getService().getUrl();
        
        return {
          "cardsV2": [{
            "cardId": "dashboard_card",
            "card": {
              "header": {
                "title": "ServiceNow Dashboard",
                "subtitle": "View incident dashboard"
              },
              "sections": [{
                "widgets": [{
                  "buttonList": {
                    "buttons": [{
                      "text": "View Dashboard",
                      "onClick": {
                        "openLink": {
                          "url": deploymentUrl
                        }
                      }
                    }]
                  }
                }]
              }]
            }
          }]
        };
      }
      
      return { "text": "I'm here! How can I help you?" };
    } catch (error) {
      console.error(error);
      return { "text": "Sorry, I encountered an error. Please try again." };
    }
  }
  
  // Add this function to handle Google Chat card clicks
  function onCardClick(event) {
    console.log(event);
    return { "text": "Processing your request..." };
  }
  
// Function declarations
function fetchIncidents() {
    const loadingIndicator = document.getElementById('loading');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }


    const assignmentGroup = document.getElementById('assignmentGroupFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';


    const params = new URLSearchParams({
        assignment_group: assignmentGroup,
        date_from: dateFrom,
        date_to: dateTo
    });


    return axios.get(`/api/incidents?${params}`)
        .then(function (response) {
            console.log('API Response:', response); // Log the entire response
            if (response.data && Array.isArray(response.data)) {
                incidents = response.data;
                filteredIncidents = [...incidents];
                updateDisplay();
            } else {
                throw new Error('Invalid data format received from API');
            }
        })
        .catch(function (error) {
            console.error('Error fetching incidents:', error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Error data:', error.response.data);
                console.error('Error status:', error.response.status);
                console.error('Error headers:', error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error message:', error.message);
            }
            alert('Error fetching incidents. Please check the console for more details and try again later.');
        })
        .finally(function () {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        });
}


function updateDisplay() {
    sortTable(currentSortColumn);
    displayPage(currentPage);
    updatePagination();
    updateShowingEntries();
    updatePriorityChart();
    updateDeveloperTable(filteredIncidents);
    updateCategoryTable(filteredIncidents);
}


let priorityChart = null;




function updateDeveloperTable(incidents) {
    const developerStats = calculateDeveloperStats(incidents);
    const tableBody = document.querySelector('#developerDetailsTable tbody');
    if (!tableBody) {
        console.error('Developer details table body not found');
        return;
    }


    tableBody.innerHTML = '';


    developerStats.forEach(dev => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dev.assignee}</td>
            <td>${dev.count}</td>
            <td>${dev.avgResolutionTime}</td>
        `;
        tableBody.appendChild(row);
    });
}


// Add these variables at the top with your other global variables
let customFilters = [];

function applyCustomFilter() {
    const column = document.getElementById('columnFilter').value;
    const operator = document.getElementById('filterOperator').value;
    const value = document.getElementById('filterValue').value.toLowerCase();

    if (!column || !value) {
        alert('Please select a column and enter a filter value');
        return;
    }

    // Add the new filter
    customFilters.push({ column, operator, value });

    // Apply all filters
    applyAllFilters();
}

function clearCustomFilter() {
    customFilters = [];
    document.getElementById('columnFilter').value = '';
    document.getElementById('filterOperator').value = 'contains';
    document.getElementById('filterValue').value = '';
    applyAllFilters();
}

function applyAllFilters() {
    // Get assignment group and date filters
    const assignmentGroup = document.getElementById('assignmentGroupFilter')?.value;
    const dateFrom = document.getElementById('dateFrom')?.value ? new Date(document.getElementById('dateFrom').value) : null;
    const dateTo = document.getElementById('dateTo')?.value ? new Date(document.getElementById('dateTo').value + 'T23:59:59') : null;

    filteredIncidents = incidents.filter(incident => {
        // Check assignment group and date range
        const incidentDate = new Date(incident.created_on);
        const matchesGroup = !assignmentGroup || incident.assignment_group === assignmentGroup;
        const matchesDateRange = (!dateFrom || incidentDate >= dateFrom) && 
                               (!dateTo || incidentDate <= dateTo);

        // Check custom filters
        const matchesCustomFilters = customFilters.every(filter => {
            const fieldValue = String(incident[filter.column] || '').toLowerCase();
            const filterValue = filter.value.toLowerCase();

            switch (filter.operator) {
                case 'contains':
                    return fieldValue.includes(filterValue);
                case 'equals':
                    return fieldValue === filterValue;
                case 'startsWith':
                    return fieldValue.startsWith(filterValue);
                case 'endsWith':
                    return fieldValue.endsWith(filterValue);
                default:
                    return true;
            }
        });

        return matchesGroup && matchesDateRange && matchesCustomFilters;
    });

    currentPage = 1;
    updateDisplay();
}

// Modify your existing applyFilters function to use applyAllFilters
function applyFilters() {
    applyAllFilters();
}



function calculateDeveloperStats(incidents) {
    const developerStats = {};


    incidents.forEach(incident => {
        const assignee = incident.assigned_to || 'Unassigned';
       
        if (!developerStats[assignee]) {
            developerStats[assignee] = {
                count: 0,
                totalResolutionTime: 0,
                resolvedCount: 0
            };
        }


        developerStats[assignee].count++;


        if (incident.resolved_at && incident.created_on) {
            const createdDate = new Date(incident.created_on);
            const resolvedDate = new Date(incident.resolved_at);
            if (!isNaN(createdDate) && !isNaN(resolvedDate)) {
                const resolutionTime = resolvedDate - createdDate;
                developerStats[assignee].totalResolutionTime += resolutionTime;
                developerStats[assignee].resolvedCount++;
            }
        }
    });


    return Object.entries(developerStats)
        .map(([assignee, stats]) => ({
            assignee,
            count: stats.count,
            avgResolutionTime: stats.resolvedCount > 0
                ? formatDuration(stats.totalResolutionTime / stats.resolvedCount)
                : 'N/A'
        }))
        .sort((a, b) => b.count - a.count);
}


function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));


    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}




function updatePriorityChart() {
    // Check if Chart is defined
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }


    const chartContainer = document.getElementById('chartContainer');
    const canvas = document.getElementById('priorityChart');
   
    if (!chartContainer || !canvas) {
        console.error('Chart container or canvas not found');
        return;
    }


    const ctx = canvas.getContext('2d');


    if (filteredIncidents.length === 0) {
        chartContainer.style.display = 'none';
        return;
    }


    chartContainer.style.display = 'block';


    try {
        const priorityCounts = {
            'Critical': 0,
            'High': 0,
            'Moderate': 0,
            'Low': 0,
            'Planning': 0
        };


        filteredIncidents.forEach(incident => {
            const priority = incident.priority || 'Unknown';
            if (priority.includes('Critical')) priorityCounts['Critical']++;
            else if (priority.includes('High')) priorityCounts['High']++;
            else if (priority.includes('Moderate')) priorityCounts['Moderate']++;
            else if (priority.includes('Low')) priorityCounts['Low']++;
            else if (priority.includes('Planning')) priorityCounts['Planning']++;
        });


        // Filter out priorities with zero count
        const filteredPriorities = Object.entries(priorityCounts)
            .filter(([_, count]) => count > 0)
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});


        const data = {
            labels: Object.keys(filteredPriorities),
            datasets: [{
                data: Object.values(filteredPriorities),
                backgroundColor: [
                    '#dc3545', // Critical - Red
                    '#ffc107', // High - Yellow
                    '#28a745', // Moderate - Green
                    '#17a2b8', // Low - Blue
                    '#6c757d'  // Planning - Gray
                ]
            }]
        };


        // Destroy existing chart if it exists
        if (window.priorityChart instanceof Chart) {
            window.priorityChart.destroy();
        }


        // Create new chart
        window.priorityChart = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = Object.values(filteredPriorities).reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        chartContainer.style.display = 'none';
    }
}


function fetchDeveloperDetails() {
    // Correct the API endpoint URL
    fetch('/api/incidents') // Remove the ':1' at the end
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const tableBody = document.querySelector('#developerDetailsTable tbody');
            tableBody.innerHTML = ''; // Clear existing rows


            data.forEach(dev => {
                const row = `
                    <tr>
                        <td>${dev.assignee}</td>
                        <td>${dev.count}</td>
                        <td>${dev.avgResolutionTime}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        })
        .catch(error => {
            console.error('Error fetching developer details:', error);
            // Display error message to user
            const tableBody = document.querySelector('#developerDetailsTable tbody');
            tableBody.innerHTML = `<tr><td colspan="3">Error loading developer details. Please try again later.</td></tr>`;
        });
}








function updateShowingEntries() {
    const showingElement = document.getElementById('showing-entries');
    if (showingElement) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredIncidents.length);
        showingElement.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${filteredIncidents.length} entries`;
    }
}


function applyFilters() {
    const assignmentGroup = document.getElementById('assignmentGroupFilter')?.value;
    const dateFrom = document.getElementById('dateFrom')?.value ? new Date(document.getElementById('dateFrom').value) : null;
    const dateTo = document.getElementById('dateTo')?.value ? new Date(document.getElementById('dateTo').value + 'T23:59:59') : null;


    filteredIncidents = incidents.filter(incident => {
        const incidentDate = new Date(incident.created_on);
        const matchesGroup = !assignmentGroup || incident.assignment_group === assignmentGroup;
        const matchesDateRange = (!dateFrom || incidentDate >= dateFrom) &&
                               (!dateTo || incidentDate <= dateTo);
       
        return matchesGroup && matchesDateRange;
    });


    currentPage = 1;
    updateDisplay();
}


function resetFilters() {
    const assignmentGroupFilter = document.getElementById('assignmentGroupFilter');
    const dateFromFilter = document.getElementById('dateFrom');
    const dateToFilter = document.getElementById('dateTo');


    if (assignmentGroupFilter) assignmentGroupFilter.value = '';
    if (dateFromFilter) dateFromFilter.value = '';
    if (dateToFilter) dateToFilter.value = '';
   
    filteredIncidents = [...incidents];
    currentPage = 1;
    updateDisplay();
}


function getStatusClass(status) {
    if (!status) return '';
    status = status.toLowerCase();
    if (status.includes('new')) return 'status-new';
    if (status.includes('progress')) return 'status-progress';
    if (status.includes('hold')) return 'status-hold';
    if (status.includes('resolved')) return 'status-resolved';
    if (status.includes('closed')) return 'status-closed';
    return '';
}


function getPriorityClass(priority) {
    if (!priority) return '';
    priority = priority.toLowerCase();
    if (priority.includes('critical')) return 'priority-critical';
    if (priority.includes('high')) return 'priority-high';
    if (priority.includes('moderate')) return 'priority-moderate';
    if (priority.includes('low')) return 'priority-low';
    if (priority.includes('planning')) return 'priority-planning';
    return '';
}


function displayPage(page) {
    if (!Array.isArray(filteredIncidents)) {
        console.error('filteredIncidents is not an array:', filteredIncidents);
        return;
    }


    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageIncidents = filteredIncidents.slice(startIndex, endIndex);


    const tableBody = document.getElementById('incidentTableBody');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }


    tableBody.innerHTML = '';


    pageIncidents.forEach(function(incident) {
        const row = document.createElement('tr');
        const statusClass = getStatusClass(incident.status);
        const priorityClass = getPriorityClass(incident.priority);
       
        row.innerHTML = `
            <td><strong>
                    <a href="${getServiceNowTicketUrl(incident.number)}" 
                       target="_blank" 
                       class="incident-link" 
                       title="Open incident in ServiceNow">
                        ${incident.number || ''}
                    </a></strong></td>
            <td>${incident.short_description || ''}</td>
            <td>${formatDate(incident.created_on)}</td>
            <td>${incident.caller || ''}</td>
            <td>${incident.assigned_to || 'Unassigned'}</td>
            <td><span class="status-badge ${statusClass}">${incident.status || ''}</span></td>
            <td><span class="priority-badge ${priorityClass}">${incident.priority || ''}</span></td>
            <td>${incident.category || ''}</td>
            <td>${incident.assignment_group || 'Unassigned'}</td>
            <td>${incident.resolved_at === 'Not resolved yet' ?
                '<span class="status-badge status-hold">Not resolved yet</span>' :
                formatDate(incident.resolved_at)}</td>
            <td><span class="time-spent">${incident.time_spent || ''}</span></td>
        `;
        tableBody.appendChild(row);
    });
}


function updatePagination() {
    const paginationElement = document.getElementById('pagination');
    if (!paginationElement) return;


    paginationElement.innerHTML = '';


    const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);


    if (totalPages > 1) {
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="return changePage(${currentPage - 1})">Previous</a>`;
        paginationElement.appendChild(prevLi);


        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }


        if (startPage > 1) {
            paginationElement.appendChild(createPageItem(1));
            if (startPage > 2) {
                paginationElement.appendChild(createEllipsisItem());
            }
        }


        for (let i = startPage; i <= endPage; i++) {
            paginationElement.appendChild(createPageItem(i));
        }


        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationElement.appendChild(createEllipsisItem());
            }
            paginationElement.appendChild(createPageItem(totalPages));
        }


        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="return changePage(${currentPage + 1})">Next</a>`;
        paginationElement.appendChild(nextLi);
    }
}


function createPageItem(pageNumber) {
    const li = document.createElement('li');
    li.className = `page-item ${pageNumber === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#" onclick="return changePage(${pageNumber})">${pageNumber}</a>`;
    return li;
}


function createEllipsisItem() {
    const li = document.createElement('li');
    li.className = 'page-item disabled';
    li.innerHTML = '<span class="page-link">...</span>';
    return li;
}


function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredIncidents.length / itemsPerPage)) return false;
    currentPage = page;
    displayPage(currentPage);
    updatePagination();
    updateShowingEntries();
    return false;
}


function sortTable(column) {
    if (currentSortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        sortDirection = 'asc';
    }


    filteredIncidents.sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];


        if (column === 'created_on' || column === 'resolved_at') {
            valueA = new Date(valueA || 0);
            valueB = new Date(valueB || 0);
        } else if (column === 'time_spent') {
            valueA = convertTimeSpentToMinutes(valueA);
            valueB = convertTimeSpentToMinutes(valueB);
        } else {
            valueA = String(valueA || '').toLowerCase();
            valueB = String(valueB || '').toLowerCase();
        }


        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });


    currentPage = 1;
    displayPage(currentPage);
    updatePagination();
    updateSortIndicators();
}


function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sorting-asc', 'sorting-desc');
    });


    const currentHeader = document.querySelector(`.sortable[data-sort="${currentSortColumn}"]`);
    if (currentHeader) {
        currentHeader.classList.add(sortDirection === 'asc' ? 'sorting-asc' : 'sorting-desc');
    }
}


function formatDate(dateString) {
    if (!dateString) return '';
   
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;


    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}


function convertTimeSpentToMinutes(timeSpent) {
    if (!timeSpent) return 0;
   
    const parts = timeSpent.split(' ');
    let totalMinutes = 0;
   
    parts.forEach(part => {
        const value = parseInt(part);
        if (part.endsWith('d')) totalMinutes += value * 24 * 60;
        else if (part.endsWith('h')) totalMinutes += value * 60;
        else if (part.endsWith('m')) totalMinutes += value;
    });
   
    return totalMinutes;
}


function initializeHowToUse() {
    const howToUse = document.querySelector('.how-to-use');
    if (howToUse) {
        howToUse.addEventListener('toggle', function() {
            localStorage.setItem('howToUseOpen', this.open);
        });


        const savedState = localStorage.getItem('howToUseOpen');
        if (savedState === 'true') {
            howToUse.setAttribute('open', '');
        }
    }
}

let catCurrentPage = 1;
const catItemsPerPage = 5;

function calculateCategoryStats(incidents) {
    const categoryStats = {};

    incidents.forEach(incident => {
        const category = incident.category || 'Uncategorized';
        
        if (!categoryStats[category]) {
            categoryStats[category] = 0;
        }
        categoryStats[category]++;
    });

    return Object.entries(categoryStats)
        .map(([type, count]) => ({
            type,
            count
        }))
        .sort((a, b) => b.count - a.count);
}

function updateCategoryTable(incidents) {
    const categoryStats = calculateCategoryStats(incidents);
    const tableBody = document.querySelector('#categoryDetailsTable tbody');
    if (!tableBody) return;

    // Calculate pagination
    const startIndex = (catCurrentPage - 1) * catItemsPerPage;
    const endIndex = startIndex + catItemsPerPage;
    const pageData = categoryStats.slice(startIndex, endIndex);

    // Update table
    tableBody.innerHTML = '';
    pageData.forEach(cat => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cat.type}</td>
            <td>${cat.count}</td>
        `;
        tableBody.appendChild(row);
    });

    // Update pagination
    updateCategoryPagination(categoryStats.length);
}

function getServiceNowTicketUrl(incidentNumber) {
    // Replace 'your-instance' with your ServiceNow instance name
    return `https://dev278567.service-now.com/nav_to.do?uri=incident.do?sysparm_query=number=${incidentNumber}`;
}


function updateCategoryPagination(totalItems) {
    const paginationElement = document.getElementById('categoryPagination');
    if (!paginationElement) return;

    const totalPages = Math.ceil(totalItems / catItemsPerPage);
    paginationElement.innerHTML = '';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${catCurrentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="return changeCategoryPage(${catCurrentPage - 1})">Previous</a>`;
    paginationElement.appendChild(prevLi);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === catCurrentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="return changeCategoryPage(${i})">${i}</a>`;
        paginationElement.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${catCurrentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="return changeCategoryPage(${catCurrentPage + 1})">Next</a>`;
    paginationElement.appendChild(nextLi);
}

function changeCategoryPage(page) {
    const totalPages = Math.ceil(calculateCategoryStats(filteredIncidents).length / catItemsPerPage);
    if (page < 1 || page > totalPages) return false;
    
    catCurrentPage = page;
    updateCategoryTable(filteredIncidents);
    return false;
}



// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeHowToUse();
    fetchIncidents();


    // Add event listeners
    document.querySelectorAll('.sortable').forEach(th =>
        th.addEventListener('click', () => sortTable(th.dataset.sort))
    );


    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }


    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    const applyCustomFilterBtn = document.getElementById('applyCustomFilter');
    if (applyCustomFilterBtn) {
        applyCustomFilterBtn.addEventListener('click', applyCustomFilter);
    }

    const clearCustomFilterBtn = document.getElementById('clearCustomFilter');
    if (clearCustomFilterBtn) {
        clearCustomFilterBtn.addEventListener('click', clearCustomFilter);
    }


    // Auto refresh every 5 minutes
    setInterval(fetchIncidents, 300000);
});

