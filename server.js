const express = require("express");
const admin = require("firebase-admin");

const app = express();

admin.initializeApp({
  credential: admin.credential.cert(require("./firebase-admin.json")),
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