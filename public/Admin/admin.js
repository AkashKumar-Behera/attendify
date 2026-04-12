// ---------- Firebase config (matching app.js) ----------
const firebaseConfig = {
    apiKey: "AIzaSyBK3VZtiG6nx4BaYGgYKV3PHGRS9yLNfYg",
    authDomain: "attendancemodelqrbyak.firebaseapp.com",
    databaseURL: "https://attendancemodelqrbyak-default-rtdb.firebaseio.com",
    projectId: "attendancemodelqrbyak",
    storageBucket: "attendancemodelqrbyak.appspot.com",
    messagingSenderId: "545446760329",
    appId: "1:545446760329:web:01b5610f98c2db80565b58",
    measurementId: "G-ZMEC7XMKF7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM Elements
const sessionDropdown = document.getElementById('sessionDropdown');
const searchInput = document.getElementById('searchInput');
const tableBody = document.getElementById('tableBody');

let allSessions = [];
let currentSessionData = {};
let currentDeviceMap = {};

// 1. Fetch Sessions
db.ref('sessions').on('value', snapshot => {
    const data = snapshot.val();
    sessionDropdown.innerHTML = '<option value="">Select Class Session</option>';
    allSessions = [];

    if (data) {
        Object.keys(data).forEach(sid => {
            const meta = data[sid].meta || {};
            meta.id = sid;
            allSessions.push(meta);
        });

        // Sort by start time (newest first)
        allSessions.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

        allSessions.forEach(meta => {
            const dateStr = meta.startedAt ? new Date(meta.startedAt).toLocaleDateString() : 'Unknown';
            const option = document.createElement('option');
            option.value = meta.id;
            
            // Re-formatting dropdown text nicely
            option.textContent = `Section ${meta.section || '?'} - ${dateStr}`;
            option.dataset.sec = meta.section;
            sessionDropdown.appendChild(option);
        });
    }
});

// 2. Listen to Session Changes
sessionDropdown.addEventListener('change', (e) => {
    const sid = e.target.value;
    if (!sid) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Please select a session.</td></tr>';
        currentSessionData = {};
        return;
    }

    const sec = e.target.selectedOptions[0].dataset.sec || 'Unknown';
    loadSessionAttendance(sid, sec);
});

// 3. Load Session Data
function loadSessionAttendance(sid, sec) {
    tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading attendance metrics...</td></tr>';
    
    db.ref(`attendance/${sid}`).on('value', snapshot => {
        currentSessionData = snapshot.val() || {};
        
        // Find duplicate device IDs
        currentDeviceMap = {};
        Object.keys(currentSessionData).forEach(roll => {
            const devId = currentSessionData[roll].deviceId;
            if (devId && devId !== 'manual') {
                currentDeviceMap[devId] = (currentDeviceMap[devId] || 0) + 1;
            }
        });
        
        renderTable(sec);
    });
}

// 4. Render Table
function renderTable(sec) {
    tableBody.innerHTML = '';
    const filterText = searchInput.value.toLowerCase().trim();
    const rows = Object.keys(currentSessionData).sort((a, b) => Number(a) - Number(b));
    
    if (rows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No attendance recorded for this session.</td></tr>';
        return;
    }

    let renderedCount = 0;

    rows.forEach(roll => {
        const studentName = "Student Roll " + roll; 
        if (filterText && !roll.includes(filterText) && !studentName.toLowerCase().includes(filterText)) {
            return;
        }
        
        renderedCount++;
        const record = currentSessionData[roll];
        const isProxy = record.deviceId && record.deviceId !== 'manual' && currentDeviceMap[record.deviceId] > 1;
        
        const timeStr = record.ts ? new Date(record.ts).toLocaleTimeString() : 'N/A';
        const dateJoined = record.ts ? new Date(record.ts).toLocaleDateString() : '-';
        
        // Emulate the language used in the reference photo (Excellent/Good/Average)
        let badgeClass = 'status-present';
        let statusLabel = 'Excellent';
        if (record.status === 'absent') {
            badgeClass = 'status-absent';
            statusLabel = 'Absent';
        } else if (isProxy) {
            badgeClass = 'status-proxy';
            statusLabel = 'Proxy Suspect';
        }

        const deviceStr = record.deviceId === 'manual' ? 'Manual Teacher Entry' : record.deviceId;
        
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="user-avatar">${roll}</div>
                    <div>
                        <div class="user-name">Roll Number ${roll.padStart(2, '0')}</div>
                    </div>
                </div>
            </td>
            <td>
                <div>Section <strong style="color:white;">${sec}</strong></div>
            </td>
            <td>
                <div style="font-weight: 500;">${timeStr}</div>
                <div style="font-size: 11px; color: #888;">${dateJoined}</div>
            </td>
            <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
            <td>
                <div style="font-family: monospace; font-size: 13px; color: ${isProxy ? '#ffa726' : '#888'}">${deviceStr || 'Unknown'}</div>
            </td>
            <td><button class="detail-btn">See More Details</button></td>
        `;
        
        tableBody.appendChild(tr);
    });

    if (renderedCount === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No matching students found.</td></tr>';
    }
}

// 5. Search filtering
searchInput.addEventListener('input', () => {
    const sec = sessionDropdown.selectedOptions[0]?.dataset?.sec || 'Unknown';
    if(Object.keys(currentSessionData).length > 0) {
        renderTable(sec);
    }
});
