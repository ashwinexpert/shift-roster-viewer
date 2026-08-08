// ============================================
// CONFIGURATION
// ============================================
const EMPLOYEES = [
    'Manogna.Kandukuri',
    'Kunj.Trivedi',
    'Devansh Singhai',
    'Arjun.Chilkuri',
    'Gopi.Nagendra',
    'Akash1.Kamble',
    'Ashwin.Rajesh',
    'Himanshu1.Chaudhari',
    'Onkar1 Kulkarni'
];

const SHIFT_NAMES = {
    'A': 'Morning',
    'B': 'Afternoon',
    'C': 'Night',
    'GEN': 'General',
    'MID': 'Mid',
    'WO': 'Weekly Off',
    'LV': 'Leave'
};

const SHIFT_TIMES = {
    'A': '7:30am-4:30pm',
    'B': '1:30pm-10:00pm',
    'C': '10:00pm-7:30am',
    'GEN': '9:00am-6:00pm',
    'MID': '11:00am-8:00pm'
};

let rosterData = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // ALWAYS load from GitHub first (so friends see same data)
    loadFromGitHub();
    
    // Set up handlers
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('importInput').addEventListener('change', handleImport);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchEmployee();
    });

    updateTodayDate();
});

// ============================================
// LOAD FROM GITHUB
// ============================================
function loadFromGitHub() {
    console.log('🔄 Loading from GitHub...');
    fetch('data/roster.json')
        .then(response => {
            if (!response.ok) throw new Error('File not found');
            return response.json();
        })
        .then(data => {
            if (data.dates && data.employees && Object.keys(data.employees).length > 0) {
                rosterData = data;
                // Fix the month display
                if (data.dates && data.dates.length > 0) {
                    const firstDate = data.dates[0];
                    const dateParts = firstDate.split('-');
                    if (dateParts.length === 3) {
                        const month = parseInt(dateParts[1]);
                        const year = parseInt(dateParts[2]);
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                        rosterData.month = monthNames[month - 1] + ' ' + year;
                    }
                }
                renderAll();
                showStatus('📅 Roster loaded from GitHub', 'success');
                console.log('✅ Loaded:', Object.keys(data.employees).length, 'employees,', data.dates.length, 'days');
            }
        })
        .catch(error => {
            console.log('❌ No roster.json found');
            showStatus('📤 Upload a roster to get started', 'success');
        });
}

// ============================================
// FILE UPLOAD
// ============================================
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            processExcelData(jsonData);
            showStatus(`✅ Successfully loaded: ${file.name}`, 'success');
        } catch (error) {
            console.error(error);
            showStatus('❌ Error reading file. Please check the format.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// ============================================
// PROCESS EXCEL DATA
// ============================================
function processExcelData(rows) {
    let dates = [];
    
    // Find dates
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!row) continue;
        let dateCount = 0;
        let dateCandidates = [];
        for (let j = 1; j < row.length && j < 35; j++) {
            const cell = String(row[j] || '');
            if (cell.match(/\d{2}[-/]\d{2}[-/]\d{4}/)) {
                dateCount++;
                dateCandidates.push(cell.trim());
            }
        }
        if (dateCount > 10) {
            dates = dateCandidates;
            break;
        }
    }

    const employeeData = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const firstCell = String(row[0] || '').trim();
        if (!firstCell) continue;

        let matchedName = null;
        for (const emp of EMPLOYEES) {
            const empClean = emp.replace('1', '').trim();
            const firstName = emp.split('.')[0].replace('1', '').trim();
            if (firstCell.includes(empClean) || firstCell.includes(firstName)) {
                matchedName = emp;
                break;
            }
        }

        if (matchedName) {
            const shifts = [];
            for (let j = 1; j < row.length && j <= dates.length + 1; j++) {
                const cell = String(row[j] || '').trim().toUpperCase();
                shifts.push(cell || '');
            }
            while (shifts.length < dates.length) shifts.push('');
            employeeData[matchedName] = shifts.slice(0, dates.length);
        }
    }

    if (Object.keys(employeeData).length > 0 && dates.length > 0) {
        // Fix month display
        const firstDate = dates[0];
        const dateParts = firstDate.split('-');
        let monthDisplay = 'Unknown';
        if (dateParts.length === 3) {
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            monthDisplay = monthNames[month - 1] + ' ' + year;
        }
        
        rosterData = {
            dates: dates,
            employees: employeeData,
            month: monthDisplay
        };
        
        localStorage.setItem('rosterData', JSON.stringify(rosterData));
        renderAll();
        showStatus('✅ Roster loaded successfully!', 'success');
    } else {
        showStatus('❌ Could not parse the roster. Found ' + Object.keys(employeeData).length + ' employees and ' + dates.length + ' dates.', 'error');
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderAll() {
    if (!rosterData) return;
    updateMonthDisplay();
    renderTodayView();
    renderFullMonth();
}

function updateTodayDate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    const dayStr = now.toLocaleDateString('en-IN', { weekday: 'long' });
    document.getElementById('todayDate').textContent = `${dateStr} (${dayStr})`;
}

