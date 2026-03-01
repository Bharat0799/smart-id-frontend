const studentBtn = document.getElementById("studentBtn");
const adminBtn = document.getElementById("adminBtn");
const loginForm = document.getElementById("loginForm");

if (studentBtn && adminBtn) {
  studentBtn.addEventListener("click", () => {
    studentBtn.classList.add("active");
    adminBtn.classList.remove("active");
  });

  adminBtn.addEventListener("click", () => {
    adminBtn.classList.add("active");
    studentBtn.classList.remove("active");
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", function(e){
    e.preventDefault();

    if (studentBtn && studentBtn.classList.contains("active")) {
      window.location.href = "student_dashboard.html";
    } else {
      window.location.href = "admin_dashboard.html";
    }
  });
}
