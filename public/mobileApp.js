const rows = document.querySelectorAll(".cells")

rows.forEach(row=>{

for(let i=0;i<12;i++){

const cell=document.createElement("div")
cell.classList.add("cell")

if(Math.random()>0.4){
cell.classList.add("present")
}

row.appendChild(cell)

}

})