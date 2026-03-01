let chartInstance;
let selectedDateFilter = null;
let selectedDepartment = null;
let dashboardRequestsCache = [];

const SETTINGS_KEY = "smartID_settings";
const ADMIN_LAST_SEEN_AT_KEY = "admin_last_seen_at";
const NOTIFICATIONS_KEY = "smartID_notifications";
const BASE_URL = "https://smart-id-management-backend.onrender.com";

document.addEventListener("DOMContentLoaded", function() {
    // Legacy cleanup: application data is server-backed and must not use localStorage.
    localStorage.removeItem("smartID_requests");
    localStorage.removeItem("requests");

    loadDashboard();
    loadDepartments();
    loadUsers();
    loadSettings();
    updateNotificationBadge();

    window.addEventListener("storage", function () {
        loadDashboard();
        loadDepartments();
        loadUsers();
        loadSettings();
        updateNotificationBadge();
    });

    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.getElementById("sidebarToggle");
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
    }

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

    window.showSection = function(sectionId, linkElement) {
        document.querySelectorAll(".content-section").forEach(sec => sec.style.display = "none");
        const target = document.getElementById("section-" + sectionId);
        if (target) target.style.display = "block";

        document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
        if (linkElement) linkElement.classList.add("active");

        if (sectionId === "dashboard") {
            loadDashboard();
            updateNotificationBadge();
        }
        if (sectionId === "departments") {
            backToDepartments();
            loadDepartments();
        }
        if (sectionId === "users") loadUsers();
        if (sectionId === "settings") loadSettings();
    };

    const searchInput = document.getElementById("searchInput");
    const dateFilter = document.getElementById("dateFilter");
    const statusFilter = document.getElementById("statusFilter");
    const userDeptFilter = document.getElementById("userDeptFilter");
    const settingsForm = document.getElementById("settingsForm");
    const deptBackBtn = document.getElementById("deptBackBtn");
    const adminNotifBtn = document.getElementById("adminNotifBtn");
    const adminNotifPanel = document.getElementById("adminNotifPanel");

    if (searchInput) searchInput.addEventListener("input", loadDashboard);
    if (dateFilter) {
        dateFilter.addEventListener("change", function() {
            selectedDateFilter = dateFilter.value ? String(dateFilter.value) : null;
            loadDashboard();
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener("change", loadDashboard);
    }
    if (userDeptFilter) userDeptFilter.addEventListener("change", loadUsers);
    if (settingsForm) settingsForm.addEventListener("submit", saveSettings);
    if (deptBackBtn) deptBackBtn.addEventListener("click", backToDepartments);
    if (adminNotifBtn && adminNotifPanel) {
        adminNotifBtn.addEventListener("click", function() {
            const isHidden = adminNotifPanel.style.display === "none";
            adminNotifPanel.style.display = isHidden ? "block" : "none";
            if (isHidden) {
                markNotificationsSeen();
                renderAdminNotifications();
            }
        });
        document.addEventListener("click", function(e) {
            if (!adminNotifPanel.contains(e.target) && !adminNotifBtn.contains(e.target)) {
                adminNotifPanel.style.display = "none";
            }
        });
    }
});

async function fetchAdminApplications() {
    const token = localStorage.getItem("token") || "";
    const role = localStorage.getItem("role") || "";

    if (!token || role !== "admin") {
        return null;
    }

    const statusEl = document.getElementById("statusFilter");
    const statusFilter = statusEl ? String(statusEl.value || "All") : "All";
    const params = new URLSearchParams();
    if (selectedDateFilter) {
        params.set("date", selectedDateFilter);
    }
    if (statusFilter && statusFilter !== "All") {
        params.set("status", statusFilter);
    }

    const endpoint = params.toString()
        ? `${BASE_URL}/api/admin/applications?${params.toString()}`
        : `${BASE_URL}/api/admin/applications`;

    const response = await fetch(endpoint, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Failed to load admin applications");
    }

    const applications = Array.isArray(data.applications) ? data.applications : [];
    return applications.map((app) => ({
        requestId: app.applicationId || app.requestId || app._id || "-",
        name: app.name || (app.userId && app.userId.name) || "Unknown",
        idNumber: app.idNumber || (app.userId && app.userId.idNumber) || "",
        department: app.department || (app.userId && app.userId.department) || "",
        status: app.status || "Pending",
        transactionId: app.transactionId || "-",
        paymentStatus: app.paymentStatus || "Paid",
        remarks: app.remarks || "",
        createdAt: app.createdAt || app.submittedAt || "",
        submittedDate: app.createdAt || app.submittedAt || ""
    }));
}

async function getDashboardRequests() {
    const token = localStorage.getItem("token") || "";
    const role = localStorage.getItem("role") || "";

    if (!token || role !== "admin") {
        dashboardRequestsCache = [];
        return [];
    }

    try {
        const fromApi = await fetchAdminApplications();
        if (Array.isArray(fromApi)) {
            dashboardRequestsCache = fromApi;
            return fromApi;
        }
        dashboardRequestsCache = [];
        return [];
    } catch (error) {
        console.error("[ADMIN DASHBOARD FETCH ERROR]", error.message || error);
        dashboardRequestsCache = [];
        return [];
    }
}

async function loadDashboard() {
    const requests = await getDashboardRequests();
    const searchEl = document.getElementById("searchInput");
    const filterEl = document.getElementById("statusFilter");

    const search = searchEl ? searchEl.value.toLowerCase() : "";
    const filter = filterEl ? filterEl.value : "All";

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let completed = 0;

    const tbody = document.getElementById("tableBody");
    if (tbody) tbody.innerHTML = "";

    // Stat counters are calculated from all requests.
    requests.forEach((req) => {
        if (req.status === "Pending") pending++;
        if (req.status === "Approved") approved++;
        if (req.status === "Rejected") rejected++;
        if (req.status === "Completed") completed++;
    });

    requests.forEach((req) => {

        const reqName = req.name ? req.name.toLowerCase() : "";
        const reqID = req.requestId ? req.requestId.toLowerCase() : "";
        const reqIdNumber = req.idNumber ? String(req.idNumber).toLowerCase() : "";
        const reqTxn = req.transactionId ? req.transactionId.toLowerCase() : "";
        const appliedDateText = getAppliedDateText(req);

        const matchesSearch =
            reqID.includes(search) ||
            reqName.includes(search) ||
            reqIdNumber.includes(search) ||
            reqTxn.includes(search);
        const matchesDropdownFilter = filter === "All" || req.status === filter;
        if (matchesDropdownFilter && matchesSearch && tbody) {
            const badgeClass = req.status ? req.status.toLowerCase() : "pending";
            tbody.innerHTML += `
<tr>
    <td><strong>${req.requestId || "-"}</strong></td>
    <td>${req.name || "Unknown"}</td>
    <td>${appliedDateText}</td>
    <td>
        <span class="status-badge ${badgeClass}">
            ${req.status || "Pending"}
        </span>
    </td>
    <td>${(req.transactionId ?? "").toString().trim() || "N/A"}</td>
    <td>${req.paymentStatus || "Unpaid"}</td>
    <td class="action-cell">
        <button 
            class="action-btn table-view-btn"
            onclick="openApplicationDetails('${req.requestId}')">
            View
        </button>
    </td>
</tr>
`;
        }
    });

    if (tbody && tbody.innerHTML.trim() === "") {
        const emptyText = selectedDateFilter
            ? "No applications found for selected date"
            : "No applications found";
        tbody.innerHTML = `<tr><td colspan='7' align='center'>${emptyText}</td></tr>`;
    }

    const total = requests.length;

    setText("total", total);
    setText("pending", pending);
    setText("approved", approved);
    setText("rejected", rejected);
    setText("completed", completed);

    updateChart(pending, approved, rejected, completed);
}

function getComparableDateText(req) {
    const rawDate = req.submittedDate || req.createdAt || req.date || "";
    if (!rawDate) return "";

    // Supports stored yyyy-mm-dd, locale date string, and ISO strings.
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(rawDate))) {
        const dt = new Date(String(rawDate) + "T00:00:00");
        return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString();
    }

    const dt = new Date(rawDate);
    if (!Number.isNaN(dt.getTime())) return dt.toLocaleDateString();

    // Fallback: keep existing locale-formatted values usable.
    return String(rawDate);
}

