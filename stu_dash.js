const BASE_URL = "https://smart-id-management-backend.onrender.com";
let studentRequestsCache = [];

document.addEventListener("DOMContentLoaded", function () {
    // Legacy cleanup: application data is server-backed and must not use localStorage.
    localStorage.removeItem("smartID_requests");
    localStorage.removeItem("requests");

    const NOTIFICATIONS_KEY = "smartID_notifications";
    // --- 1. USER INIT ---
    const studentName = localStorage.getItem("studentName") || "Student";
    const studentEmail = localStorage.getItem("studentEmail") || "student@example.com";
    const studentId = localStorage.getItem("studentId") || studentEmail || studentName;

    const nameEl = document.getElementById("studentName");
    const emailEl = document.getElementById("studentEmailDisplay");
    const profileNameEl = document.getElementById("profileName");

    if (nameEl) nameEl.innerText = studentName;
    if (emailEl) emailEl.innerText = studentEmail;
    if (profileNameEl) profileNameEl.innerText = studentName;

    // --- 2. TABS LOGIC ---
    window.showSection = function(sectionId, linkElement) {
        document.querySelectorAll(".content-section").forEach(sec => sec.style.display = "none");
        const target = document.getElementById("section-" + sectionId);
        if (target) {
            target.style.display = "block";
            if (sectionId === "status") loadTrackStatus();
            if (sectionId === "apply") prefillApplyIdField(studentId);
        }
        document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
        if (linkElement) linkElement.classList.add("active");
    };

    // --- 3. SIDEBAR TOGGLE ---
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.getElementById("sidebarToggle");
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
    }

    // --- 4. THEME TOGGLE ---
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = themeToggle ? themeToggle.querySelector("i") : null;
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
    updateThemeIcon(themeIcon);
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
            updateThemeIcon(themeIcon);
        });
    }

    const studentNotifBtn = document.getElementById("studentNotifBtn");
    const studentNotifPanel = document.getElementById("studentNotifPanel");
    if (studentNotifBtn && studentNotifPanel) {
        studentNotifBtn.addEventListener("click", function() {
            const isHidden = studentNotifPanel.style.display === "none";
            studentNotifPanel.style.display = isHidden ? "block" : "none";
            if (isHidden) {
                markStudentNotificationsSeen(studentId, NOTIFICATIONS_KEY);
                renderStudentNotifications(studentId, NOTIFICATIONS_KEY);
            }
        });
        document.addEventListener("click", function(e) {
            if (!studentNotifPanel.contains(e.target) && !studentNotifBtn.contains(e.target)) {
                studentNotifPanel.style.display = "none";
            }
        });
    }
    updateStudentNotificationBadge(studentId, NOTIFICATIONS_KEY);

    // --- 5. LOGOUT ---
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutBtn2 = document.getElementById("logoutBtn2");
    const handleLogout = () => {
        if (confirm("Logout?")) {
            // Keep shared data intact; remove only session identity keys.
            ["loggedIn", "role", "studentName", "studentEmail", "studentId", "token"].forEach(key => localStorage.removeItem(key));
            window.location.href = "index.html";
        }
    };
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
    if (logoutBtn2) logoutBtn2.addEventListener("click", handleLogout);

    // --- 6. APPLY FORM SUBMISSION ---
    const applyForm = document.getElementById("applyForm");
    const fileInput = document.getElementById("fileInput");
    const fileName = document.getElementById("fileName");
    const reasonSelect = document.getElementById("reason");
    const correctionSection = document.getElementById("correctionSection");
    prefillApplyIdField(studentId);

    function getCurrentCorrectionOldValues() {
        const profile = loadProfileData(studentId, studentName, studentEmail);
        const requests = getStudentRequests(studentId);
        const latest = requests.length ? requests[requests.length - 1] : null;
        const idNumberInput = document.getElementById("idNumber");
        const deptInput = document.getElementById("department");

        return {
            name: (profile && profile.name) ? String(profile.name).trim() : (studentName || ""),
            idNumber: (profile && profile.roll) ? String(profile.roll).trim() : ((idNumberInput && idNumberInput.value) ? idNumberInput.value.trim() : ""),
            department: (latest && latest.department) ? String(latest.department).trim() : ((deptInput && deptInput.value) ? deptInput.value.trim() : ""),
            address: (profile && profile.address) ? String(profile.address).trim() : "",
            phone: (profile && profile.phone) ? String(profile.phone).trim() : ""
        };
    }

    function updateSingleCorrectionFieldUI(checkbox) {
        const targetId = checkbox.getAttribute("data-target");
        const oldTargetId = checkbox.getAttribute("data-old-target");
        const label = checkbox.getAttribute("data-label") || checkbox.value;
        const key = checkbox.getAttribute("data-key");
        const targetInput = targetId ? document.getElementById(targetId) : null;
        const oldTextEl = oldTargetId ? document.getElementById(oldTargetId) : null;
        const wrap = targetInput ? targetInput.closest("div") : null;

        if (!wrap) return;

        if (!checkbox.checked) {
            wrap.style.display = "none";
            if (targetInput) targetInput.value = "";
            return;
        }

        const oldValues = getCurrentCorrectionOldValues();
        const oldValue = oldValues[key] ? oldValues[key] : "-";
        if (oldTextEl) oldTextEl.textContent = `Old ${label}: ${oldValue}`;
        wrap.style.display = "block";
    }

    function toggleCorrectionSection() {
        const show = reasonSelect && reasonSelect.value === "Correction";
        if (correctionSection) correctionSection.style.display = show ? "block" : "none";
        document.querySelectorAll(".correction-toggle").forEach(cb => {
            if (!show) {
                cb.checked = false;
                updateSingleCorrectionFieldUI(cb);
                return;
            }
            updateSingleCorrectionFieldUI(cb);
        });
    }

    if (reasonSelect) {
        reasonSelect.addEventListener("change", toggleCorrectionSection);
        toggleCorrectionSection();
    }
    document.querySelectorAll(".correction-toggle").forEach(cb => {
        cb.addEventListener("change", () => {
            updateSingleCorrectionFieldUI(cb);
        });
    });

    if (fileInput) {
        fileInput.addEventListener("change", function() {
            if (this.files && this.files[0]) fileName.innerText = "Selected: " + this.files[0].name;
        });
    }

    function getAuthToken() {
        return localStorage.getItem("token") || "";
    }

    function normalizeIdValue(value) {
        return String(value || "").trim().toLowerCase();
    }

    async function parseJsonResponse(response) {
        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        if (!contentType.includes("application/json")) {
            const rawText = await response.text().catch(() => "");
            return {
                message: rawText.trim() || (response.ok ? "Unexpected server response" : "Server error. Please try again.")
            };
        }

        try {
            const data = await response.json();
            return data && typeof data === "object" ? data : {};
        } catch {
            return { message: response.ok ? "Unexpected server response" : "Server error. Please try again." };
        }
    }

    async function hasPendingRequestOnServer(token) {
        let response;
        try {
            response = await fetch(`${BASE_URL}/api/applications/my`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (error) {
            throw new Error("Unable to connect to server");
        }
        const data = await parseJsonResponse(response);
        if (!response.ok) {
            console.error("[APPLY PREFLIGHT ERROR] /applications/my failed", data);
            throw new Error(data.message || "Unable to check existing applications");
        }
        const apps = Array.isArray(data.applications) ? data.applications : [];
        return apps.some(app => String(app.status || "").toLowerCase() === "pending");
    }

    function mapBackendApplicationToLocal(app) {
        const mappedId = String(app.applicationId || app.requestId || app._id || "").trim();
        return {
            requestId: mappedId || ("APP-" + Math.floor(Math.random() * 10000)),
            ownerId: studentId,
            name: app.name || studentName,
            idNumber: String(app.idNumber || studentId).toUpperCase(),
            department: String(app.department || "").toUpperCase(),
            date: app.createdAt ? new Date(app.createdAt).toISOString().slice(0, 10) : "",
            mobile: app.mobile || "",
            email: app.email || studentEmail,
            reason: app.reason || "",
            correctionFields: app.correctionFields || [],
            corrections: app.corrections || {},
            proofFilePath: app.proofFilePath || "",
            transactionId: app.transactionId || "-",
            paymentStatus: app.paymentStatus || "Paid",
            status: app.status || "Pending",
            remarks: app.remarks || "",
            createdAt: app.createdAt || app.submittedAt || "",
            submittedDate: app.createdAt || app.submittedAt || "",
            reviewAt: app.reviewedAt || null,
            printingAt: app.printedAt || null,
            readyAt: app.readyAt || null,
            collectFrom: app.collectFrom || null,
            collectTo: app.collectTo || null,
            completedAt: app.completedAt || null,
            reviewDate: app.reviewedAt || null,
            printingDate: app.printedAt || null,
            readyDate: app.readyAt || null,
            completedDate: app.completedAt || null
        };
    }

    function upsertRequestsForCurrentStudent(serverMappedRequests) {
        studentRequestsCache = Array.isArray(serverMappedRequests) ? serverMappedRequests.slice() : [];
    }

    async function refreshStudentRequestsFromServer(token) {
        const response = await fetch(`${BASE_URL}/api/applications/my`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await parseJsonResponse(response);
        if (!response.ok) {
            console.error("[REQUESTS LOAD ERROR] /applications/my failed", data);
            throw new Error(data.message || "Unable to load your applications");
        }
        const apps = Array.isArray(data.applications) ? data.applications : [];
        const mapped = apps.map(mapBackendApplicationToLocal);
        upsertRequestsForCurrentStudent(mapped);
    }

    async function submitApplicationToServer(token, payload) {
        const endpoints = [`${BASE_URL}/api/applications`, `${BASE_URL}/api/applications/apply`];
        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: payload
                });
                const data = await parseJsonResponse(response);
                if (!response.ok) {
                    if (response.status === 404) {
                        lastError = new Error("Route not found");
                        continue;
                    }
                    console.error("[APPLY SUBMIT ERROR]", endpoint, data);
                    throw new Error(data.message || "Failed to submit application");
                }
                return data;
            } catch (error) {
                if (String(error.message || "").includes("Failed to fetch")) {
                    throw new Error("Unable to connect to server");
                }
                lastError = error;
            }
        }

        throw lastError || new Error("Failed to submit application");
    }

    function resetApplyFormUI() {
        if (applyForm) applyForm.reset();
        if (fileName) fileName.innerText = "No file chosen";
        toggleCorrectionSection();
        prefillApplyIdField(studentId);
    }

    if (applyForm) {
        applyForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            // Collect values once and validate before writing.
            const fullName = document.getElementById("fullName").value.trim();
            const idNumber = document.getElementById("idNumber").value.trim().toLowerCase();
            const department = document.getElementById("department").value;
            const date = document.getElementById("date").value;
            const mobile = document.getElementById("mobile").value.trim();
            const email = document.getElementById("email").value.trim();
            const reason = document.getElementById("reason").value;
            const transactionId = document.getElementById("transactionId").value.trim();
            const selectedCorrectionCheckboxes = Array.from(document.querySelectorAll('input[name="correctionField"]:checked'));
            const correctionFields = selectedCorrectionCheckboxes
                .map(cb => String(cb.getAttribute("data-key") || "").trim())
                .filter(Boolean);
            const corrections = {};
            const invalidCorrectionFields = [];
            const oldValues = getCurrentCorrectionOldValues();
            selectedCorrectionCheckboxes.forEach(cb => {
                const key = cb.getAttribute("data-key");
                const targetId = cb.getAttribute("data-target");
                const label = cb.getAttribute("data-label") || cb.value || key;
                const targetInput = targetId ? document.getElementById(targetId) : null;
                if (!key || !targetInput) {
                    invalidCorrectionFields.push(String(label));
                    return;
                }
                const newValue = String(targetInput.value || "").trim();
                const oldValue = String(oldValues[key] || "").trim();
                const isSameAsOld = newValue.toLowerCase() === oldValue.toLowerCase();
                if (!newValue || isSameAsOld) {
                    invalidCorrectionFields.push(String(label));
                    return;
                }
                corrections[key] = {
                    old: oldValue || "-",
                    new: newValue
                };
            });

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

            if (!fileInput || !fileInput.files || !fileInput.files.length) {
                alert("Proof upload is mandatory.");
                return;
            }
            const selectedProof = fileInput.files[0];

            if (!transactionId) {
                alert("Please complete payment and enter Transaction ID.");
                return;
            }

            if (reason === "Correction" && correctionFields.length === 0) {
                alert("Please select at least one field to correct.");
                return;
            }
            if (reason === "Correction" && invalidCorrectionFields.length > 0) {
                alert("Please provide valid new values for all selected correction fields.");
                return;
            }

            const token = getAuthToken();
            if (!token) {
                alert("Session expired. Please login again.");
                window.location.href = "login.html";
                return;
            }

            const formData = new FormData();
            formData.append("name", fullName);
            formData.append("idNumber", idNumber);
            formData.append("department", department);
            formData.append("email", email);
            formData.append("mobile", normalizeMobile(mobile));
            formData.append("reason", reason);
            formData.append("transactionId", transactionId);
            formData.append("paymentStatus", "Paid");
            formData.append("proofFile", selectedProof);
            if (reason === "Correction") {
                formData.append("correctionFields", JSON.stringify(correctionFields));
                formData.append("corrections", JSON.stringify(corrections));
            }

            try {
                await submitApplicationToServer(token, formData);
                await refreshStudentRequestsFromServer(token);
            } catch (error) {
                alert(error.message || "Application submission failed.");
                return;
            }
            createNotification(NOTIFICATIONS_KEY, {
                targetRole: "admin",
                targetUserId: "",
                message: `New request submitted by ${fullName}.`,
                createdAt: new Date().toISOString(),
                read: false
            });

            alert("Application Submitted! Admin will receive it.");
            resetApplyFormUI();

            showSection("status", document.querySelectorAll(".nav-link")[2]);
            loadTable();
            loadTrackStatus();
        });
    }

    // --- 7. LOAD HOME TABLE ---
    function loadTable() {
        const tbody = document.getElementById("studentTableBody");
        if (!tbody) return;

        const requests = getStudentRequests(studentId);
        tbody.innerHTML = "";

        if (requests.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' align='center'>No Applications</td></tr>";
            return;
        }

        requests.forEach(req => {
            const color = req.status === "Approved" ? "approved"
                : (req.status === "Completed" ? "completed"
                : (req.status === "Rejected" ? "rejected" : "pending"));
            tbody.innerHTML += `<tr><td><strong>#${req.requestId}</strong></td><td>${req.department || "-"}</td><td>${req.date || "-"}</td><td><span class="status ${color}">${req.status || "Pending"}</span></td></tr>`;
        });
    }

    // --- 8. LOAD TRACK STATUS ---
    function loadTrackStatus() {
        const container = document.getElementById("trackingContainer");
        if (!container) return;

        const requests = getStudentRequests(studentId);
        container.innerHTML = "";

        if (requests.length === 0) {
            container.innerHTML = `<div class="no-data-box"><i class="fas fa-search"></i><p>No active applications found.</p></div>`;
            return;
        }

        const latestApp = requests[requests.length - 1];
        const status = String(latestApp.status || "Pending").toLowerCase();

        let s1 = "completed", s2 = "", s3 = "", s4 = "", s5 = "";
        if (status === "pending") s2 = "active";
        if (status === "approved") { s2 = "completed"; s3 = "active"; }
        if (status === "printing") { s2 = "completed"; s3 = "completed"; s4 = "active"; }
        if (status === "ready") { s2 = "completed"; s3 = "completed"; s4 = "completed"; }
        if (status === "completed") { s2 = "completed"; s3 = "completed"; s4 = "completed"; s5 = "completed"; }
        if (status === "rejected") { s2 = "rejected"; s3 = ""; s4 = ""; s5 = ""; }

        // Render stage dates with backend timestamp priority.
        const submittedText = formatTimelineDate(latestApp.createdAt || latestApp.submittedDate);
        const reviewText = (status === "approved" || status === "printing" || status === "ready" || status === "completed")
            ? `Approved: ${formatTimelineDate(latestApp.reviewAt || latestApp.reviewDate)}`
            : (status === "rejected"
                ? `Rejected: ${formatTimelineDate(latestApp.reviewAt || latestApp.reviewDate)}`
                : "Pending");
        const printingText = (status === "printing" || status === "ready" || status === "completed")
            ? `Printing: ${formatTimelineDate(latestApp.printingAt || latestApp.printingDate)}`
            : "Pending";
        const readyText = (status === "ready" || status === "completed")
            ? `Ready: ${formatTimelineDate(latestApp.readyAt || latestApp.readyDate)}<br>Collect Between: ${formatDateDDMMYYYY(latestApp.collectFrom)} - ${formatDateDDMMYYYY(latestApp.collectTo)}`
            : "Pending";
        const completedText = status === "completed"
            ? `Completed: ${formatTimelineDate(latestApp.completedAt || latestApp.completedDate)}`
            : "Pending";

        container.innerHTML = `
            <div class="track-card">
                <div class="track-header">
                    <span class="track-id">Application #${latestApp.requestId}</span>
                    <span class="status ${(latestApp.status || "Pending").toLowerCase()}">${latestApp.status || "Pending"}</span>
                </div>
                <div class="timeline">
                    <div class="timeline-item ${s1}">
                        <div class="t-circle"><i class="fas fa-file-alt"></i></div>
                        <div class="t-content"><h4>Submitted</h4><p>${submittedText}</p></div>
                    </div>
                    <div class="timeline-item ${s2}">
                        <div class="t-circle"><i class="fas fa-user-tie"></i></div>
                        <div class="t-content"><h4>Review</h4><p>${reviewText}</p></div>
                    </div>
                    <div class="timeline-item ${s3}">
                        <div class="t-circle"><i class="fas fa-print"></i></div>
                        <div class="t-content"><h4>Printing</h4><p>${printingText}</p></div>
                    </div>
                    <div class="timeline-item ${s4}">
                        <div class="t-circle"><i class="fas fa-check-circle"></i></div>
                        <div class="t-content"><h4>Ready</h4><p>${readyText}</p></div>
                    </div>
                    <div class="timeline-item ${s5}">
                        <div class="t-circle"><i class="fas fa-flag-checkered"></i></div>
                        <div class="t-content"><h4>Completed</h4><p>${completedText}</p></div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- 9. PROFILE SECTION (Photo + Edit/Save/Cancel) ---
    const profileState = {
        isEditing: false,
        snapshot: null,
        data: null
    };

    const profileImageInput = document.getElementById("profileImageInput");
    const profileMainImg = document.querySelector(".profile-main-img");
    const cameraBtn = document.querySelector(".edit-icon");
    const topAvatar = document.querySelector(".avatar");
    const digitalPhoto = document.querySelector(".student-photo");
    const editProfileBtn = document.getElementById("editProfileBtn");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const cancelProfileBtn = document.getElementById("cancelProfileBtn");
    const profileWrapper = document.querySelector(".profile-wrapper");

    const profileFormFields = {
        name: document.getElementById("pName"),
        email: document.getElementById("pEmail"),
        phone: document.getElementById("pPhone"),
        roll: document.getElementById("pRoll"),
        department: document.getElementById("pDepartment"),
        dob: document.getElementById("pDob"),
        address: document.getElementById("pAddress")
    };

    const editableFields = [
        profileFormFields.name,
        profileFormFields.roll,
        profileFormFields.department,
        profileFormFields.email,
        profileFormFields.phone,
        profileFormFields.dob,
        profileFormFields.address
    ].filter(Boolean);

    const savedProfile = loadProfileData(studentId, studentName, studentEmail);
    profileState.data = savedProfile;
    applyProfileData(savedProfile, {
        profileFormFields,
        profileMainImg,
        topAvatar,
        digitalPhoto,
        nameEl,
        profileNameEl
    });

    if (profileMainImg && profileImageInput) {
        profileMainImg.addEventListener("click", () => profileImageInput.click());
    }
    if (cameraBtn && profileImageInput) {
        cameraBtn.addEventListener("click", (e) => {
            e.preventDefault();
            profileImageInput.click();
        });
    }
    if (profileImageInput) {
        profileImageInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file.");
                profileImageInput.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onload = function(ev) {
                const base64Image = String(ev.target.result || "");
                if (!base64Image) return;
                profileState.data.photo = base64Image;
                saveProfileData(studentId, profileState.data);
                applyProfilePhoto(base64Image, profileMainImg, topAvatar, digitalPhoto);
                showProfileToast("Profile photo updated");
            };
            reader.readAsDataURL(file);
        });
    }

    if (editProfileBtn) {
        editProfileBtn.addEventListener("click", () => {
            profileState.isEditing = true;
            profileState.snapshot = readEditableValues(profileFormFields);
            setEditMode(true, editableFields, editProfileBtn, saveProfileBtn, cancelProfileBtn, profileWrapper);
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", async () => {
            const token = getAuthToken();
            if (!token) {
                alert("Session expired. Please login again.");
                window.location.href = "login.html";
                return;
            }

            const payload = {
                name: (profileFormFields.name && profileFormFields.name.value.trim()) || "",
                idNumber: (profileFormFields.roll && profileFormFields.roll.value.trim()) || "",
                department: (profileFormFields.department && profileFormFields.department.value.trim()) || "",
                mobile: (profileFormFields.phone && normalizeMobile(profileFormFields.phone.value.trim())) || "",
                email: (profileFormFields.email && profileFormFields.email.value.trim().toLowerCase()) || "",
                dob: (profileFormFields.dob && profileFormFields.dob.value) || ""
            };

            if (!payload.name || !payload.idNumber || !payload.department || !payload.mobile || !payload.email || !payload.dob) {
                alert("Please fill all profile fields.");
                return;
            }
            if (!isValidIdNumber(payload.idNumber)) {
                alert("ID number must be at least 3 characters.");
                return;
            }
            if (!isValidMobile(payload.mobile)) {
                alert("Mobile number must be exactly 10 digits.");
                return;
            }
            if (!isValidEmail(payload.email)) {
                alert("Enter a valid email address.");
                return;
            }

            try {
                const updated = await saveProfileToServer(token, payload);
                profileState.data.name = updated.name;
                profileState.data.roll = updated.idNumber;
                profileState.data.department = (updated.department || "").toUpperCase();
                profileState.data.email = updated.email;
                profileState.data.phone = updated.mobile;
                profileState.data.dob = updated.dob;
                profileState.data.address = (profileFormFields.address && profileFormFields.address.value.trim()) || "";

                saveProfileData(studentId, profileState.data);
                saveProfileData(updated.idNumber || studentId, profileState.data);
                localStorage.setItem("studentName", updated.name || "");
                localStorage.setItem("studentId", updated.idNumber || "");
                localStorage.setItem("studentEmail", updated.email || "");

                if (updated.token) {
                    localStorage.setItem("token", updated.token);
                }

                applyProfileData(profileState.data, {
                    profileFormFields,
                    profileMainImg,
                    topAvatar,
                    digitalPhoto,
                    nameEl,
                    profileNameEl
                });

                profileState.isEditing = false;
                setEditMode(false, editableFields, editProfileBtn, saveProfileBtn, cancelProfileBtn, profileWrapper);
                showProfileToast("Profile updated successfully");
            } catch (error) {
                alert(error.message || "Failed to update profile.");
            }
        });
    }

    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener("click", () => {
            if (profileState.snapshot) {
                restoreEditableValues(profileFormFields, profileState.snapshot);
            }
            profileState.isEditing = false;
            setEditMode(false, editableFields, editProfileBtn, saveProfileBtn, cancelProfileBtn, profileWrapper);
        });
    }

    // --- 10. POPULATE USER DATA ---
    function populateUserData() {
        if (document.getElementById("cardName")) document.getElementById("cardName").innerText = profileState.data.name || studentName;
        if (document.getElementById("profileNameMain")) document.getElementById("profileNameMain").innerText = profileState.data.name || studentName;
        if (document.getElementById("pName")) document.getElementById("pName").value = profileState.data.name || studentName;
        if (document.getElementById("pEmail")) document.getElementById("pEmail").value = profileState.data.email || studentEmail;
    }

    const token = getAuthToken();
    if (token) {
        Promise.all([
            refreshStudentRequestsFromServer(token).catch(() => {}),
            fetchProfileFromServer(token)
                .then((serverProfile) => {
                    profileState.data = {
                        ...profileState.data,
                        ...serverProfile
                    };
                    saveProfileData(studentId, profileState.data);
                    applyProfileData(profileState.data, {
                        profileFormFields,
                        profileMainImg,
                        topAvatar,
                        digitalPhoto,
                        nameEl,
                        profileNameEl
                    });
                })
                .catch(() => {})
        ]).finally(() => {
            loadTable();
            loadTrackStatus();
        });
    } else {
        loadTable();
        loadTrackStatus();
    }
    populateUserData();
});

// Strictly scope requests to current user.
function getStudentRequests(ownerId) {
    const all = Array.isArray(studentRequestsCache) ? studentRequestsCache : [];
    const normalizedOwner = String(ownerId || "").trim().toLowerCase();
    return all
        .filter(req => {
            const reqOwner = String(req.ownerId || "").trim().toLowerCase();
            const reqIdNumber = String(req.idNumber || "").trim().toLowerCase();
            return reqOwner === normalizedOwner || reqIdNumber === normalizedOwner;
        })
        .sort((a, b) => {
            const aTime = new Date(a.submittedDate || a.createdAt || 0).getTime();
            const bTime = new Date(b.submittedDate || b.createdAt || 0).getTime();
            return aTime - bTime;
        });
}

function hasPendingRequest(requests, ownerId) {
    const normalizedOwner = String(ownerId || "").trim().toLowerCase();
    return requests.some(req => {
        const reqOwner = String(req.ownerId || "").trim().toLowerCase();
        const reqIdNumber = String(req.idNumber || "").trim().toLowerCase();
        const isOwnerMatch = reqOwner === normalizedOwner || reqIdNumber === normalizedOwner;
        return isOwnerMatch && String(req.status || "").toLowerCase() === "pending";
    });
}

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

function updateThemeIcon(themeIcon) {
    if (!themeIcon) return;
    if (document.body.classList.contains("dark-mode")) {
        themeIcon.className = "fas fa-sun";
        return;
    }
    themeIcon.className = "fas fa-moon";
}

function getProfileStorageKey(studentId) {
    return `smartID_profile_${studentId}`;
}

function loadProfileData(studentId, fallbackName, fallbackEmail) {
    const fromStorage = JSON.parse(localStorage.getItem(getProfileStorageKey(studentId)) || "null");
    if (fromStorage) return fromStorage;
    return {
        name: fallbackName || "Student",
        email: fallbackEmail || "student@example.com",
        phone: "9876543210",
        roll: studentId || "21CSE105",
        department: "CSE",
        dob: "2003-05-12",
        address: "123, Tech Street, Vijayawada",
        photo: ""
    };
}

function saveProfileData(studentId, profileData) {
    localStorage.setItem(getProfileStorageKey(studentId), JSON.stringify(profileData));
}

async function fetchProfileFromServer(token) {
    const response = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Failed to load profile");
    }
    const user = data.user || {};
    return {
        name: user.name || "",
        roll: user.idNumber || "",
        department: String(user.department || "").toUpperCase(),
        email: user.email || "",
        phone: user.mobile || "",
        dob: user.dob || ""
    };
}

async function saveProfileToServer(token, payload) {
    const response = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
    }
    return {
        ...(data.user || {}),
        token: data.token || ""
    };
}

function applyProfilePhoto(photo, profileMainImg, topAvatar, digitalPhoto) {
    if (!photo) return;
    if (profileMainImg) profileMainImg.src = photo;
    if (topAvatar) topAvatar.src = photo;
    if (digitalPhoto) digitalPhoto.src = photo;
}

function applyProfileData(profileData, refs) {
    if (refs.profileFormFields.name) refs.profileFormFields.name.value = profileData.name || "";
    if (refs.profileFormFields.email) refs.profileFormFields.email.value = profileData.email || "";
    if (refs.profileFormFields.phone) refs.profileFormFields.phone.value = profileData.phone || "";
    if (refs.profileFormFields.roll) refs.profileFormFields.roll.value = profileData.roll || "";
    if (refs.profileFormFields.department) refs.profileFormFields.department.value = profileData.department || "";
    if (refs.profileFormFields.dob) refs.profileFormFields.dob.value = profileData.dob || "";
    if (refs.profileFormFields.address) refs.profileFormFields.address.value = profileData.address || "";

    if (document.getElementById("profileNameMain")) document.getElementById("profileNameMain").innerText = profileData.name || "Student";
    if (document.getElementById("cardName")) document.getElementById("cardName").innerText = profileData.name || "Student";
    if (document.getElementById("studentEmailDisplay")) document.getElementById("studentEmailDisplay").innerText = profileData.email || "";
    if (refs.nameEl) refs.nameEl.innerText = profileData.name || "Student";
    if (refs.profileNameEl) refs.profileNameEl.innerText = profileData.name || "Student";

    if (profileData.photo) {
        applyProfilePhoto(profileData.photo, refs.profileMainImg, refs.topAvatar, refs.digitalPhoto);
    }
}

function setEditMode(isEditing, editableFields, editBtn, saveBtn, cancelBtn, wrapper) {
    editableFields.forEach(field => {
        field.disabled = !isEditing;
    });
    if (editBtn) editBtn.style.display = isEditing ? "none" : "inline-flex";
    if (saveBtn) saveBtn.style.display = isEditing ? "inline-flex" : "none";
    if (cancelBtn) cancelBtn.style.display = isEditing ? "inline-flex" : "none";
    if (wrapper) wrapper.classList.toggle("editing", isEditing);
}

function readEditableValues(profileFormFields) {
    return {
        name: profileFormFields.name ? profileFormFields.name.value : "",
        roll: profileFormFields.roll ? profileFormFields.roll.value : "",
        department: profileFormFields.department ? profileFormFields.department.value : "",
        email: profileFormFields.email ? profileFormFields.email.value : "",
        phone: profileFormFields.phone ? profileFormFields.phone.value : "",
        dob: profileFormFields.dob ? profileFormFields.dob.value : "",
        address: profileFormFields.address ? profileFormFields.address.value : ""
    };
}

function restoreEditableValues(profileFormFields, snapshot) {
    if (profileFormFields.name) profileFormFields.name.value = snapshot.name || "";
    if (profileFormFields.roll) profileFormFields.roll.value = snapshot.roll || "";
    if (profileFormFields.department) profileFormFields.department.value = snapshot.department || "";
    if (profileFormFields.email) profileFormFields.email.value = snapshot.email || "";
    if (profileFormFields.phone) profileFormFields.phone.value = snapshot.phone || "";
    if (profileFormFields.dob) profileFormFields.dob.value = snapshot.dob || "";
    if (profileFormFields.address) profileFormFields.address.value = snapshot.address || "";
}

function showProfileToast(message) {
    const toast = document.getElementById("profileToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
}


function updateStudentNotificationBadge(studentId, key) {
    const badge = document.getElementById("studentNotifBadge");
    if (!badge) return;
    const notifications = getNotifications(key);
    const unreadCount = notifications.filter(n => n.targetRole === "student" && n.targetUserId === studentId && !n.read).length;
    badge.innerText = String(unreadCount);
    badge.style.display = unreadCount > 0 ? "inline-flex" : "none";
}

function markStudentNotificationsSeen(studentId, key) {
    const notifications = getNotifications(key);
    notifications.forEach(n => {
        if (n.targetRole === "student" && n.targetUserId === studentId) n.read = true;
    });
    saveNotifications(key, notifications);
    updateStudentNotificationBadge(studentId, key);
}

function renderStudentNotifications(studentId, key) {
    const list = document.getElementById("studentNotifList");
    if (!list) return;
    const notifications = getNotifications(key)
        .filter(n => n.targetRole === "student" && n.targetUserId === studentId)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    list.innerHTML = "";
    if (!notifications.length) {
        list.innerHTML = "<div class='notif-item'>No notifications</div>";
        return;
    }
    notifications.slice(0, 20).forEach(n => {
        list.innerHTML += `<div class="notif-item">${escapeHtmlText(n.message || "Update")}<small>${formatDateTimeText(n.createdAt)}</small></div>`;
    });
}

function createNotification(key, notification) {
    const notifications = getNotifications(key);
    notifications.push({
        id: "NTF-" + Math.floor(Math.random() * 1000000),
        targetRole: notification.targetRole || "admin",
        targetUserId: notification.targetUserId || "",
        message: notification.message || "New notification",
        createdAt: notification.createdAt || new Date().toISOString(),
        read: Boolean(notification.read)
    });
    saveNotifications(key, notifications);
}

function getNotifications(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
}

function saveNotifications(key, notifications) {
    localStorage.setItem(key, JSON.stringify(notifications));
}

function formatDateTimeText(value) {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString();
}

function formatTimelineDate(value) {
    if (!value) return "Pending";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function formatDateDDMMYYYY(value) {
    if (!value) return "Pending";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "Pending";
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = String(dt.getFullYear());
    return `${day}/${month}/${year}`;
}

function escapeHtmlText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function prefillApplyIdField(studentId) {
    const idNumberInput = document.getElementById("idNumber");
    if (!idNumberInput || idNumberInput.value.trim() !== "") return;

    const rollNo = getPreferredRollNo(studentId);
    if (rollNo) idNumberInput.value = rollNo;
}

function getPreferredRollNo(studentId) {
    const profileKey = getProfileStorageKey(studentId);
    const profileData = JSON.parse(localStorage.getItem(profileKey) || "null");
    const profileRoll = profileData && profileData.roll ? String(profileData.roll).trim() : "";
    const loginRoll = studentId ? String(studentId).trim() : "";

    // Fallback: try to fetch roll from registered users by current student name/email.
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const studentName = localStorage.getItem("studentName") || "";
    const studentEmail = localStorage.getItem("studentEmail") || "";
    const matchedUser = users.find(user =>
        (user.id && String(user.id).trim().toLowerCase() === loginRoll.toLowerCase()) ||
        (user.email && String(user.email).trim().toLowerCase() === studentEmail.toLowerCase()) ||
        (user.name && String(user.name).trim().toLowerCase() === studentName.toLowerCase())
    );
    const userRoll = matchedUser && matchedUser.id ? String(matchedUser.id).trim() : "";

    if (profileRoll) return profileRoll;
    if (loginRoll) return loginRoll;
    if (userRoll) return userRoll;
    return "";
}
