const grid = document.getElementById("grid");
const qrBox = document.getElementById("qrBox");

const startBtn = document.getElementById("startBtn");
const endBtn = document.getElementById("endBtn");

const sectionSelect = document.getElementById("section");
const subjectSelect = document.getElementById("subject");

let sessionId = null;


// build grid 1-60
function buildGrid(){

grid.innerHTML="";

for(let i=1;i<=60;i++){

let cell=document.createElement("div");
cell.className="cell";
cell.innerText=i;

cell.dataset.roll=i;

grid.appendChild(cell);

}

}

buildGrid();


// start session
startBtn.onclick = async ()=>{

let section = sectionSelect.value;
let subject = subjectSelect.value;

const res = await fetch("/api/session/start",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
section,
subject
})

});

const data = await res.json();

sessionId = data.sessionId;

qrBox.innerHTML="";

new QRCode(qrBox,{
text:data.qrUrl,
width:220,
height:220
});

listenAttendance();

};



// end session
endBtn.onclick = async ()=>{

if(!sessionId) return;

await fetch("/api/session/end",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
sessionId
})

});

alert("Session ended");

};




// listen attendance
function listenAttendance(){

setInterval(async ()=>{

if(!sessionId) return;

const res = await fetch(`/api/attendance/${sessionId}`);

const data = await res.json();

document.querySelectorAll(".cell").forEach(c=>{

c.classList.remove("present","pending");

});

Object.keys(data).forEach(roll=>{

let cell=document.querySelector(`[data-roll='${roll}']`);

if(!cell) return;

if(data[roll].status==="present")
cell.classList.add("present");

if(data[roll].status==="pending")
cell.classList.add("pending");

});

},2000);

}