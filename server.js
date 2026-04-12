require("dotenv").config();

const express = require("express");
const admin = require("firebase-admin");
require("dotenv").config();

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN);

// private key fix
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.static("public"));

// .env se firebase admin load

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://attendance-model-77-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

app.get("/students/:sec", async (req, res) => {

    const sec = req.params.sec;

    const snap = await db.ref("students")
        .orderByChild("sec")
        .equalTo(sec)
        .once("value");

    const data = snap.val() || {};

    res.json(data);

});

app.get("/mobile", (req, res) => {
    res.sendFile(__dirname + "/public/mobile.html");
});

// Calculate Student Dashboard Analytics
app.get("/api/student/:section/:roll", async (req, res) => {
    try {
        const { section, roll } = req.params;
        
        const sessionsSnap = await db.ref("sessions").once("value");
        const sessions = sessionsSnap.val() || {};
        
        let totalSessions = 0;
        let presentCount = 0;
        let absentCount = 0;

        for (const [sessionId, sessionData] of Object.entries(sessions)) {
            if (sessionData.meta && sessionData.meta.section === section) {
                totalSessions++;
                
                const attendanceSnap = await db.ref(`attendance/${sessionId}/${roll}`).once("value");
                if (attendanceSnap.exists()) {
                    const record = attendanceSnap.val();
                    if (record.status === "present") {
                        presentCount++;
                    } else if (record.status === "absent") {
                        absentCount++;
                    }
                } else {
                    // Usually consider absent if no record but session occurred
                    absentCount++;
                }
            }
        }
        
        const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
        
        // Try getting name from "Section X"
        const sectionSnap = await db.ref(`Section ${section}`).once("value");
        const sectionData = sectionSnap.val() || {};
        const name = sectionData[roll] || `Student ${roll}`;

        res.json({
            roll,
            name,
            totalSessions,
            presentCount,
            absentCount,
            percentage
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Calculate Leaderboard
app.get("/api/leaderboard/:section", async (req, res) => {
    try {
        const { section } = req.params;
        
        const sessionsSnap = await db.ref("sessions").once("value");
        const sessions = sessionsSnap.val() || {};
        
        const sectionSnap = await db.ref(`Section ${section}`).once("value");
        const sectionData = sectionSnap.val() || {};
        
        const stats = {};
        
        // Initialize stats for known students in the section
        for (const [roll, name] of Object.entries(sectionData)) {
            stats[roll] = { roll, name, present: 0, total: 0 };
        }
        
        for (const [sessionId, sessionData] of Object.entries(sessions)) {
            if (sessionData.meta && sessionData.meta.section === section) {
                const attendanceSnap = await db.ref(`attendance/${sessionId}`).once("value");
                const attendance = attendanceSnap.val() || {};
                
                // Increase total for all known students in this section
                for (const roll of Object.keys(stats)) {
                    stats[roll].total++;
                }
                
                // Count presence
                for (const [roll, record] of Object.entries(attendance)) {
                    if (!stats[roll]) {
                        stats[roll] = { roll, name: `Student ${roll}`, present: 0, total: 1 };
                    }
                    if (record.status === "present") {
                        stats[roll].present++;
                    }
                }
            }
        }
        
        let leaderboard = Object.values(stats).map(st => {
            return {
                ...st,
                percentage: st.total > 0 ? Math.round((st.present / st.total) * 100) : 0
            };
        });
        
        leaderboard.sort((a, b) => b.percentage - a.percentage);
        
        res.json(leaderboard);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(3000, () => console.log("Server running"));