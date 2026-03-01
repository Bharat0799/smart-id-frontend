const BASE_URL = "https://smart-id-management-backend.onrender.com";

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("applyForm");
    if (!form) return;

    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const token = localStorage.getItem("token") || "";
        if (!token) {
            alert("Session expired. Please login again.");
            window.location.href = "login.html";
            return;
        }

        const fullName = document.getElementById("fullName").value.trim();
        const idNumber = document.getElementById("idNumber").value.trim().toLowerCase();
        const date = document.getElementById("date").value;
        const mobile = document.getElementById("mobile").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const department = document.getElementById("department").value.trim();
        const reason = document.getElementById("reason").value.trim();
        const transactionId = document.getElementById("transactionId").value.trim();
        const proofInput = document.getElementById("proofFile");

        if (!isValidIdNumber(idNumber)) {
            alert("ID number must be at least 3 characters.");
            return;
        }
        if (!isValidMobile(mobile)) {
            alert("Mobile number must be exactly 10 digits.");
            return;
        }
        if (!isValidEmail(email)) {
            alert("Enter a valid email address.");
            return;
        }
        if (!proofInput || !proofInput.files || !proofInput.files.length) {
            alert("Proof upload is mandatory.");
            return;
        }
        if (!transactionId) {
            alert("Please complete payment and enter Transaction ID.");
            return;
        }

        const selectedProof = proofInput.files[0];
        const formData = new FormData();
        formData.append("name", fullName);
        formData.append("idNumber", idNumber);
        formData.append("mobile", normalizeMobile(mobile));
        formData.append("email", email);
        formData.append("department", department);
        formData.append("reason", reason);
        formData.append("transactionId", transactionId);
        formData.append("paymentStatus", "Paid");
        formData.append("proofFile", selectedProof);

        try {
            const response = await fetch(`${BASE_URL}/api/applications`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                alert(data.message || "Server error. Please try again.");
                return;
            }

            alert(data.message || "Application submitted successfully");
            window.location.href = "student_dashboard.html";
        } catch (error) {
            alert("Failed to fetch");
        }
    });
});

// Basic ID validation: required and minimum length 3.
function isValidIdNumber(value) {
    const id = String(value || "").trim();
    return id.length >= 3;
}

function normalizeMobile(value) {
    return value.replace(/\D/g, "");
}

function isValidMobile(value) {
    return normalizeMobile(value).length === 10;
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
