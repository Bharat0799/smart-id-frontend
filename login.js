document.addEventListener("DOMContentLoaded", function () {
    const BASE_URL = "https://smart-id-management-backend.onrender.com";
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.querySelector(".signup-form form");

    if (!loginForm || !signupForm) return;

    async function parseResponse(response) {
        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        if (!contentType.includes("application/json")) {
            return { message: response.ok ? "Unexpected server response" : "Server error. Please try again." };
        }

        try {
            const data = await response.json();
            return data && typeof data === "object" ? data : {};
        } catch {
            return { message: response.ok ? "Unexpected server response" : "Server error. Please try again." };
        }
    }

    // ================= LOGIN =================
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const idInput = document.getElementById("loginIdNumber");
        const passwordInput = document.getElementById("loginPassword");
        const id = String(idInput?.value || "").trim().toLowerCase();
        const password = String(passwordInput?.value || "");

        if (!id || !password) {
            alert("Please enter ID number and password.");
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idNumber: id, password: password })
            });

            const data = await parseResponse(response);

            if (!response.ok) {
                alert(data.message || "Invalid ID or Password");
                return;
            }

            localStorage.setItem("loggedIn", "true");
            localStorage.setItem("role", "student");
            localStorage.setItem("token", data.token || "");
            localStorage.setItem("studentName", data.user?.name || "");
            localStorage.setItem("studentId", data.user?.idNumber || id);
            localStorage.setItem("studentEmail", data.user?.email || `${(data.user?.idNumber || id).toLowerCase()}@student.local`);

            window.location.href = "student_dashboard.html";
        } catch (error) {
            alert("Unable to connect to server. Please try again.");
        }
    });

    // ================= SIGNUP =================
    signupForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const idInput = document.getElementById("signupIdNumber");
        const nameInput = document.getElementById("signupName");
        const passwordInput = document.getElementById("signupPassword");
        const id = String(idInput?.value || "").trim().toLowerCase();
        const name = String(nameInput?.value || "").trim();
        const password = String(passwordInput?.value || "");

        if (!id || !name || !password) {
            alert("Please fill ID number, name and password.");
            return;
        }

        const payload = {
            idNumber: id,
            name: name,
            password: password,
            department: "general",
            dob: "2000-01-01"
        };

        try {
            const response = await fetch(`${BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await parseResponse(response);

            if (!response.ok) {
                alert(data.message || "Registration failed");
                return;
            }

            alert("Registration Successful! Please Login.");
            document.getElementById("flip").checked = false;
            signupForm.reset();
        } catch (error) {
            alert("Unable to connect to server. Please try again.");
        }
    });
});
