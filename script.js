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
    loadFromGitHub();
    
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchEmployee();
    });

    updateTodayDate();
    updateLastUpdated();
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
            showStatus('📤 No roster data found. Use "Update Roster" to upload.', 'error');
        });
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

function updateLastUpdated() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
    document.getElementById('lastUpdated').textContent = dateStr;
}

function updateMonthDisplay() {
    if (rosterData && rosterData.month) {
        document.getElementById('monthDisplay').textContent = rosterData.month;
    }
}

// ============================================
// GET TODAY INDEX - FIXED!
// ============================================
function getTodayIndex() {
    if (!rosterData || !rosterData.dates) return -1;
    const today = new Date();
    
    // Get today in DD-MM-YYYY format
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayStr = `${day}-${month}-${year}`;
    
    console.log('Today:', todayStr);
    console.log('Available dates:', rosterData.dates);
    
    for (let i = 0; i < rosterData.dates.length; i++) {
        if (rosterData.dates[i] === todayStr) {
            console.log('✅ Found today at index:', i);
            return i;
        }
    }
    
    console.log('❌ Today not found in roster');
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
            📋 No shift data available for today
        </p>`;
        return;
    }

    const groups = {
        'A': [], 'B': [], 'C': [], 'GEN': [], 'MID': [], 'WO': [], 'LV': []
    };

    for (const [name, shifts] of Object.entries(rosterData.employees)) {
        if (shifts && shifts[todayIndex]) {
            const shift = shifts[todayIndex].toUpperCase();
            if (groups[shift]) {
                groups[shift].push(name);
            }
        }
    }

    // Check if there's any data at all
    const hasData = Object.values(groups).some(arr => arr.length > 0);

    if (!hasData) {
        container.innerHTML = `<p style="color:rgba(255,255,255,0.8); text-align:center; padding:20px;">
            📋 No shifts assigned for today
        </p>`;
        return;
    }

    let html = '';

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
        'A': '🌅', 'B': '☀️', 'C': '🌙',
        'GEN': '🟢', 'MID': '🌗', 'WO': '📅', 'LV': '🏖️'
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
    
    for (let i = 0; i < dates.length && i < 31; i++) {
        const parts = dates[i].split('-');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            html += `<th>${day}</th>`;
        } else {
            html += `<th>${i + 1}</th>`;
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
        showStatus('❌ No roster data found. Use "Update Roster" to upload.', 'error');
        return;
    }

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
        const parts = dates[i].split('-');
        let dateStr;
        if (parts.length === 3) {
            dateStr = parseInt(parts[0]);
        } else {
            dateStr = i + 1;
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
// HELP / INSTRUCTIONS
// ============================================
function showUpdateInstructions() {
    let modal = document.getElementById('helpModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'helpModal';
        modal.className = 'help-modal';
        modal.innerHTML = `
            <div class="help-modal-content">
                <h2>📤 How to Update Roster</h2>
                <ol>
                    <li>Go to <strong>Converter Tool</strong> (click "🔄 Update Roster")</li>
                    <li>Upload your Excel file</li>
                    <li>Download <code>roster.json</code></li>
                    <li>Go to GitHub: <code>data/roster.json</code></li>
                    <li>Click edit (✏️), paste new data</li>
                    <li>Commit changes</li>
                    <li>Done! Everyone sees the new roster</li>
                </ol>
                <p style="margin-top:12px; color:#666; font-size:14px;">
                    ⚠️ Only the repository owner can update the data.
                </p>
                <button onclick="closeHelpModal()" class="close-btn">Got it! ✅</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.classList.add('active');
}

function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('helpModal');
    if (modal && modal.classList.contains('active') && e.target === modal) {
        closeHelpModal();
    }
});

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