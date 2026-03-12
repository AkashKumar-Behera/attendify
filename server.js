const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ---------- Firebase Admin ----------
const serviceAccount = require("./firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://attendancemodelqrbyak-default-rtdb.firebaseio.com"
});

const db = admin.database();


// ---------- Helper Functions ----------

function makeSessionId() {
  return "sess-" + Date.now().toString(36);
}

function toRad(x) {
  return x * Math.PI / 180;
}

function distanceMeters(lat1, lon1, lat2, lon2) {

  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// ---------- Start Session ----------

app.post("/api/session/start", async (req, res) => {

  try {

    const { section, subject } = req.body;

    const sessionId = makeSessionId();

    await db.ref(`sessions/${sessionId}`).set({
      section,
      subject,
      startedAt: Date.now(),
      active: true
    });

    res.json({
      success: true,
      sessionId,
      qrUrl: `http://localhost:3000/?sessionId=${sessionId}`
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});


// ---------- End Session ----------

app.post("/api/session/end", async (req, res) => {

  const { sessionId } = req.body;

  await db.ref(`sessions/${sessionId}/active`).set(false);

  res.json({
    success: true
  });

});


// ---------- Mark Attendance ----------

app.post("/api/attendance/mark", async (req, res) => {

  try {

    const { sessionId, roll, lat, lon, deviceId } = req.body;

    const sessionSnap = await db.ref(`sessions/${sessionId}`).get();

    if (!sessionSnap.exists()) {
      return res.status(400).json({ error: "Invalid session" });
    }

    const session = sessionSnap.val();

    if (!session.active) {
      return res.json({ status: "session_expired" });
    }

    // ---- location check ----

    const allowedSnap = await db.ref("allowed_coords").get();

    let validLocation = false;

    if (allowedSnap.exists()) {

      const coords = Object.values(allowedSnap.val());

      coords.forEach(c => {

        const d = distanceMeters(
          lat,
          lon,
          c.lat,
          c.lon
        );

        if (d < 200) validLocation = true;

      });

    }

    if (!validLocation) {

      await db.ref(`attendance/${sessionId}/${roll}`).set({
        lat,
        lon,
        deviceId,
        status: "pending",
        ts: Date.now()
      });

      return res.json({
        status: "pending"
      });

    }

    // ---- device duplicate check ----

    const deviceSnap = await db.ref(`deviceClaims/${sessionId}/${deviceId}`).get();

    if (deviceSnap.exists()) {

      return res.json({
        status: "duplicate_device"
      });

    }

    await db.ref(`deviceClaims/${sessionId}/${deviceId}`).set({
      roll
    });

    await db.ref(`attendance/${sessionId}/${roll}`).set({
      lat,
      lon,
      deviceId,
      status: "present",
      ts: Date.now()
    });

    res.json({
      status: "present"
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});


// ---------- Get Attendance ----------

app.get("/api/attendance/:sessionId", async (req, res) => {

  const { sessionId } = req.params;

  const snap = await db.ref(`attendance/${sessionId}`).get();

  res.json(snap.val() || {});

});


// ---------- Save Allowed Location ----------

app.post("/api/location/save", async (req, res) => {

  const { lat, lon } = req.body;

  const id = "loc-" + Date.now();

  await db.ref(`allowed_coords/${id}`).set({
    lat,
    lon
  });

  res.json({
    success: true
  });

});


// ---------- Start Server ----------

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});