// ---------- Firebase config (your project) ----------
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

// ---------- Helpers ----------
function getDeviceId() {
    let id = localStorage.getItem('deviceId_v1');
    if (!id) { id = 'dev-' + Math.random().toString(36).slice(2, 12); localStorage.setItem('deviceId_v1', id); }
    return id;
}
const DEVICE_ID = getDeviceId();
let currentSessionId = null;
let currentSection = null;

const gridEl = document.getElementById('grid');
const sectionSelectEl = document.getElementById('sectionSelect');
const dateInput = document.getElementById('dateInput');
const qrContainer = document.getElementById('qrContainer');
const sessionInfo = document.getElementById('sessionInfo');
const deviceListEl = document.getElementById('deviceList');
const generateBtn = document.getElementById('generateBtn');
const stopBtn = document.getElementById('stopBtn');

const formModal = document.getElementById('formModal');
const modalSessionLabel = document.getElementById('modalSessionLabel');
const rollInput = document.getElementById('rollInput');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const formMsg = document.getElementById('formMsg');

dateInput.value = new Date().toISOString().slice(0, 10);

function normalizeRollInput(val) {
    const n = Number(val);
    if (Number.isNaN(n)) return val.trim();
    return String(n).padStart(2, '0');
}

// ---------- Grid from DB (also attach click handler for each cell) ----------
async function buildGridFromDB(section) {
    gridEl.innerHTML = '';
    if (!section) return;
    const snap = await db.ref(`Section ${section}`).get();
    if (!snap.exists()) {
        gridEl.innerHTML = '<div style="padding:12px;color:#666">No data found for this section in DB.</div>';
        return;
    }
    const data = snap.val();
    Object.keys(data).sort((a, b) => Number(a) - Number(b)).forEach(rk => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.roll = rk;
        cell.textContent = rk;
        cell.title = data[rk] || '';
        // attach click handler -> toggle states
        cell.addEventListener('click', () => handleCellClick(rk, cell));
        gridEl.appendChild(cell);
    });
}
sectionSelectEl.addEventListener('change', () => { currentSection = sectionSelectEl.value; buildGridFromDB(currentSection); });

// ---------- Session & QR (uses location.origin when hosted) ----------
function makeSessionId() { return 'sess-' + Date.now().toString(36); }

generateBtn.addEventListener('click', async () => {
    if (!sectionSelectEl.value) { alert('Select section first'); return; }
    currentSection = sectionSelectEl.value;
    currentSessionId = makeSessionId();
    await db.ref(`sessions/${currentSessionId}/meta`).set({ section: currentSection, date: dateInput.value, startedAt: Date.now() });

    let hostOrigin = location.origin;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        const manual = prompt('You are on localhost. Enter the public URL where this site will be hosted (e.g. https://your-site.netlify.app). If you will deploy now, paste that URL; otherwise you can cancel and test locally via LAN IP.');
        if (manual) hostOrigin = manual.replace(/\/$/, '');
        else {
            alert('Proceeding with localhost in QR may not work for phones. Deploy to Netlify or enter public URL next time.');
        }
    }

    const sessionUrl = `${hostOrigin}${location.pathname}?sessionId=${currentSessionId}`;
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, { text: sessionUrl, width: 220, height: 220 });

    sessionInfo.textContent = `Active session: ${currentSessionId} (Section ${currentSection})`;
    generateBtn.disabled = true; stopBtn.disabled = false;

    attachAttendanceListener(currentSessionId);
    attachTempDevicesListener(currentSessionId);
});

stopBtn.addEventListener('click', async () => {
    if (!currentSessionId) return;
    await db.ref(`sessions/${currentSessionId}/meta/endedAt`).set(Date.now());
    await db.ref(`tempDevices/${currentSessionId}`).remove().catch(() => { });
    sessionInfo.textContent = 'No active session';
    qrContainer.innerHTML = '';
    currentSessionId = null;
    generateBtn.disabled = false; stopBtn.disabled = true;
    deviceListEl.textContent = '';
    buildGridFromDB(currentSection);
});