function updateMonthDisplay() {
    if (rosterData && rosterData.month) {
        document.getElementById('monthDisplay').textContent = rosterData.month;
    } else if (rosterData && rosterData.dates && rosterData.dates.length > 0) {
        // Fallback: parse from first date
        const firstDate = rosterData.dates[0];
        const dateParts = firstDate.split('-');
        if (dateParts.length === 3) {
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            document.getElementById('monthDisplay').textContent = monthNames[month - 1] + ' ' + year;
        }
    }
}

function getTodayIndex() {
    if (!rosterData || !rosterData.dates) return -1;
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    for (let i = 0; i < rosterData.dates.length; i++) {
        const date = new Date(rosterData.dates[i]);
        const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (dateStr === todayStr) return i;
    }
    return -1;
}

// ============================================
// TODAY VIEW
// ============================================
function renderTodayView() {
    const container = document.getElementById('todayShiftSummary');
    const todayIndex = getTodayIndex();
    
    if (todayIndex === -1 || !rosterData || !rosterData.employees) {
        container.innerHTML = `<p style="color:rgba(255,255,255,0.8); text-align:center; padding:20px;">
            No shift data for today. Check if roster is uploaded.
        </p>`;
        return;
    }

    // Group employees by shift for today
    const groups = {
        'A': [],
        'B': [],
        'C': [],
        'GEN': [],
        'MID': [],
        'WO': [],
        'LV': []
    };

    for (const [name, shifts] of Object.entries(rosterData.employees)) {
        if (shifts && shifts[todayIndex]) {
            const shift = shifts[todayIndex].toUpperCase();
            if (groups[shift]) {
                groups[shift].push(name);
            }
        }
    }

    let html = '';

    // Available shifts (A, B, C, GEN, MID)
    const availableShifts = ['A', 'B', 'C', 'GEN', 'MID'];
    for (const shift of availableShifts) {
        const names = groups[shift] || [];
        const time = SHIFT_TIMES[shift] || '';
        html += `
            <div class="shift-group">
                <div class="shift-group-header">
                    <span>${getShiftIcon(shift)} ${SHIFT_NAMES[shift] || shift}</span>
                    <span class="shift-time">${time}</span>
                </div>
                <div class="names">
                    ${names.length > 0 ? names.map(n => `<span class="name-tag">${n}</span>`).join('') : 
                    `<span class="empty">No one available</span>`}
                </div>
            </div>
        `;
    }

    // Not available (WO and LV)
    const notAvailable = [];
    if (groups['WO'] && groups['WO'].length > 0) {
        notAvailable.push({ type: 'WO', label: '📅 Weekly Off', names: groups['WO'] });
    }
    if (groups['LV'] && groups['LV'].length > 0) {
        notAvailable.push({ type: 'LV', label: '🏖️ On Leave', names: groups['LV'] });
    }

    if (notAvailable.length > 0) {
        html += `<div class="not-available"><strong>❌ Not Available Today</strong>`;
        for (const item of notAvailable) {
            html += `
                <div class="na-group">
                    <span style="font-size:13px;">${item.label}:</span>
                    ${item.names.map(n => `<span class="na-tag ${item.type}">${n}</span>`).join('')}
                </div>
            `;
        }
        html += `</div>`;
    }

    container.innerHTML = html;
}

function getShiftIcon(shift) {
    const icons = {
        'A': '🌅',
        'B': '☀️',
        'C': '🌙',
        'GEN': '🟢',
        'MID': '🌗',
        'WO': '📅',
        'LV': '🏖️'
    };
    return icons[shift] || '📌';
}

