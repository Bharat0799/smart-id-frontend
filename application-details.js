document.addEventListener("DOMContentLoaded", function() {
    const BASE_URL = "https://smart-id-backend-3.onrender.com";
    // Read request id from URL: application-details.html?id=APP-1234
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("id");
    const token = localStorage.getItem("token") || "";
    let application = null;
    const role = localStorage.getItem("role") || "";

    const init = async () => {
        if (!requestId || !token || role !== "admin") {
            alert("Session expired. Please login as admin.");
            window.location.href = "admin.html";
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/admin/applications`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                alert(data.message || "Unable to load application details.");
                window.location.href = "admin_dashboard.html";
                return;
            }

            const apps = Array.isArray(data.applications) ? data.applications : [];
            const found = apps.find(app =>
                String(app.applicationId || app.requestId || app._id || "") === String(requestId)
            );
            if (found) {
                application = {
                    requestId: found.applicationId || found.requestId || found._id || "-",
                    backendId: found._id || "",
                    name: found.name || "-",
                    email: found.email || "-",
                    mobile: found.mobile || "-",
                    department: found.department || "-",
                    reason: found.reason || "-",
                    date: found.date || found.createdAt || found.appliedDate || "-",
                    status: found.status || "Pending",
                    remarks: found.remarks || "",
                    correctionFields: found.correctionFields || [],
                    corrections: found.corrections || {},
                    proofFilePath: found.proofFilePath || ""
                };
            }
        } catch (error) {
            alert("Unable to connect to server.");
            window.location.href = "admin_dashboard.html";
            return;
        }

        if (!application) {
            alert("Application not found.");
            window.location.href = "admin_dashboard.html";
            return;
        }

        bindApplication(application);

        document.getElementById("backBtn").addEventListener("click", function() {
            window.location.href = "admin_dashboard.html";
        });

        document.getElementById("approveBtn").addEventListener("click", function() {
                updateApplicationStatus(-1, "Approved", {
                token,
                requestId,
                backendId: application.backendId || ""
            });
        });

        const printingBtn = document.getElementById("printingBtn");
        if (printingBtn) {
            printingBtn.addEventListener("click", function() {
                updateApplicationStatus(-1, "Printing", {
                    token,
                    requestId,
                    backendId: application.backendId || ""
                });
            });
        }

        const readyBtn = document.getElementById("readyBtn");
        if (readyBtn) {
            readyBtn.addEventListener("click", function() {
                updateApplicationStatus(-1, "Ready", {
                    token,
                    requestId,
                    backendId: application.backendId || ""
                });
            });
        }

        const completedBtn = document.getElementById("completedBtn");
        if (completedBtn) {
            completedBtn.addEventListener("click", function() {
                updateApplicationStatus(-1, "Completed", {
                    token,
                    requestId,
                    backendId: application.backendId || ""
                });
            });
        }

        document.getElementById("rejectBtn").addEventListener("click", function() {
            updateApplicationStatus(-1, "Rejected", {
                token,
                requestId,
                backendId: application.backendId || ""
            });
        });
    };

    init();
});

function bindApplication(application) {
    setText("appId", application.requestId || "-");
    setText("appName", application.name || "-");
    setText("appEmail", application.email || "-");
    setText("appPhone", application.mobile || "-");
    setText("appDepartment", application.department || "-");
    setText("appReason", application.reason || "-");
    setText("appDate", application.date || "-");
    renderCorrectionDetails(application);
    renderProofDocument(application);

    const badge = document.getElementById("statusBadge");
    const status = application.status || "Pending";
    badge.textContent = status;
    badge.className = `status-badge ${status.toLowerCase()}`;
}

function renderCorrectionDetails(application) {
    const section = document.getElementById("appCorrectionsSection");
    const listContainer = document.getElementById("appCorrectionsList");
    if (!section || !listContainer) return;

    const isCorrection = String(application.reason || "").toLowerCase() === "correction";
    if (!isCorrection) {
        section.style.display = "none";
        return;
    }

    const corrections = application.corrections && typeof application.corrections === "object"
        ? application.corrections
        : {};
    const entries = Object.entries(corrections).filter(([, value]) => {
        if (!value || typeof value !== "object") return false;
        return String(value.new || "").trim() !== "";
    });

    if (!entries.length) {
        const fallbackFields = Array.isArray(application.correctionFields) ? application.correctionFields : [];
        if (!fallbackFields.length) {
            listContainer.textContent = "No correction details provided.";
            section.style.display = "block";
            return;
        }
        listContainer.innerHTML = `<ul class="correction-list">${fallbackFields.map(field => `
            <li>
                <span class="corr-label">${escapeHtml(field)}</span>
                <div class="corr-row"><span class="corr-key">Old:</span><span class="corr-old">-</span></div>
                <div class="corr-row"><span class="corr-key">New:</span><span class="corr-new">-</span></div>
            </li>
        `).join("")}</ul>`;
        section.style.display = "block";
        return;
    }

    listContainer.innerHTML = `<ul class="correction-list">${entries.map(([key, value]) => {
        const label = formatCorrectionLabel(key);
        const oldValue = value.old ? String(value.old) : "-";
        const newValue = value.new ? String(value.new) : "-";
        return `
            <li>
                <span class="corr-label">${escapeHtml(label)}</span>
                <div class="corr-row"><span class="corr-key">Old:</span><span class="corr-old">${escapeHtml(oldValue)}</span></div>
                <div class="corr-row"><span class="corr-key">New:</span><span class="corr-new">${escapeHtml(newValue)}</span></div>
            </li>
        `;
    }).join("")}</ul>`;
    section.style.display = "block";
}

function formatCorrectionLabel(key) {
    const map = {
        name: "Name",
        idNumber: "ID Number",
        department: "Department",
        address: "Address",
        phone: "Phone Number"
    };
    return map[key] || key;
}

function renderProofDocument(application) {
    const container = document.getElementById("appProofContainer");
    if (!container) return;

    const filePath = String(application.proofFilePath || "").trim();
    if (!filePath) {
        container.textContent = "No document uploaded";
        return;
    }

    const BASE_URL = "https://smart-id-backend-3.onrender.com";
    const fullUrl = filePath.startsWith("http") ? filePath : `${BASE_URL}${filePath}`;
    const lowerPath = filePath.toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lowerPath);
    const isPdf = lowerPath.endsWith(".pdf");

    if (isImage) {
        container.innerHTML = `<img src="${fullUrl}" alt="Proof Document">`;
        return;
    }

    if (isPdf) {
        container.innerHTML = `
            <iframe src="${fullUrl}" title="Proof Document"></iframe>
            <div style="margin-top:8px;">
                <a class="proof-link" href="${fullUrl}" target="_blank" rel="noopener noreferrer">Open PDF</a>
            </div>
        `;
        return;
    }

    container.innerHTML = `<a class="proof-link" href="${fullUrl}" target="_blank" rel="noopener noreferrer">Open Document</a>`;
}

async function updateApplicationStatus(index, status, options = {}) {
    const remarks = document.getElementById("remarksInput").value.trim();
    const currentStatus = document.getElementById("statusBadge")?.textContent || "Pending";
    if (!isValidTransition(currentStatus, status)) {
        return;
    }
    const requireRemarks = status === "Approved" || status === "Rejected";
    if (requireRemarks && !remarks) {
        alert("Remarks are required for Approve/Reject.");
        return;
    }

    try {
        const resourceId = options.backendId || options.requestId;
        const BASE_URL = "https://smart-id-backend-3.onrender.com";
        const response = await fetch(`${BASE_URL}/api/admin/application/${encodeURIComponent(resourceId)}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${options.token}`
            },
            body: JSON.stringify({ status, remarks })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(data.message || "Failed to update status.");
            return;
        }
        alert(`Application ${status}.`);
        window.location.href = "admin_dashboard.html";
    } catch (error) {
        alert("Unable to connect to server. Please try again.");
    }
}

function isValidTransition(currentStatus, nextStatus) {
    const current = String(currentStatus || "Pending").toLowerCase();
    const next = String(nextStatus || "").toLowerCase();

    // Keep progression strict so timeline dates are meaningful.
    if (next === "approved" && current !== "pending") {
        alert("Approve only from Pending.");
        return false;
    }
    if (next === "rejected" && current !== "pending") {
        alert("Reject only from Pending.");
        return false;
    }
    if (next === "printing" && current !== "approved") {
        alert("Move to Printing only after Approved.");
        return false;
    }
    if (next === "ready" && current !== "printing") {
        alert("Mark Ready only after Printing.");
        return false;
    }
    if (next === "completed" && current !== "ready") {
        alert("Mark Completed only after Ready.");
        return false;
    }
    return true;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

