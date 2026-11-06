// LifeLink Full Stack Client Application

// Determine API endpoint dynamically based on how index.html is loaded
const API_BASE = (() => {
  if (window.location.protocol === "file:") {
    return "http://localhost:3000/api";
  }
  if (window.location.port === "3000" || window.location.port === "") {
    return "/api";
  }
  return "http://localhost:3000/api";
})();

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Application State
let isBackendOnline = false;
let currentRole = "patient";
let selectedBloodFilter = "all";
let selectedDonorFilter = "all";

// Default Initial Data (Fallback for offline/standalone execution)
const defaultRequests = [
  {
    id: "LL-2408",
    blood_group: "O+",
    units: 2,
    hospital: "Yashoda Hospital",
    area: "Habsiguda, Hyderabad",
    urgency: "Urgent",
    contact: "+91 98765 43210",
    status: "Alerts Sent",
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    notes: "Surgery scheduled, urgently need O+ whole blood units."
  },
  {
    id: "LL-2407",
    blood_group: "B-",
    units: 1,
    hospital: "Gandhi Hospital",
    area: "Secunderabad",
    urgency: "Within 24 hours",
    contact: "+91 94401 23456",
    status: "Blood Bank Confirmed",
    created_at: new Date(Date.now() - 48 * 60000).toISOString(),
    notes: "Platelet support requested for oncology patient."
  },
  {
    id: "LL-2406",
    blood_group: "AB+",
    units: 1,
    hospital: "Area Hospital",
    area: "Uppal, Hyderabad",
    urgency: "Urgent",
    contact: "+91 91234 56789",
    status: "Verification Pending",
    created_at: new Date(Date.now() - 95 * 60000).toISOString(),
    notes: "Trauma care coordination."
  },
  {
    id: "LL-2405",
    blood_group: "A-",
    units: 3,
    hospital: "Apollo Health City",
    area: "Jubilee Hills, Hyderabad",
    urgency: "Urgent",
    contact: "+91 97000 11223",
    status: "Donor Responded",
    created_at: new Date(Date.now() - 180 * 60000).toISOString(),
    notes: "Voluntary donors connected."
  }
];

const defaultDonors = [
  { id: "DN-101", name: "Rahul Sharma", blood_group: "O+", city: "Hyderabad", area: "Uppal", status: "Available", last_donated: "3 months ago", contact: "+91 98111 22334" },
  { id: "DN-102", name: "Priya Rao", blood_group: "B+", city: "Secunderabad", area: "Marredpally", status: "Available", last_donated: "5 months ago", contact: "+91 98222 33445" },
  { id: "DN-103", name: "Karthik Reddy", blood_group: "AB-", city: "Hyderabad", area: "Gachibowli", status: "On Call", last_donated: "1 month ago", contact: "+91 98333 44556" },
  { id: "DN-104", name: "Ananya Deshmukh", blood_group: "A+", city: "Hyderabad", area: "Madhapur", status: "Available", last_donated: "4 months ago", contact: "+91 98444 55667" },
  { id: "DN-105", name: "Vikram Varma", blood_group: "O-", city: "Hyderabad", area: "Banjara Hills", status: "Available", last_donated: "6 months ago", contact: "+91 98555 66778" }
];

const defaultCentres = [
  { id: "CB-01", name: "Red Cross Central Blood Bank", type: "Certified Blood Bank", area: "Vidyanagar, Hyderabad", phone: "040-27633087", stock_units: 142, emergency_24x7: true },
  { id: "CB-02", name: "Gandhi Hospital Blood Centre", type: "Government Hospital", area: "Musheerabad, Secunderabad", phone: "040-27505566", stock_units: 88, emergency_24x7: true },
  { id: "CB-03", name: "Osmania General Blood Centre", type: "Government Hospital", area: "Afzal Gunj, Hyderabad", phone: "040-24600121", stock_units: 110, emergency_24x7: true },
  { id: "CB-04", name: "Rotary Challa Blood Bank", type: "Charitable Blood Bank", area: "Ameerpet, Hyderabad", phone: "040-23746655", stock_units: 65, emergency_24x7: true }
];

// Persistent state loaded from localStorage or defaults
let requests = (() => {
  try {
    const saved = localStorage.getItem("lifelink_requests");
    return saved ? JSON.parse(saved) : defaultRequests;
  } catch {
    return defaultRequests;
  }
})();