// ============================================
// FULL MONTH VIEW
// ============================================
function renderFullMonth() {
    const container = document.getElementById('fullMonthTable');
    
    if (!rosterData || !rosterData.employees || Object.keys(rosterData.employees).length === 0) {
        container.innerHTML = `<p style="color:#666; text-align:center; padding:20px;">No data to display</p>`;
        return;
    }

    const dates = rosterData.dates;
    const employees = rosterData.employees;

    let html = '<table><thead><tr><th>Employee</th>';
    
    // Show day numbers only (1, 2, 3...)
    for (let i = 0; i < dates.length && i < 31; i++) {
        const date = new Date(dates[i]);
        const day = date.getDate();
        if (!isNaN(day)) {
            html += `<th>${day}</th>`;
        } else {
            // Fallback: extract day from string
            const parts = dates[i].split('-');
            if (parts.length === 3) {
                html += `<th>${parseInt(parts[0])}</th>`;
            } else {
                html += `<th>${i + 1}</th>`;
            }
        }
    }
    html += '</tr></thead><tbody>';

    const todayIndex = getTodayIndex();

    for (const [name, shifts] of Object.entries(employees)) {
        html += `<tr><td>${name}</td>`;
        for (let i = 0; i < dates.length && i < 31; i++) {
            const shift = shifts && shifts[i] ? shifts[i].toUpperCase() : '';
            const isToday = i === todayIndex;
            let cell = `<span class="shift-cell ${shift}">${shift || '-'}</span>`;
            if (isToday && shift) {
                cell = `<span class="shift-cell ${shift}" style="border: 2px solid #FFD700; box-shadow: 0 0 8px rgba(255,215,0,0.5);">${shift}</span>`;
            }
            html += `<td>${cell}</td>`;
        }
        html += '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================
// SEARCH EMPLOYEE
// ============================================
function searchEmployee() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query) {
        resultsContainer.style.display = 'none';
        return;
    }

    if (!rosterData || !rosterData.employees) {
        showStatus('❌ Please upload a roster first', 'error');
        return;
    }

    // Find matching employee
    let found = null;
    let foundName = '';
    for (const [name, shifts] of Object.entries(rosterData.employees)) {
        if (name.toLowerCase().includes(query) || query.includes(name.toLowerCase())) {
            found = shifts;
            foundName = name;
            break;
        }
    }

    if (!found) {
        resultsContainer.innerHTML = `<p style="color:#666;">No employee found matching "${query}"</p>`;
        resultsContainer.style.display = 'block';
        return;
    }

    const dates = rosterData.dates;
    const todayIndex = getTodayIndex();
    const todayShift = todayIndex !== -1 && found[todayIndex] ? found[todayIndex].toUpperCase() : '';

    let html = `<h3>📋 ${foundName}'s Roster</h3>`;
    html += `<div class="employee-month">`;
    
    for (let i = 0; i < dates.length && i < 31; i++) {
        const date = new Date(dates[i]);
        let dateStr = date.getDate();
        if (isNaN(dateStr)) {
            const parts = dates[i].split('-');
            if (parts.length === 3) {
                dateStr = parseInt(parts[0]);
            } else {
                dateStr = i + 1;
            }
        }
        const shift = found[i] ? found[i].toUpperCase() : '-';
        const isToday = i === todayIndex;
        
        let displayShift = shift;
        if (isToday && shift !== '-') {
            displayShift = `👉 ${shift}`;
        }
        
        const badgeClass = shift !== '-' ? `shift-badge ${shift}` : 'shift-badge';
        html += `
            <span class="date-label">${dateStr}</span>
            <span>${isToday ? '⭐ ' : ''}<span class="${badgeClass}">${displayShift}</span></span>
        `;
    }
    
    html += '</div>';
    
    if (todayShift && todayShift !== '-') {
        html += `<p style="margin-top:12px; padding:8px 12px; background:#fef3c7; border-radius:8px;">
            ✅ <strong>Today's Shift:</strong> ${getShiftIcon(todayShift)} ${SHIFT_NAMES[todayShift] || todayShift} 
            (${SHIFT_TIMES[todayShift] || ''})
        </p>`;
    }

    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').style.display = 'none';
}

// ============================================
// EXPORT / IMPORT
// ============================================
function exportData() {
    if (!rosterData) {
        showStatus('❌ No data to export', 'error');
        return;
    }

    const dataStr = JSON.stringify(rosterData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('✅ Data exported successfully!', 'success');
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.dates && data.employees) {
                rosterData = data;
                // Fix month
                if (data.dates && data.dates.length > 0) {
                    const firstDate = data.dates[0];
                    const dateParts = firstDate.split('-');
                    if (dateParts.length === 3) {
                        const month = parseInt(dateParts[1]);
                        const year = parseInt(dateParts[2]);
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                        rosterData.month = monthNames[month - 1] + ' ' + year;
                    }
                }
                localStorage.setItem('rosterData', JSON.stringify(rosterData));
                renderAll();
                showStatus('✅ Data imported successfully!', 'success');
            } else {
                showStatus('❌ Invalid data format.', 'error');
            }
        } catch (error) {
            showStatus('❌ Error reading file.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// UTILITY
// ============================================
function showStatus(message, type) {
    const el = document.getElementById('statusMessage');
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}