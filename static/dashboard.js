// Global variables
let incidents = [];
let filteredIncidents = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSortColumn = 'created_on';
let sortDirection = 'desc';
let catCurrentPage = 1;
const catItemsPerPage = 10;


// Register Chart.js plugins
Chart.register(ChartDataLabels);


// Main data fetching function
function fetchIncidents() {
    const loadingIndicator = document.getElementById('loading');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }


    console.log('Fetching incidents...');
    return axios.get('/api/incidents')
        .then(function (response) {
            console.log('API Response:', response);
            if (response.data && Array.isArray(response.data)) {
                console.log(`Received ${response.data.length} incidents`);
                incidents = response.data;
                filteredIncidents = [...incidents];
                updateDisplay();
            } else {
                console.error('Invalid data format received from API:', response.data);
                throw new Error('Invalid data format received from API');
            }
        })
        .catch(function (error) {
            console.error('Error fetching incidents:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
                console.error('Error status:', error.response.status);
            }
            incidents = [];
            filteredIncidents = [];
            updateDisplay();
        })
        .finally(function () {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
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


function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sorting-asc', 'sorting-desc');
    });


    const currentHeader = document.querySelector(`.sortable[data-sort="${currentSortColumn}"]`);
    if (currentHeader) {
        currentHeader.classList.add(sortDirection === 'asc' ? 'sorting-asc' : 'sorting-desc');
    }
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




// Main display update function
function updateDisplay() {
    try {
        console.log('UpdateDisplay called with filtered incidents:', filteredIncidents);
        console.log('Sample incident:', filteredIncidents[0]);
        sortTable(currentSortColumn);
        displayPage(currentPage);
        updatePagination();
        updateShowingEntries();
        updatePriorityChart();
        updateDeveloperTable(filteredIncidents);
        updateCategoryTable(filteredIncidents);
        updateTeamPriorityTable(filteredIncidents);
    } catch (error) {
        console.error('Error in updateDisplay:', error);
    }
}


function updateShowingEntries() {
    const showingElement = document.getElementById('showing-entries');
    if (!showingElement) {
        console.log('showing-entries element not found');
        return;
    }
   
    try {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredIncidents.length);
        const total = filteredIncidents.length;
       
        showingElement.textContent = `Showing ${total > 0 ? startIndex + 1 : 0} to ${endIndex} of ${total} entries`;
       
        // Debug log
        console.log('Updating showing entries:', {
            startIndex,
            endIndex,
            total,
            currentPage,
            itemsPerPage
        });
    } catch (error) {
        console.error('Error in updateShowingEntries:', error);
    }
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


// Filter-related functions
function addFilterCriteria() {
    const filterHTML = `
        <div class="filter-criterion">
            <select class="form-select form-select-sm filter-field" style="width: 150px;">
                <option value="">Select Field</option>
                <option value="assignment_group">Assignment Group</option>
                <option value="created_on">Created Date</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
                <option value="category">Category</option>
                <option value="assigned_to">Assigned To</option>
                <option value="caller">Caller</option>
            </select>
            <select class="form-select form-select-sm filter-operator" style="width: 120px;">
                <!-- Operators will be dynamically populated -->
            </select>
            <input type="text" class="form-control form-control-sm filter-value" style="width: 200px;" placeholder="Value">
            <button class="btn btn-danger btn-sm remove-filter">Remove</button>
        </div>
    `;
    document.getElementById('filterCriteria').insertAdjacentHTML('beforeend', filterHTML);
    updateOperators(document.querySelector('.filter-criterion:last-child .filter-field'));
}


function updateOperators(fieldSelect) {
    const operatorSelect = fieldSelect.nextElementSibling;
    const fieldType = fieldSelect.value;
   
    let operators;
    if (fieldType === 'created_on') {
        operators = ['before', 'after', 'between'];
    } else if (['assignment_group', 'status', 'priority', 'category'].includes(fieldType)) {
        operators = ['equals', 'not equals'];
    } else {
        operators = ['contains', 'equals', 'starts with', 'ends with'];
    }


    operatorSelect.innerHTML = operators.map(op => `<option value="${op}">${op}</option>`).join('');
}


