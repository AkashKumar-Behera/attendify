require("dotenv").config();

const express = require("express");
const admin = require("firebase-admin");

const app = express();

// .env se firebase admin load
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN);

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

app.listen(3000, () => console.log("Server running"));