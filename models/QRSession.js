/**
 * QRSession Model - Attendify
 * 
 * Firebase RTDB schema:
 *  sessions/{sessionId}/meta  -> { section, subject, date, startedAt, endedAt? }
 *  sessions/{sessionId}/attendance/{roll} -> { studentId, name, ts, deviceId, status }
 *  sessions/{sessionId}/claims/{deviceId} -> { roll, ts }   (anti-fraud: 1 device = 1 roll)
 */

const admin = require("firebase-admin");

const db = () => admin.database();

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────

function makeSessionId() {
    return "sess-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─────────────────────────────────────────────────────────
//  Create a new QR session (admin starts session)
// ─────────────────────────────────────────────────────────

async function createSession({ section, subject, date, durationMinutes = 10 }) {
    if (!section || !subject || !date) {
        throw new Error("section, subject and date are required");
    }

    const sessionId = makeSessionId();
    const startedAt = Date.now();
    const expiresAt = startedAt + durationMinutes * 60 * 1000;

    const meta = {
        sessionId,
        section,
        subject,
        date,
        startedAt,
        expiresAt,
        status: "active",
        durationMinutes
    };

    await db().ref(`sessions/${sessionId}/meta`).set(meta);

    return { sessionId, meta };
}

// ─────────────────────────────────────────────────────────
//  Get session meta (also validates if still active)
// ─────────────────────────────────────────────────────────

async function getSession(sessionId) {
    const snap = await db().ref(`sessions/${sessionId}/meta`).once("value");
    if (!snap.exists()) return null;
    return snap.val();
}

async function isSessionActive(sessionId) {
    const meta = await getSession(sessionId);
    if (!meta) return false;
    if (meta.status === "ended") return false;
    if (Date.now() > meta.expiresAt) return false;
    return true;
}

// ─────────────────────────────────────────────────────────
//  Mark attendance (student scans QR)
// ─────────────────────────────────────────────────────────

async function markAttendance({ sessionId, roll, name, deviceId }) {
    if (!sessionId || !roll || !deviceId) {
        throw new Error("sessionId, roll and deviceId are required");
    }

    // 1. Check session is active
    const active = await isSessionActive(sessionId);
    if (!active) {
        return { success: false, message: "Session expired or not found" };
    }

    // 2. Anti-fraud: one device = one roll
    const claimSnap = await db().ref(`sessions/${sessionId}/claims/${deviceId}`).once("value");
    if (claimSnap.exists()) {
        return { success: false, message: "This device already marked attendance" };
    }

    // 3. Anti-fraud: one roll = one device
    const rollSnap = await db().ref(`sessions/${sessionId}/attendance/${roll}`).once("value");
    if (rollSnap.exists() && rollSnap.val().deviceId !== deviceId) {
        return { success: false, message: "This roll number already marked by another device" };
    }

    // 4. Write attendance record
    const ts = Date.now();
    const meta = await getSession(sessionId);

    const record = {
        roll,
        name: name || "Unknown",
        deviceId,
        ts,
        status: "present",
        section: meta.section,
        subject: meta.subject,
        date: meta.date
    };

    // Atomic writes using multi-location update
    const updates = {};
    updates[`sessions/${sessionId}/attendance/${roll}`] = record;
    updates[`sessions/${sessionId}/claims/${deviceId}`] = { roll, ts };

    await db().ref().update(updates);

    return { success: true, message: "Attendance marked successfully", record };
}

// ─────────────────────────────────────────────────────────
//  End session (admin stops session)
// ─────────────────────────────────────────────────────────

async function endSession(sessionId) {
    const snap = await db().ref(`sessions/${sessionId}/meta`).once("value");
    if (!snap.exists()) throw new Error("Session not found");

    await db().ref(`sessions/${sessionId}/meta`).update({
        status: "ended",
        endedAt: Date.now()
    });

    return { success: true, message: `Session ${sessionId} ended` };
}

// ─────────────────────────────────────────────────────────
//  Get all attendance for a session
// ─────────────────────────────────────────────────────────

async function getAttendance(sessionId) {
    const snap = await db().ref(`sessions/${sessionId}/attendance`).once("value");
    return snap.val() || {};
}

// ─────────────────────────────────────────────────────────
//  Get all sessions for a given section + date
// ─────────────────────────────────────────────────────────

async function getSessionsByDate({ section, date }) {
    const snap = await db().ref("sessions").orderByChild("meta/date").equalTo(date).once("value");
    const all = snap.val() || {};
    // Filter by section
    const filtered = {};
    Object.entries(all).forEach(([sid, data]) => {
        if (data.meta && data.meta.section === section) {
            filtered[sid] = data;
        }
    });
    return filtered;
}

// ─────────────────────────────────────────────────────────
//  Exports
// ─────────────────────────────────────────────────────────

module.exports = {
    createSession,
    getSession,
    isSessionActive,
    markAttendance,
    endSession,
    getAttendance,
    getSessionsByDate
};