function applyFilters() {
    try {
        // Get main filters (Assignment Group and Date Range)
        const assignmentGroup = document.getElementById('assignmentGroupFilter')?.value;
        const dateFrom = document.getElementById('dateFrom')?.value ? new Date(document.getElementById('dateFrom').value) : null;
        const dateTo = document.getElementById('dateTo')?.value ? new Date(document.getElementById('dateTo').value + 'T23:59:59') : null;


        // Get custom filters
        const customFilters = [];
        document.querySelectorAll('.filter-criterion').forEach(criterion => {
            const field = criterion.querySelector('.filter-field')?.value;
            const operator = criterion.querySelector('.filter-operator')?.value;
            const value = criterion.querySelector('.filter-value')?.value;
            if (field && operator && value) {
                customFilters.push({ field, operator, value });
            }
        });


        // Apply all filters
        filteredIncidents = incidents.filter(incident => {
            // Check assignment group filter
            const matchesGroup = !assignmentGroup || incident.assignment_group === assignmentGroup;


            // Check date range
            const incidentDate = new Date(incident.created_on);
            const matchesDateRange = (!dateFrom || incidentDate >= dateFrom) &&
                                   (!dateTo || incidentDate <= dateTo);


            // Check custom filters
            const matchesCustomFilters = customFilters.every(filter => {
                const fieldValue = String(incident[filter.field] || '').toLowerCase();
                const filterValue = filter.value.toLowerCase();


                switch (filter.operator) {
                    case 'contains':
                        return fieldValue.includes(filterValue);
                    case 'equals':
                        return fieldValue === filterValue;
                    case 'not equals':
                        return fieldValue !== filterValue;
                    case 'starts with':
                        return fieldValue.startsWith(filterValue);
                    case 'ends with':
                        return fieldValue.endsWith(filterValue);
                    case 'before':
                        return new Date(incident[filter.field]) < new Date(filter.value);
                    case 'after':
                        return new Date(incident[filter.field]) > new Date(filter.value);
                    case 'between':
                        const [start, end] = filter.value.split(',');
                        const date = new Date(incident[filter.field]);
                        return date >= new Date(start) && date <= new Date(end);
                    default:
                        return true;
                }
            });


            // Return true only if all filter conditions are met
            return matchesGroup && matchesDateRange && matchesCustomFilters;
        });


        // Update display
        currentPage = 1;
        updateDisplay();


    } catch (error) {
        console.error('Error in applyFilters:', error);
        console.log('Current filter state:', {
            assignmentGroup: document.getElementById('assignmentGroupFilter')?.value,
            dateFrom: document.getElementById('dateFrom')?.value,
            dateTo: document.getElementById('dateTo')?.value,
            filteredIncidents: filteredIncidents?.length
        });
    }
}


// Developer table functions
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


// Priority chart function
function updatePriorityChart() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }


    const canvas = document.getElementById('priorityChart');
    if (!canvas) {
        console.error('Priority chart canvas not found');
        return;
    }


    const ctx = canvas.getContext('2d');


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
                    '#FF6384', // Critical - Bright Red
                    '#FFCE56', // High - Bright Yellow
                    '#36A2EB', // Moderate - Bright Blue
                    '#4BC0C0', // Low - Teal
                    '#9966FF'  // Planning - Purple
                ]
            }]
        };


        if (window.priorityChart instanceof Chart) {
            window.priorityChart.destroy();
        }


        window.priorityChart = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'left',
                        labels: {
                            font: {
                                size: 14
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label}: ${value} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: isNaN(value) || value === 0,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart.data.datasets[0].data.reduce((acc, val) => acc + val, 0);
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
    }
}