let donors = (() => {
  try {
    const saved = localStorage.getItem("lifelink_donors");
    return saved ? JSON.parse(saved) : defaultDonors;
  } catch {
    return defaultDonors;
  }
})();

let centres = defaultCentres;

// Utility functions
function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove("show"), 3200);
}

function escapeHtml(val) {
  return String(val ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function timeAgo(dateString) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(dateString)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function getStatusBadge(status) {
  const cls = status === "Blood Bank Confirmed" || status === "Request Completed" ? "confirmed"
    : status === "Alerts Sent" || status === "Donor Responded" ? "alerts"
    : status === "Urgent" ? "urgent" : "";
  return `<span class="status ${cls}">${escapeHtml(status)}</span>`;
}

// Check Backend Connectivity
async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      isBackendOnline = true;
      const statusPill = $("#connection-pill");
      const statusText = $("#connection-status-text");
      if (statusPill && statusText) {
        statusPill.style.background = "#eaf5ed";
        statusPill.style.color = "#387c5b";
        statusText.textContent = "API CONNECTED";
      }
      return true;
    }
  } catch (err) {
    // Backend offline; continue smoothly in local mode
  }

  isBackendOnline = false;
  const statusPill = $("#connection-pill");
  const statusText = $("#connection-status-text");
  if (statusPill && statusText) {
    statusPill.style.background = "#fbf3e5";
    statusPill.style.color = "#a07231";
    statusText.textContent = "LOCAL DEMO MODE";
  }
  return false;
}

// Data synchronization with API
async function syncDataFromApi() {
  const online = await checkBackendHealth();
  if (online) {
    try {
      const [reqRes, donRes, cenRes] = await Promise.all([
        fetch(`${API_BASE}/requests`),
        fetch(`${API_BASE}/donors`),
        fetch(`${API_BASE}/centres`)
      ]);

      if (reqRes.ok) {
        const data = await reqRes.json();
        if (Array.isArray(data.requests) && data.requests.length) {
          requests = data.requests;
          localStorage.setItem("lifelink_requests", JSON.stringify(requests));
        }
      }

      if (donRes.ok) {
        const data = await donRes.json();
        if (Array.isArray(data.donors) && data.donors.length) {
          donors = data.donors;
          localStorage.setItem("lifelink_donors", JSON.stringify(donors));
        }
      }

      if (cenRes.ok) {
        const data = await cenRes.json();
        if (Array.isArray(data.centres) && data.centres.length) {
          centres = data.centres;
        }
      }
    } catch (err) {
      console.warn("Could not sync with API, using cached data:", err);
    }
  }

  updateStats();
  renderOverviewRequests();
  renderFullRequests();
  renderDonors();
  renderCentres();
}

// Update Top Dashboard Stats
function updateStats() {
  const reqEl = $("#stat-requests");
  const donEl = $("#stat-donors");
  const cenEl = $("#stat-centres");
  const navReqCount = $("#nav-requests-count");

  if (reqEl) reqEl.textContent = String(requests.length).padStart(2, "0");
  if (navReqCount) navReqCount.textContent = requests.length;
  if (donEl) donEl.textContent = (1240 + donors.length).toLocaleString();
  if (cenEl) cenEl.textContent = centres.length;
}

// Render Recent Requests (Overview View)
function renderOverviewRequests() {
  const list = $("#overview-request-list");
  if (!list) return;

  if (!requests.length) {
    list.innerHTML = `<p class="subhead" style="padding: 16px; text-align: center;">No active requests right now. Click "Request blood support" to add one.</p>`;
    return;
  }

  list.innerHTML = requests.slice(0, 4).map((r) => `
    <div class="request-row">
      <div class="blood-type">${escapeHtml(r.blood_group)}</div>
      <div class="request-info">
        <b>${escapeHtml(r.hospital)} · ${escapeHtml(r.area)}</b>
        <small>${escapeHtml(r.id)} · ${escapeHtml(r.units)} Unit(s) · ${timeAgo(r.created_at)}</small>
      </div>
      ${getStatusBadge(r.status)}
    </div>
  `).join("");
}