// ---------- Attendance realtime listener (updated to read status field) ----------
let attendanceRef = null;
function attachAttendanceListener(sid) {
    if (attendanceRef) attendanceRef.off();
    attendanceRef = db.ref(`attendance/${sid}`);
    attendanceRef.on('value', snap => {
        const data = snap.val() || {};
        // clear classes
        document.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('present');
            c.classList.remove('absent');
        });
        // apply statuses
        Object.keys(data).forEach(roll => {
            const record = data[roll];
            const status = record && record.status ? record.status : 'present'; // backwards compat
            const cell = document.querySelector(`.cell[data-roll="${roll}"]`);
            if (cell) {
                if (status === 'present') {
                    cell.classList.add('present');
                    cell.classList.remove('absent');
                } else if (status === 'absent') {
                    cell.classList.add('absent');
                    cell.classList.remove('present');
                } else {
                    cell.classList.remove('present', 'absent');
                }
            }
        });
    });
}

// ---------- temp devices listener ----------
let tempRef = null;
function attachTempDevicesListener(sid) {
    if (tempRef) tempRef.off();
    tempRef = db.ref(`tempDevices/${sid}`);
    tempRef.on('value', snap => {
        const list = snap.val() || {};
        deviceListEl.textContent = Object.keys(list).length ? Object.keys(list).join('\n') : '(none)';
    });
}

// ---------- Student form logic ----------
function openStudentForm(sid) {
    db.ref(`tempDevices/${sid}/${DEVICE_ID}`).set({ ts: Date.now() }).catch(() => { });
    modalSessionLabel.textContent = `Session: ${sid}`;
    rollInput.value = ''; formMsg.textContent = '';
    formModal.style.display = 'flex';
    window._studentSessionId = sid;
}

cancelBtn.addEventListener('click', async () => {
    if (window._studentSessionId) await db.ref(`tempDevices/${window._studentSessionId}/${DEVICE_ID}`).remove().catch(() => { });
    formModal.style.display = 'none';
    window._studentSessionId = null;
});

saveBtn.addEventListener('click', async () => {
    const sid = window._studentSessionId;
    if (!sid) { formMsg.textContent = 'No active session.'; return; }
    const roll = normalizeRollInput(rollInput.value);
    if (!roll) { formMsg.textContent = 'Enter roll.'; return; }

    formMsg.textContent = 'Checking...';
    try {
        const deviceClaimSnap = await db.ref(`sessionClaims/${sid}/${DEVICE_ID}`).get();
        if (deviceClaimSnap.exists()) { formMsg.textContent = 'This device already claimed a roll.'; return; }

        const rollSnap = await db.ref(`attendance/${sid}/${roll}`).get();
        if (rollSnap.exists() && rollSnap.val().deviceId !== DEVICE_ID) { formMsg.textContent = 'This roll already marked by another device.'; return; }

        await db.ref(`sessionClaims/${sid}/${DEVICE_ID}`).set({ roll, ts: Date.now() });
        await db.ref(`attendance/${sid}/${roll}`).set({ deviceId: DEVICE_ID, ts: Date.now(), section: currentSection || 'unknown', status: 'present' });
        await db.ref(`tempDevices/${sid}/${DEVICE_ID}`).remove().catch(() => { });

        formMsg.style.color = 'green'; formMsg.textContent = 'Saved.';
        setTimeout(() => { formModal.style.display = 'none'; formMsg.style.color = '#a00'; }, 700);

    } catch (err) {
        console.error('Save error', err);
        formMsg.textContent = 'Error saving. See console.';
    }
});

// Auto-open modal if ?sessionId in URL (student scanned QR)
(function maybeOpenFromUrl() {
    const p = new URLSearchParams(location.search);
    const sid = p.get('sessionId');
    if (sid) openStudentForm(sid);
})();

