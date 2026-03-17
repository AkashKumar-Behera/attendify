
/* ================= HEATMAP ================= */

const days=["Mon","Tue","Wed","Thu","Fri","Sat"];
const columns=12;
const heatmap=document.getElementById("heatmap");

days.forEach(day=>{

let row=document.createElement("div");
row.className="row";

let label=document.createElement("div");
label.className="row-label";
label.innerText=day;

row.appendChild(label);

for(let i=0;i<columns;i++){

let cell=document.createElement("div");
cell.classList.add("cell","level0");

cell.addEventListener("click",()=>{

let level=0;

for(let i=0;i<=3;i++){
if(cell.classList.contains("level"+i)) level=i;
}

cell.classList.remove("level"+level);
level=(level+1)%4;
cell.classList.add("level"+level);

});

row.appendChild(cell);

}

heatmap.appendChild(row);

});


/* ================= NAVBAR HIGHLIGHT ================= */

const navItems=document.querySelectorAll(".nav-item");
const highlight=document.getElementById("highlight");

function moveHighlight(el){
highlight.style.width=el.offsetWidth+"px";
highlight.style.left=el.offsetLeft+"px";
}

navItems.forEach(item=>{
item.addEventListener("click",()=>{
navItems.forEach(i=>i.classList.remove("active"));
item.classList.add("active");
moveHighlight(item);
});
});

window.onload=()=>{
moveHighlight(document.querySelector(".nav-item.active"));
};

/* Re-run highlight on resize so position stays accurate */
window.addEventListener("resize",()=>{
const active=document.querySelector(".nav-item.active");
if(active) moveHighlight(active);
});


/* ================= TABS ================= */

const tabs=document.querySelectorAll(".tab");

tabs.forEach(tab=>{
tab.addEventListener("click",()=>{
tabs.forEach(t=>t.classList.remove("active"));
tab.classList.add("active");
});
});


/* ================= PROFILE IMAGE ================= */

const profileInput=document.getElementById("profileInput");
const profileImage=document.getElementById("profileImage");

profileInput.addEventListener("change",function(){

const file=this.files[0];

if(file){

const reader=new FileReader();

reader.onload=function(e){
profileImage.src=e.target.result;
};

reader.readAsDataURL(file);

}

});


/* ================= TIMETABLE SYSTEM ================= */

const timetableData={

Monday:[
["09:00","Data Structures","Sambhu Prasad"],
["10:00","Web Development Lab","Ipsita Hota"],
["12:00","Operating Systems","Jagdish Mishra"],
["14:00","Cloud Computing","Amardeep Das"]
],

Tuesday:[
["09:00","JAVA","Jagdish Mishra"],
["10:00","Python","Kshyama"],
["12:00","Computer Networks","Jagdish Mishra"],
["14:00","DSA Lab","Sambhu Prasad"]
],

Wednesday:[
["09:00","Operating Systems","Jagdish Mishra"],
["10:00","Cloud Computing","Amardeep Das"],
["12:00","Python","Kshyama"],
["14:00","IOT Lab","Ipsita Hota"]
],

Thursday:[
["09:00","Data Structures","Sambhu Prasad"],
["10:00","Web Dev","Ipsita Hota"],
["12:00","Cloud Computing","Amardeep Das"],
["14:00","Operating Systems","Jagdish Mishra"]
],

Friday:[
["09:00","Python","Kshyama"],
["10:00","IOT Lab","Ipsita Hota"],
["12:00","DSA","Sambhu Prasad"],
["14:00","Computer Networks","Jagdish Mishra"]
],

Saturday:[
["09:00","JAVA","Jagdish Mishra"],
["10:00","Web Development Lab","Ipsita Hota"],
["12:00","Operating Systems","Jagdish Mishra"],
["14:00","Cloud Computing","Amardeep Das"]
]

};


const dayButtons=document.querySelectorAll(".week .day");
const timetableContainer=document.querySelector(".timetable");


function renderSchedule(day){

const rows=timetableData[day];

const oldRows=timetableContainer.querySelectorAll(".schedule-row");
oldRows.forEach(r=>r.remove());

rows.forEach(item=>{

let row=document.createElement("div");
row.className="schedule-row";

row.innerHTML=`
<div class="time">${item[0]}</div>
<div class="subject">${item[1]}</div>
<div class="room">${item[2]}</div>
`;

timetableContainer.appendChild(row);

});

}


dayButtons.forEach(btn=>{

btn.addEventListener("click",()=>{

dayButtons.forEach(d=>d.classList.remove("active"));
btn.classList.add("active");

renderSchedule(btn.innerText);

});

});


/* default load */

renderSchedule("Monday");
dayButtons[0].classList.add("active");