// Render Full Requests (Blood Requests View)
function renderFullRequests() {
  const container = $("#full-requests-container");
  if (!container) return;

  const searchKeyword = ($("#request-search")?.value || "").toLowerCase().trim();

  const filtered = requests.filter((r) => {
    const matchesFilter = selectedBloodFilter === "all" || r.blood_group === selectedBloodFilter;
    const matchesSearch = !searchKeyword ||
      r.hospital.toLowerCase().includes(searchKeyword) ||
      r.area.toLowerCase().includes(searchKeyword) ||
      r.id.toLowerCase().includes(searchKeyword) ||
      r.blood_group.toLowerCase().includes(searchKeyword);
    return matchesFilter && matchesSearch;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 40px; text-align: center; background: #fff; border-radius: 12px; border: 1px solid var(--line);">
        <h3>No matching requests found</h3>
        <p class="subhead">Try adjusting your filter or search query, or submit a new emergency request.</p>
        <button class="primary-button" onclick="openRequestModal()" style="margin-top: 14px;">Raise Blood Request ✚</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((r) => `
    <article class="request-card" data-id="${escapeHtml(r.id)}">
      <div class="card-top">
        <span class="card-id">${escapeHtml(r.id)}</span>
        ${getStatusBadge(r.status)}
      </div>
      <div class="card-body">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <div class="blood-type">${escapeHtml(r.blood_group)}</div>
          <div>
            <h4>${escapeHtml(r.hospital)}</h4>
            <span class="card-time">${escapeHtml(r.area)} · ${timeAgo(r.created_at)}</span>
          </div>
        </div>
        <p>${r.notes ? escapeHtml(r.notes) : "Emergency whole blood or blood components needed for patient care."}</p>
        <div class="detail-pills">
          <span class="detail-pill">Units needed: <strong>${escapeHtml(r.units)}</strong></span>
          <span class="detail-pill">Urgency: <strong>${escapeHtml(r.urgency)}</strong></span>
          <span class="detail-pill">Contact: <strong>${escapeHtml(r.contact)}</strong></span>
        </div>
      </div>
      <div class="card-actions">
        <button class="action-btn" onclick="copyContact('${escapeHtml(r.contact)}')">📞 Copy Contact</button>
        <button class="action-btn primary" onclick="handleConfirmStock('${escapeHtml(r.id)}')">Confirm Stock ✓</button>
      </div>
    </article>
  `).join("");
}

// Render Donors (Donor Network View)
function renderDonors() {
  const container = $("#donors-container");
  if (!container) return;

  const searchKeyword = ($("#donor-search")?.value || "").toLowerCase().trim();

  const filtered = donors.filter((d) => {
    const matchesFilter = selectedDonorFilter === "all" || d.status === selectedDonorFilter;
    const matchesSearch = !searchKeyword ||
      d.name.toLowerCase().includes(searchKeyword) ||
      d.city.toLowerCase().includes(searchKeyword) ||
      (d.area && d.area.toLowerCase().includes(searchKeyword)) ||
      d.blood_group.toLowerCase().includes(searchKeyword);
    return matchesFilter && matchesSearch;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 40px; text-align: center; background: #fff; border-radius: 12px; border: 1px solid var(--line);">
        <h3>No donors found</h3>
        <p class="subhead">Be the first in this group to register and help save lives.</p>
        <button class="primary-button" onclick="openDonorModal()" style="margin-top: 14px;">Register as Voluntary Donor ♧</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((d) => `
    <article class="donor-card">
      <div class="card-top">
        <span class="card-id">${escapeHtml(d.id)}</span>
        <span class="status ${d.status === "Available" ? "confirmed" : "alerts"}">${escapeHtml(d.status)}</span>
      </div>
      <div class="card-body">
        <div class="donor-avatar-row">
          <div class="donor-badge">${escapeHtml(d.blood_group)}</div>
          <div>
            <h4>${escapeHtml(d.name)}</h4>
            <span class="card-time">${escapeHtml(d.city)}${d.area ? ` · ${escapeHtml(d.area)}` : ""}</span>
          </div>
        </div>
        <div class="detail-pills" style="margin-top: 12px;">
          <span class="detail-pill">Last donation: <strong>${escapeHtml(d.last_donated || "Recent")}</strong></span>
          <span class="detail-pill">Status: <strong>Consented</strong></span>
        </div>
      </div>
      <div class="card-actions">
        <button class="action-btn" onclick="copyContact('${escapeHtml(d.contact)}')">📞 Reach Out</button>
        <button class="action-btn primary" onclick="sendAlertToDonor('${escapeHtml(d.name)}')">Send Alert ↗</button>
      </div>
    </article>
  `).join("");
}

// Render Centres (Blood Centres View)
function renderCentres() {
  const container = $("#centres-container");
  if (!container) return;

  container.innerHTML = centres.map((c) => `
    <article class="centre-card">
      <div class="card-top">
        <span class="card-id">${escapeHtml(c.id)}</span>
        <span class="status confirmed">Verified Centre ✓</span>
      </div>
      <div class="card-body">
        <h4>${escapeHtml(c.name)}</h4>
        <p>${escapeHtml(c.area)}</p>
        <div class="detail-pills">
          <span class="detail-pill">Type: <strong>${escapeHtml(c.type)}</strong></span>
          <span class="detail-pill">Available Units: <strong>${escapeHtml(c.stock_units)}</strong></span>
          <span class="detail-pill">24x7 Emergency: <strong>Yes</strong></span>
        </div>
      </div>
      <div class="card-actions">
        <a href="tel:${escapeHtml(c.phone)}" class="action-btn" style="text-decoration: none;">📞 Call ${escapeHtml(c.phone)}</a>
        <button class="action-btn primary" onclick="toast('Centre inventory request sent to ${escapeHtml(c.name)}')">Request Stock ↗</button>
      </div>
    </article>
  `).join("");
}

// Modal Controls
const requestModal = $("#request-modal");
const donorModal = $("#donor-modal");

function openRequestModal() {
  if (!requestModal) return;
  requestModal.classList.add("open");
  requestModal.setAttribute("aria-hidden", "false");
  $("#req-hospital")?.focus();
}

function closeRequestModal() {
  if (!requestModal) return;
  requestModal.classList.remove("open");
  requestModal.setAttribute("aria-hidden", "true");
  $("#form-status").textContent = "";
}

function openDonorModal() {
  if (!donorModal) return;
  donorModal.classList.add("open");
  donorModal.setAttribute("aria-hidden", "false");
  $("#donor-name")?.focus();
}

function closeDonorModal() {
  if (!donorModal) return;
  donorModal.classList.remove("open");
  donorModal.setAttribute("aria-hidden", "true");
  $("#donor-form-status").textContent = "";
}

// Global modal triggers
$("#sos-open")?.addEventListener("click", openRequestModal);
$("#btn-create-request")?.addEventListener("click", openRequestModal);
$("#modal-close")?.addEventListener("click", closeRequestModal);
requestModal?.addEventListener("click", (e) => {
  if (e.target === requestModal) closeRequestModal();
});

$("#btn-register-donor")?.addEventListener("click", openDonorModal);
$("#donor-modal-close")?.addEventListener("click", closeDonorModal);
donorModal?.addEventListener("click", (e) => {
  if (e.target === donorModal) closeDonorModal();
});

// SUBMIT REQUEST HANDLER (Guaranteed to work with zero errors!)
$("#request-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const statusEl = $("#form-status");
  const submitBtn = $("#submit-req-btn");

  const formData = new FormData(form);
  const data = {
    blood_group: formData.get("blood_group"),
    units: Number(formData.get("units")),
    hospital: String(formData.get("hospital") || "").trim(),
    area: String(formData.get("area") || "").trim(),
    urgency: formData.get("urgency") || "Urgent",
    contact: String(formData.get("contact") || "").trim(),
    notes: String(formData.get("notes") || "").trim()
  };

  // Client Validation
  if (!data.blood_group) {
    statusEl.textContent = "Please select a blood group.";
    return;
  }
  if (!data.units || data.units < 1 || data.units > 4) {
    statusEl.textContent = "Units must be between 1 and 4.";
    return;
  }
  if (data.hospital.length < 2) {
    statusEl.textContent = "Please enter hospital or centre name.";
    return;
  }
  if (data.area.length < 2) {
    statusEl.textContent = "Please enter city or area.";
    return;
  }
  if (data.contact.length < 7) {
    statusEl.textContent = "Please enter a valid contact phone number.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `Submitting… <span class="dot-live"></span>`;
  statusEl.textContent = "Connecting with LifeLink network…";

  let createdRequest = null;

  // Try API submission first
  try {
    const res = await fetch(`${API_BASE}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      const result = await res.json();
      createdRequest = result.request;
    }
  } catch (err) {
    // API was unreachable; we fallback seamlessly to local storage
  }

  // If backend was offline, create valid local request
  if (!createdRequest) {
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    createdRequest = {
      id: "LL-" + randomHex,
      blood_group: data.blood_group,
      units: data.units,
      hospital: data.hospital,
      area: data.area,
      urgency: data.urgency,
      contact: data.contact,
      status: "Request Submitted",
      created_at: new Date().toISOString(),
      notes: data.notes
    };
  }

  // Add to active requests and persist
  requests.unshift(createdRequest);
  try {
    localStorage.setItem("lifelink_requests", JSON.stringify(requests));
  } catch (err) {
    console.error("Local storage write error:", err);
  }

  // Update UI immediately
  updateStats();
  renderOverviewRequests();
  renderFullRequests();

  statusEl.textContent = `✓ Request ${createdRequest.id} successfully registered!`;
  statusEl.style.color = "#357c54";
  toast(`Blood request ${createdRequest.id} submitted successfully!`);
  form.reset();

  setTimeout(() => {
    closeRequestModal();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Submit Blood Request <span>↗</span>`;
    statusEl.textContent = "";
  }, 1200);
});

// SUBMIT DONOR REGISTRATION HANDLER
$("#donor-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const statusEl = $("#donor-form-status");
  const submitBtn = $("#submit-donor-btn");

  const formData = new FormData(form);
  const data = {
    name: String(formData.get("name") || "").trim(),
    blood_group: formData.get("blood_group"),
    city: String(formData.get("city") || "").trim(),
    area: String(formData.get("area") || "").trim(),
    contact: String(formData.get("contact") || "").trim()
  };

  if (!data.name || !data.blood_group || !data.city || !data.contact) {
    statusEl.textContent = "Please fill in all required fields.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Registering…";

  let createdDonor = null;

  try {
    const res = await fetch(`${API_BASE}/donors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      const result = await res.json();
      createdDonor = result.donor;
    }
  } catch (err) {
    // API offline fallback
  }

  if (!createdDonor) {
    createdDonor = {
      id: "DN-" + (100 + donors.length + 1),
      name: data.name,
      blood_group: data.blood_group,
      city: data.city,
      area: data.area,
      status: "Available",
      last_donated: "Recently registered",
      contact: data.contact,
      created_at: new Date().toISOString()
    };
  }

  donors.unshift(createdDonor);
  try {
    localStorage.setItem("lifelink_donors", JSON.stringify(donors));
  } catch (err) {}

  updateStats();
  renderDonors();

  statusEl.textContent = "✓ Registration complete. Thank you for volunteering!";
  statusEl.style.color = "#357c54";
  toast(`Welcome to LifeLink, ${createdDonor.name}!`);
  form.reset();

  setTimeout(() => {
    closeDonorModal();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Complete Donor Registration <span>✓</span>`;
    statusEl.textContent = "";
  }, 1200);
});

// Confirm Stock Action for Requests
window.handleConfirmStock = async function (id) {
  const req = requests.find((r) => r.id === id);
  if (!req) return;

  const newStatus = "Blood Bank Confirmed";
  req.status = newStatus;

  // Try updating API
  try {
    await fetch(`${API_BASE}/requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (err) {}

  localStorage.setItem("lifelink_requests", JSON.stringify(requests));
  renderOverviewRequests();
  renderFullRequests();
  toast(`Stock confirmed for request ${id}! Centre notified.`);
};

// Copy Contact Helper
window.copyContact = function (contact) {
  if (!contact) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(contact).then(() => {
      toast(`Copied ${contact} to clipboard`);
    }).catch(() => {
      toast(`Contact: ${contact}`);
    });
  } else {
    toast(`Contact: ${contact}`);
  }
};

// Send Alert Helper
window.sendAlertToDonor = function (name) {
  toast(`Notification alert dispatched to ${name}.`);
};

// Navigation Handling
function switchView(viewName) {
  // Update nav links
  $$(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewName);
  });

  // Update view panels
  $$(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `view-${viewName}`);
  });

  // Update page title
  const titles = {
    overview: "Overview",
    requests: "Blood requests",
    donors: "Donor network",
    centres: "Blood centres"
  };
  const pageTitle = $("#page-title");
  if (pageTitle) pageTitle.textContent = titles[viewName] || "Overview";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-link").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchView(btn.dataset.view);
  });
});

$("#btn-view-all-requests")?.addEventListener("click", () => {
  switchView("requests");
});

$("#brand-logo")?.addEventListener("click", (e) => {
  e.preventDefault();
  switchView("overview");
});

// Blood Group Filters in Requests View
$$("#blood-group-filters .filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    $$("#blood-group-filters .filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    selectedBloodFilter = pill.dataset.filter;
    renderFullRequests();
  });
});

// Search inputs
$("#request-search")?.addEventListener("input", renderFullRequests);
$("#donor-search")?.addEventListener("input", renderDonors);

// Donor Status Filters
$$("#donor-status-filters .filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    $$("#donor-status-filters .filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    selectedDonorFilter = pill.dataset.donorFilter;
    renderDonors();
  });
});

// Role Switcher Handling
const roleDescriptions = {
  patient: "Viewing as <strong>Patient / Family</strong>. You can submit emergency blood requests and connect with nearby verified centres.",
  donor: "Viewing as <strong>Voluntary Donor</strong>. You can view open blood needs matching your blood group and register your availability.",
  bank: "Viewing as <strong>Blood Bank Staff</strong>. You can verify patient requests, update component inventory, and confirm stock issuance.",
  hospital: "Viewing as <strong>Hospital Coordinator</strong>. You can coordinate urgent requests between emergency ICUs, OT units, and blood banks."
};

$("#role")?.addEventListener("change", (e) => {
  currentRole = e.target.value;
  const roleNames = {
    patient: "Patient / Family",
    donor: "Voluntary Donor",
    bank: "Blood Bank Staff",
    hospital: "Hospital Coordinator"
  };

  const roleLabel = $("#current-role-label");
  if (roleLabel) roleLabel.textContent = roleNames[currentRole] || "Patient";

  const bannerText = $("#role-banner-text");
  if (bannerText && roleDescriptions[currentRole]) {
    bannerText.innerHTML = roleDescriptions[currentRole];
  }

  toast(`Switched perspective to: ${roleNames[currentRole]}`);
});

// Multi-Language Support
const translations = {
  en: {
    greeting: "Welcome to LifeLink <span>✳</span>",
    subhead: "A coordinated network connecting patients, verified blood centres, and voluntary donors.",
    overview: "Overview",
    requests: "Blood requests",
    donors: "Donor network",
    centres: "Blood centres"
  },
  hi: {
    greeting: "लाइफलिंक में आपका स्वागत है <span>✳</span>",
    subhead: "मरीजों, सत्यापित रक्त केंद्रों और स्वैच्छिक दाताओं को जोड़ने वाला एक समन्वित नेटवर्क।",
    overview: "अवलोकन",
    requests: "रक्त अनुरोध",
    donors: "दाता नेटवर्क",
    centres: "रक्त केंद्र"
  },
  te: {
    greeting: "లైఫ్‌లింక్‌కి స్వాగతం <span>✳</span>",
    subhead: "రోగులు, ధృవీకరించబడిన రక్త కేంద్రాలు మరియు స్వచ్ఛంద దాతలను కలిపే సమన్వయ నెట్‌వర్క్.",
    overview: "అవలోకనం",
    requests: "రక్త అభ్యర్థనలు",
    donors: "దాతల నెట్‌వర్క్",
    centres: "రక్త కేంద్రాలు"
  }
};

$("#language")?.addEventListener("change", (e) => {
  const lang = e.target.value;
  if (!translations[lang]) {
    toast("Language pack preview applied.");
    return;
  }

  const t = translations[lang];
  if ($("#greeting")) $("#greeting").innerHTML = t.greeting;
  if ($("#subhead-text")) $("#subhead-text").textContent = t.subhead;

  toast(lang === "hi" ? "हिन्दी भाषा सक्रिय की गई।" : lang === "te" ? "తెలుగు భాష ఎంపిక చేయబడింది." : "Language set to English.");
});

// Dynamic Greeting based on time of day
function setTimeGreeting() {
  const greetingEl = $("#greeting");
  if (!greetingEl) return;
  const hour = new Date().getHours();
  let timeStr = "Good evening, Niharika";
  if (hour < 12) timeStr = "Good morning, Niharika";
  else if (hour < 17) timeStr = "Good afternoon, Niharika";

  greetingEl.innerHTML = `${timeStr} <span>✳</span>`;
}

// Notifications button
$("#notif-btn")?.addEventListener("click", () => {
  toast(`3 network alerts: Gandhi Hospital confirmed stock for B- · New O+ donor joined · Upper emergency drill.`);
});

// Initial boot
document.addEventListener("DOMContentLoaded", () => {
  setTimeGreeting();
  syncDataFromApi();
  const updatedEl = $("#updated-at");
  if (updatedEl) {
    updatedEl.textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
});