function getAppliedDateText(req) {
    const rawDate = req.submittedDate || req.createdAt || req.date || "";
    if (!rawDate) return "-";
    const dt = new Date(rawDate);
    if (!Number.isNaN(dt.getTime())) return dt.toLocaleDateString();
    return String(rawDate);
}

async function loadDepartments() {
    const requests = await getDashboardRequests();
    const deptCounts = {};

    requests.forEach(req => {
        const dept = req.department || "Unknown";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const grid = document.getElementById("deptGrid");
    if (!grid) return;

    grid.innerHTML = "";
    if (Object.keys(deptCounts).length === 0) {
        grid.innerHTML = "<p>No data.</p>";
        return;
    }

    Object.entries(deptCounts).forEach(([dept, count]) => {
        grid.innerHTML += `<div class="stat-card dept-analytics-card" onclick="openDepartmentDetails('${escapeJs(dept)}')">
            <div class="dept-head">
                <span class="dept-title">${escapeHtml(dept)}</span>
                <span class="dept-total">${count}</span>
            </div>
        </div>`;
    });
}

window.openDepartmentDetails = function(dept) {
    selectedDepartment = dept;
    const requests = dashboardRequestsCache;
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    const fallbackFee = Number(localStorage.getItem("smartID_feeAmount")) || 100;
    const feeAmount = Number(settings.reissueFee) > 0 ? Number(settings.reissueFee) : fallbackFee;

    const deptRequests = requests.filter(req => (req.department || "Unknown") === dept);
    const metrics = {
        total: deptRequests.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        ready: 0,
        completed: 0,
        paid: 0
    };

    deptRequests.forEach(req => {
        if (req.status === "Pending") metrics.pending += 1;
        if (req.status === "Approved") metrics.approved += 1;
        if (req.status === "Rejected") metrics.rejected += 1;
        if (req.status === "Ready") metrics.ready += 1;
        if (req.status === "Completed") metrics.completed += 1;
        if (String(req.paymentStatus || "").toLowerCase() === "paid") metrics.paid += 1;
    });

    const approvedPipeline = metrics.approved + metrics.ready + metrics.completed;
    const approvalPct = metrics.total ? ((approvedPipeline / metrics.total) * 100).toFixed(1) : "0.0";
    const revenue = metrics.paid * feeAmount;

    setText("deptDetailTitle", `${dept} Analytics`);
    setText("deptTotalCount", metrics.total);
    setText("deptPendingCount", metrics.pending);
    setText("deptApprovedCount", metrics.approved);
    setText("deptRejectedCount", metrics.rejected);
    setText("deptReadyCount", metrics.ready);
    setText("deptCompletedCount", metrics.completed);
    setText("deptApprovalPct", `${approvalPct}%`);
    setText("deptRevenue", `₹${revenue}`);

    const progress = document.getElementById("deptApprovalProgress");
    if (progress) progress.style.width = `${approvalPct}%`;

    const tbody = document.getElementById("deptDetailTableBody");
    if (tbody) {
        tbody.innerHTML = "";
        if (!deptRequests.length) {
            tbody.innerHTML = "<tr><td colspan='6' align='center'>No applications found for this department.</td></tr>";
        } else {
            deptRequests.forEach(req => {
                const badgeClass = req.status ? req.status.toLowerCase() : "pending";
                tbody.innerHTML += `
<tr>
    <td><strong>${req.requestId || "-"}</strong></td>
    <td>${req.name || "Unknown"}</td>
    <td>${getAppliedDateText(req)}</td>
    <td><span class="status-badge ${badgeClass}">${req.status || "Pending"}</span></td>
    <td>${req.paymentStatus || "Unpaid"}</td>
    <td>${req.transactionId || "-"}</td>
</tr>`;
            });
        }
    }

    const cardsView = document.getElementById("deptCardsView");
    const detailView = document.getElementById("deptDetailView");
    if (cardsView) cardsView.style.display = "none";
    if (detailView) detailView.style.display = "block";
};

function backToDepartments() {
    selectedDepartment = null;
    const cardsView = document.getElementById("deptCardsView");
    const detailView = document.getElementById("deptDetailView");
    if (cardsView) cardsView.style.display = "block";
    if (detailView) detailView.style.display = "none";
}
window.backToDepartments = backToDepartments;

async function loadUsers() {
    const requests = await getDashboardRequests();
    const filterEl = document.getElementById("userDeptFilter");
    const filter = filterEl ? filterEl.value : "All";
    const tbody = document.getElementById("usersTableBody");

    if (!tbody) return;
    tbody.innerHTML = "";

    if (!requests.length) {
        tbody.innerHTML = "<tr><td colspan='4' align='center'>No students found.</td></tr>";
        return;
    }

    const map = new Map();
    requests.forEach(req => {
        const name = req.name || "Unknown";
        const dept = req.department || "-";
        const key = `${name}__${dept}`;
        if (!map.has(key)) {
            map.set(key, { name, dept, count: 0 });
        }
        map.get(key).count += 1;
    });

    const rows = Array.from(map.values()).filter(row => filter === "All" || row.dept === filter);

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='4' align='center'>No students found.</td></tr>";
        return;
    }

    rows.forEach(row => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.dept)}</td>
            <td>${row.count}</td>
            <td>-</td>
        </tr>`;
    });
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
        instituteName: "Smart University",
        reissueFee: 100,
        defaultStatus: "Pending"
    };

    const instituteName = document.getElementById("instituteName");
    const reissueFee = document.getElementById("reissueFee");
    const defaultStatus = document.getElementById("defaultStatus");

    if (instituteName) instituteName.value = settings.instituteName || "";
    if (reissueFee) reissueFee.value = settings.reissueFee ?? 100;
    if (defaultStatus) defaultStatus.value = settings.defaultStatus || "Pending";
}

function saveSettings(e) {
    e.preventDefault();

    const instituteName = document.getElementById("instituteName");
    const reissueFee = document.getElementById("reissueFee");
    const defaultStatus = document.getElementById("defaultStatus");

    const settings = {
        instituteName: instituteName ? instituteName.value.trim() : "Smart University",
        reissueFee: reissueFee ? Number(reissueFee.value || 0) : 0,
        defaultStatus: defaultStatus ? defaultStatus.value : "Pending"
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Keep fee as standalone key for student QR amount lookup.
    localStorage.setItem("smartID_feeAmount", String(settings.reissueFee || 100));
    alert("Settings updated successfully.");
}

window.updateStatus = function(index, status) {
    alert("Please update status from the application details page.");
};

window.saveRemark = function(index) {
    alert("Please update remarks from the application details page.");
};

window.deleteUser = function(userId) {
    if (!confirm("Delete this user account? Requests will be kept.")) return;

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const updatedUsers = users.filter(user => user.id !== userId);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    loadUsers();
};

window.exportCSV = async function() {
    const requests = await getDashboardRequests();
    if (!requests.length) {
        alert("No data!");
        return;
    }

    const csvHeader = "ID,Name,Dept,Date,Status,PaymentStatus,TransactionId,Remarks,ApprovedBy,ApprovedDate";
    const rows = requests.map(r => `${safeCsv(r.requestId)},${safeCsv(r.name)},${safeCsv(r.department)},${safeCsv(r.date)},${safeCsv(r.status)},${safeCsv(r.paymentStatus)},${safeCsv(r.transactionId)},${safeCsv(r.remarks)},${safeCsv(r.approvedBy)},${safeCsv(r.approvedDate)}`);
    const csv = `${csvHeader}\n${rows.join("\n")}`;

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = "requests.csv";
    link.click();
};

window.markNotificationsSeen = function() {
    const notifications = getNotifications();
    notifications.forEach(n => {
        if (n.targetRole === "admin") n.read = true;
    });
    saveNotifications(notifications);
    localStorage.setItem(ADMIN_LAST_SEEN_AT_KEY, new Date().toISOString());
    updateNotificationBadge();
};

window.openApplicationDetails = function(requestId) {
    if (!requestId) return;
    window.location.href = `application-details.html?id=${encodeURIComponent(requestId)}`;
};

window.logout = function() {
    if (confirm("Logout?")) {
        ["loggedIn", "role", "adminName", "token"].forEach(key => localStorage.removeItem(key));
        window.location.href = "index.html";
    }
};

function updateNotificationBadge() {
    const badge = document.getElementById("newRequestBadge");
    if (!badge) return;

    const notifications = getNotifications();
    const unseenCount = notifications.filter(n => n.targetRole === "admin" && !n.read).length;

    badge.innerText = String(unseenCount);
    badge.style.display = unseenCount > 0 ? "inline-flex" : "none";
}

function renderAdminNotifications() {
    const list = document.getElementById("adminNotifList");
    if (!list) return;
    const notifications = getNotifications()
        .filter(n => n.targetRole === "admin")
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    list.innerHTML = "";
    if (!notifications.length) {
        list.innerHTML = "<div class='notif-item'>No notifications</div>";
        return;
    }

    notifications.slice(0, 20).forEach(n => {
        list.innerHTML += `<div class="notif-item">${escapeHtml(n.message || "Update")}<small>${formatDateTime(n.createdAt)}</small></div>`;
    });
}

function createNotification(notification) {
    const notifications = getNotifications();
    notifications.push({
        id: "NTF-" + Math.floor(Math.random() * 1000000),
        targetRole: notification.targetRole || "admin",
        targetUserId: notification.targetUserId || "",
        message: notification.message || "New notification",
        createdAt: notification.createdAt || new Date().toISOString(),
        read: Boolean(notification.read)
    });
    saveNotifications(notifications);
    updateNotificationBadge();
}

function getNotifications() {
    return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]");
}

function saveNotifications(notifications) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

function formatDateTime(value) {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString();
}

function updateChart(pending, approved, rejected, completed) {
    const canvas = document.getElementById("statusChart");
    if (!canvas) return;

    const segmentStatsPlugin = {
        id: "segmentStatsPlugin",
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data || !meta.data.length) return;
            const values = [pending, approved, rejected, completed];

            meta.data.forEach((arc, index) => {
                const value = values[index];
                if (!value) return;

                const angle = (arc.startAngle + arc.endAngle) / 2;
                const radius = (arc.innerRadius + arc.outerRadius) / 2;
                const x = arc.x + Math.cos(angle) * radius;
                const y = arc.y + Math.sin(angle) * radius;

                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "700 12px Poppins, sans-serif";
                ctx.fillStyle = "#ffffff";
                ctx.shadowColor = "rgba(0,0,0,0.25)";
                ctx.shadowBlur = 3;
                ctx.fillText(String(value), x, y);
                ctx.restore();
            });
        }
    };

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas.getContext("2d"), {
        plugins: [segmentStatsPlugin],
        type: "doughnut",
        data: {
            labels: ["Pending", "Approved", "Rejected", "Completed"],
            datasets: [{
                data: [pending, approved, rejected, completed],
                backgroundColor: ["#f59e0b", "#10b981", "#ef4444", "#0f766e"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%"
        }
    });
}


function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = String(value);
}

function safeCsv(value) {
    return String(value || "").replace(/,/g, " ").replace(/\n/g, " ");
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeJs(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function assignStageDates(request, status) {
    const nowIso = new Date().toISOString();
    const normalizedStatus = String(status || "").toLowerCase();

    // Ensure backward compatibility for old requests.
    if (!request.submittedDate) {
        request.submittedDate = request.createdAt || nowIso;
    }

    if (normalizedStatus === "approved" && !request.reviewDate) {
        request.reviewDate = nowIso;
    }

    if (normalizedStatus === "printing") {
        if (!request.reviewDate) request.reviewDate = nowIso;
        if (!request.printingDate) request.printingDate = nowIso;
    }

    if (normalizedStatus === "ready") {
        if (!request.reviewDate) request.reviewDate = nowIso;
        if (!request.printingDate) request.printingDate = nowIso;
        // READY stage: capture ready timestamp and collection window.
        request.readyDate = nowIso;
        request.collectionStartDate = request.readyDate;
        const lastDate = new Date(request.readyDate);
        lastDate.setDate(lastDate.getDate() + 3);
        request.collectionLastDate = lastDate.toISOString();
    }

    if (normalizedStatus === "completed") {
        if (!request.reviewDate) request.reviewDate = nowIso;
        if (!request.printingDate) request.printingDate = nowIso;
        if (!request.readyDate) request.readyDate = nowIso;
        request.completedDate = nowIso;
    }
}

function updateThemeIcon(themeIcon) {
    if (!themeIcon) return;
    if (document.body.classList.contains("dark-mode")) {
        themeIcon.className = "fas fa-sun";
        return;
    }
    themeIcon.className = "fas fa-moon";
}
