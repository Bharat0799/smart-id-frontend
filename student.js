function toggleProfile(){
  let drop=document.getElementById("profileDropdown");
  drop.style.display=drop.style.display==="block"?"none":"block";
}

function toggleNotifications(){
  let panel=document.getElementById("notificationPanel");
  panel.style.display=panel.style.display==="block"?"none":"block";
  loadNotifications();
}

function toggleDarkMode(){
  document.body.classList.toggle("dark");
}

function showApply(){
  document.getElementById("applySection").style.display="block";
  document.getElementById("statusSection").style.display="none";
}

function showStatus(){
  document.getElementById("statusSection").style.display="block";
  document.getElementById("applySection").style.display="none";
  loadTimeline();
}

function submitRequest(){
  let date=new Date().toLocaleString();
  localStorage.setItem("requestStatus","Pending");
  localStorage.setItem("requestDate",date);

  let notes=JSON.parse(localStorage.getItem("notifications"))||[];
  notes.push("Request submitted on "+date);
  localStorage.setItem("notifications",JSON.stringify(notes));

  alert("Request Submitted!");
  updateNotificationCount();
}

function loadTimeline(){
  let status=localStorage.getItem("requestStatus")||"No Request";
  let date=localStorage.getItem("requestDate")||"-";

  document.getElementById("timeline").innerHTML=
  `<p>Status: <strong>${status}</strong></p>
   <p>Date: ${date}</p>`;
}

function loadNotifications(){
  let notes=JSON.parse(localStorage.getItem("notifications"))||[];
  let panel=document.getElementById("notificationPanel");
  panel.innerHTML="";
  notes.forEach(n=>{
    panel.innerHTML+=`<p>${n}</p>`;
  });
}

function updateNotificationCount(){
  let notes=JSON.parse(localStorage.getItem("notifications"))||[];
  document.getElementById("notificationCount").innerText=notes.length;
}

function downloadReceipt(){
  let status=localStorage.getItem("requestStatus");
  let date=localStorage.getItem("requestDate");

  let content=`Smart ID Re-Issue Receipt
Status: ${status}
Date: ${date}`;

  let blob=new Blob([content],{type:"text/plain"});
  let link=document.createElement("a");
  link.href=URL.createObjectURL(blob);
  link.download="receipt.txt";
  link.click();
}

function logout(){
  window.location.href="login.html";
}

updateNotificationCount();