function updateTeamPriorityTable(incidents) {
    console.log('Starting updateTeamPriorityTable');
    const tableBody = document.querySelector('#teamPriorityTable tbody');
    if (!tableBody) {
        console.error('Team priority table body not found');
        return;
    }


    // Clear existing table content
    tableBody.innerHTML = '';


    // Get all unique teams and initialize data structure
    const teamData = {};
    const teams = [
        'GTS', 'Sourcing 2.0', 'FTS', 'Unassigned', 'Experts engine',
        'App Engine Admins', 'Hardware', 'Network', 'Openspace',
        'Service Desk', 'Software'
    ];


    // Initialize data structure for each team
    teams.forEach(team => {
        teamData[team] = {
            Critical: 0,
            High: 0,
            Moderate: 0,
            Low: 0,
            Planning: 0,
            Total: 0
        };
    });


    // Process incidents
    incidents.forEach(incident => {
        const status = (incident.status || '').toLowerCase();
        if (['new', 'in progress', 'on hold'].includes(status)) {
            const team = incident.assignment_group || 'Unassigned';
            let priority = (incident.priority || '').toLowerCase();


            // Map priority to category
            let priorityCategory;
            if (priority.includes('1') || priority.includes('critical')) {
                priorityCategory = 'Critical';
            } else if (priority.includes('2') || priority.includes('high')) {
                priorityCategory = 'High';
            } else if (priority.includes('3') || priority.includes('moderate')) {
                priorityCategory = 'Moderate';
            } else if (priority.includes('4') || priority.includes('low')) {
                priorityCategory = 'Low';
            } else {
                priorityCategory = 'Planning';
            }


            // Increment counters if team exists
            if (teamData[team]) {
                teamData[team][priorityCategory]++;
                teamData[team].Total++;
            }
        }
    });


    // Create table rows
    teams.forEach(team => {
        if (teamData[team].Total > 0) {  // Only show teams with incidents
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${team}</td>
                <td class="text-center">${teamData[team].Critical}</td>
                <td class="text-center">${teamData[team].High}</td>
                <td class="text-center">${teamData[team].Moderate}</td>
                <td class="text-center">${teamData[team].Low}</td>
                <td class="text-center">${teamData[team].Planning}</td>
                <td class="text-center total-column">${teamData[team].Total}</td>
            `;
            tableBody.appendChild(row);
        }
    });


    // Calculate and add totals row
    const totals = {
        Critical: 0,
        High: 0,
        Moderate: 0,
        Low: 0,
        Planning: 0,
        Total: 0
    };


    // Calculate totals
    Object.values(teamData).forEach(data => {
        totals.Critical += data.Critical;
        totals.High += data.High;
        totals.Moderate += data.Moderate;
        totals.Low += data.Low;
        totals.Planning += data.Planning;
        totals.Total += data.Total;
    });


    // Add totals row
    const totalRow = document.createElement('tr');
    totalRow.classList.add('total-row');
    totalRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td class="text-center"><strong>${totals.Critical}</strong></td>
        <td class="text-center"><strong>${totals.High}</strong></td>
        <td class="text-center"><strong>${totals.Moderate}</strong></td>
        <td class="text-center"><strong>${totals.Low}</strong></td>
        <td class="text-center"><strong>${totals.Planning}</strong></td>
        <td class="text-center total-column"><strong>${totals.Total}</strong></td>
    `;
    tableBody.appendChild(totalRow);


    // Debug logging
    console.log('Team Data:', teamData);
    console.log('Totals:', totals);
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
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageIncidents = filteredIncidents.slice(startIndex, endIndex);


    const tableBody = document.getElementById('incidentTableBody');
    tableBody.innerHTML = '';


    pageIncidents.forEach(incident => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td title="${incident.number}"><a href="${getServiceNowTicketUrl(incident.number)}" target="_blank">${incident.number}</a></td>
            <td title="${incident.short_description}">${incident.short_description}</td>
            <td title="${formatDate(incident.created_on)}">${formatDate(incident.created_on)}</td>
            <td title="${incident.caller}">${incident.caller}</td>
            <td title="${incident.assigned_to}">${incident.assigned_to || 'Unassigned'}</td>
            <td title="${incident.status}"><span class="status-badge ${getStatusClass(incident.status)}">${incident.status}</span></td>
            <td title="${incident.priority}"><span class="priority-badge ${getPriorityClass(incident.priority)}">${incident.priority}</span></td>
            <td title="${incident.category}">${incident.category}</td>
            <td title="${incident.assignment_group}">${incident.assignment_group}</td>
            <td title="${formatDate(incident.resolved_at)}">${incident.resolved_at === 'Not resolved yet' ? '<span class="status-badge status-hold">Not resolved yet</span>' : formatDate(incident.resolved_at)}</td>
            <td title="${incident.time_spent}">${incident.time_spent}</td>
        `;
        tableBody.appendChild(row);
    });


    updatePagination();
}


// Pagination functions
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
    updateShowingEntries();
    return false;
}


// Reset filters function
function resetFilters() {
    try {
        // Clear main filters
        const assignmentGroupFilter = document.getElementById('assignmentGroupFilter');
        const dateFromFilter = document.getElementById('dateFrom');
        const dateToFilter = document.getElementById('dateTo');


        if (assignmentGroupFilter) assignmentGroupFilter.value = '';
        if (dateFromFilter) dateFromFilter.value = '';
        if (dateToFilter) dateToFilter.value = '';


        // Clear custom filters
        const filterCriteria = document.getElementById('filterCriteria');
        if (filterCriteria) {
            filterCriteria.innerHTML = '';
        }


        // Reset the filtered incidents to show all incidents
        filteredIncidents = [...incidents];


        // Update all displays with the complete data
        currentPage = 1;
        updateDisplay();


    } catch (error) {
        console.error('Error in resetFilters:', error);
    }
}


// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initial setup
    initializeHowToUse();
   
    // Initial data fetch
    fetchIncidents().then(() => {
        updateDisplay();
    }).catch(error => {
        console.error('Error fetching incidents:', error);
    });


    // Event listeners
    document.querySelectorAll('.sortable').forEach(th =>
        th.addEventListener('click', () => sortTable(th.dataset.sort))
    );


    // Filter-related event listeners
    document.getElementById('addFilter')?.addEventListener('click', addFilterCriteria);
    document.getElementById('filterCriteria')?.addEventListener('change', (e) => {
        if (e.target.classList.contains('filter-field')) {
            updateOperators(e.target);
        }
    });
    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);
    document.getElementById('filterCriteria')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-filter')) {
            e.target.closest('.filter-criterion').remove();
        }
    });


    // Auto refresh every 5 minutes
    setInterval(fetchIncidents, 300000);
});


// Helper functions
function getServiceNowTicketUrl(incidentNumber) {
    return `https://dev278567.service-now.com/nav_to.do?uri=incident.do?sysparm_query=number=${incidentNumber}`;
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


function updateCategoryTable(incidents) {
    if (!Array.isArray(incidents)) {
        console.error('Invalid incidents data:', incidents);
        return;
    }


    const categoryStats = calculateCategoryStats(incidents);
    const tableBody = document.querySelector('#categoryDetailsTable tbody');
    if (!tableBody) {
        console.error('Category table body not found');
        return;
    }


    try {
        // Calculate pagination
        const startIndex = (catCurrentPage - 1) * catItemsPerPage;
        const endIndex = Math.min(startIndex + catItemsPerPage, categoryStats.length);
        const pageData = categoryStats.slice(startIndex, endIndex);


        // Update table
        tableBody.innerHTML = '';
        if (pageData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="2">No data available</td></tr>';
            return;
        }


        pageData.forEach(cat => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cat.type || 'N/A'}</td>
                <td>${cat.count || 0}</td>
            `;
            tableBody.appendChild(row);
        });


        // Update pagination
        updateCategoryPagination(categoryStats.length);
    } catch (error) {
        console.error('Error updating category table:', error);
        tableBody.innerHTML = '<tr><td colspan="2">Error loading data</td></tr>';
    }
}


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


function updateCategoryPagination(totalItems) {
    const paginationElement = document.getElementById('categoryPagination');
    if (!paginationElement) return;


    const totalPages = Math.ceil(totalItems / catItemsPerPage);
    paginationElement.innerHTML = '';


    // Add pagination elements here...
    // (You can use a similar structure to the main pagination function)
}