// ---------- Scanner (html5-qrcode) ----------
const qrScannerDiv = document.getElementById('qrScanner');
let html5QrcodeScanner = null;
let scannerActive = false;

function extractSessionIdFromDecoded(decodedText) {
    try {
        const url = new URL(decodedText);
        const sid = url.searchParams.get('sessionId');
        return sid || decodedText;
    } catch {
        return decodedText;
    }
}

// ---------- NEW: Cell click handler that toggles present/absent/unmarked ----------
async function handleCellClick(roll, cellEl) {
    // require session
    if (!currentSessionId) {
        alert('Start a session first (click Start Session) to mark attendance manually.');
        return;
    }

    // determine current state
    const isPresent = cellEl.classList.contains('present');
    const isAbsent = cellEl.classList.contains('absent');

    // cycle: none -> present -> absent -> none
    let newStatus = null;
    if (!isPresent && !isAbsent) newStatus = 'present';
    else if (isPresent) newStatus = 'absent';
    else newStatus = null; // unmark

    try {
        if (newStatus === null) {
            await db.ref(`attendance/${currentSessionId}/${roll}`).remove();
            cellEl.classList.remove('present', 'absent');
        } else {
            await db.ref(`attendance/${currentSessionId}/${roll}`).set({
                deviceId: 'manual',
                status: newStatus,
                markedBy: 'teacher',
                ts: Date.now()
            });
            // optimistic UI update (listener will also sync)
            cellEl.classList.remove('present', 'absent');
            cellEl.classList.add(newStatus === 'present' ? 'present' : 'absent');
        }
    } catch (err) {
        console.error('Error toggling cell', err);
        alert('Error saving attendance. See console.');
    }
}

// ====== GEO + QR SCAN ======
const scanBtn = document.getElementById('scanBtn');
const markLocBtn = document.getElementById('markLocBtn');
const geoMsg = document.getElementById('geoMsg');
let html5Qr = null;

// Save allowed college coords to DB
markLocBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    await db.ref("allowedLocation").set({ lat: latitude, lng: longitude });
    geoMsg.textContent = `Saved location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    geoMsg.style.color = "lightgreen";
  }, (err) => {
    alert("Location error: " + err.message);
  });
});

// Start QR scanner
scanBtn.addEventListener('click', () => {
  document.getElementById('qrScanner').style.display = 'block';
  if (!html5Qr) {
    html5Qr = new Html5Qrcode("qrScanner");
  }
  html5Qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    async (decodedText) => {
      // On QR decoded -> stop scanning
      await html5Qr.stop();
      document.getElementById('qrScanner').style.display = 'none';
      geoMsg.textContent = "QR scanned. Checking location...";
      checkLocationAndMark(decodedText);
    },
    (err) => { /* ignore scan errors */ }
  ).catch(e => { console.error("QR error", e); });
});

// Check geo before marking
async function checkLocationAndMark(decodedText) {
  const allowedSnap = await db.ref("allowedLocation").get();
  if (!allowedSnap.exists()) {
    geoMsg.textContent = "No allowed location saved in DB.";
    return;
  }
  const { lat, lng } = allowedSnap.val();
  if (!navigator.geolocation) {
    geoMsg.textContent = "Geolocation not supported";
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const d = distanceInMeters(lat, lng, pos.coords.latitude, pos.coords.longitude);
    if (d > 50) { // >50m away
      geoMsg.textContent = `Not in campus. Distance ${d.toFixed(1)}m`;
      geoMsg.style.color = "red";
      return;
    }
    geoMsg.textContent = "Location OK, marking attendance...";
    geoMsg.style.color = "lightgreen";

    // Extract sessionId from QR link
    const sid = extractSessionIdFromDecoded(decodedText);
    if (!sid) {
      geoMsg.textContent = "Invalid QR code";
      return;
    }
    // Open student form (reuse your existing logic)
    openStudentForm(sid);
  }, (err) => {
    geoMsg.textContent = "Location error: " + err.message;
  });
}

// Haversine distance (meters)
function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => x * Math.PI/180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
