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

// DOM Variables
const preTotalEl = document.getElementById('preTotal');
const absTotalEl = document.getElementById('absTotal');
const proxyTotalEl = document.getElementById('proxyTotal');

// Calculate aggregate attendance across all historical sessions
db.ref('attendance').on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalProxies = 0;

    Object.keys(data).forEach(sid => {
        const sessionData = data[sid];
        let deviceMap = {};
        
        // Find duplicate device IDs within THIS specific session
        Object.keys(sessionData).forEach(roll => {
            const devId = sessionData[roll].deviceId;
            if (devId && devId !== 'manual') {
                deviceMap[devId] = (deviceMap[devId] || 0) + 1;
            }
        });

        // Tally up the statuses
        Object.keys(sessionData).forEach(roll => {
            const record = sessionData[roll];
            
            // Check proxy state
            const isProxy = record.deviceId && record.deviceId !== 'manual' && deviceMap[record.deviceId] > 1;
            
            if (isProxy) {
                totalProxies++;
            } else if (record.status === 'absent') {
                totalAbsent++;
            } else if (record.status === 'present') {
                totalPresent++;
            }
        });
    });

    // Update real DOM elements securely
    if (preTotalEl) preTotalEl.textContent = totalPresent.toLocaleString();
    if (absTotalEl) absTotalEl.textContent = totalAbsent.toLocaleString();
    if (proxyTotalEl) proxyTotalEl.textContent = totalProxies.toLocaleString();
});
