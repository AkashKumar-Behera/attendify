require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const QRSession = require("./models/QRSession");

// ─── Firebase Admin Init ───────────────────────────────────────────────────────

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN);
// Fix escaped newlines in private key (common in .env)
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://attendance-model-77-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

// ─── Express Setup ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ─── Students Routes ────────────────────────────────────────────────────────────

// GET /students/:sec  → Return all students of a section
app.get("/students/:sec", async (req, res) => {
    try {
        const sec = req.params.sec;
        const snap = await db.ref("students")
            .orderByChild("sec")
            .equalTo(sec)
            .once("value");
        const data = snap.val() || {};
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── QR Session Routes ─────────────────────────────────────────────────────────

/**
 * POST /api/sessions
 * Body: { section, subject, date, durationMinutes? }
 * Admin creates a new QR attendance session → returns sessionId + QR URL
 */
app.post("/api/sessions", async (req, res) => {
    try {
        const { section, subject, date, durationMinutes } = req.body;
        const result = await QRSession.createSession({ section, subject, date, durationMinutes });

        // Build the student-facing URL that the QR code will point to
        const host = req.headers.origin || `http://localhost:3000`;
        const studentUrl = `${host}/student.html?sessionId=${result.sessionId}`;

        res.json({
            success: true,
            sessionId: result.sessionId,
            studentUrl,          // ← admin encodes this as QR code
            meta: result.meta
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/sessions/:sessionId
 * Returns session meta (status, section, subject, date, expiry etc.)
 */
app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
        const meta = await QRSession.getSession(req.params.sessionId);
        if (!meta) return res.status(404).json({ success: false, error: "Session not found" });
        res.json({ success: true, meta });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/sessions/:sessionId/attend
 * Student scans QR → submits roll number → attendance marked
 * Body: { roll, name, deviceId }
 */
app.post("/api/sessions/:sessionId/attend", async (req, res) => {
    try {
        const { roll, name, deviceId } = req.body;
        const result = await QRSession.markAttendance({
            sessionId: req.params.sessionId,
            roll,
            name,
            deviceId
        });
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/sessions/:sessionId/end
 * Admin ends the session
 */
app.post("/api/sessions/:sessionId/end", async (req, res) => {
    try {
        const result = await QRSession.endSession(req.params.sessionId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/sessions/:sessionId/attendance
 * Returns all attendance records for a session
 */
app.get("/api/sessions/:sessionId/attendance", async (req, res) => {
    try {
        const data = await QRSession.getAttendance(req.params.sessionId);
        res.json({ success: true, count: Object.keys(data).length, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/sessions?section=A&date=2026-04-12
 * Returns all sessions for a given section + date
 */
app.get("/api/sessions", async (req, res) => {
    try {
        const { section, date } = req.query;
        if (!section || !date) return res.status(400).json({ error: "section and date required" });
        const data = await QRSession.getSessionsByDate({ section, date });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── Static Pages ──────────────────────────────────────────────────────────────

app.get("/mobile", (req, res) => {
    res.sendFile(__dirname + "/public/mobile.html");
});

app.get("/student", (req, res) => {
    res.sendFile(__dirname + "/public/student.html");
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Attendify server running on port ${PORT}`));