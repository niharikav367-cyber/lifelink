require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "50kb" }));

// Data storage directory
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");
const DONORS_FILE = path.join(DATA_DIR, "donors.json");
const CENTRES_FILE = path.join(DATA_DIR, "centres.json");

// Initial Seed Data
const initialRequests = [
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
    notes: "Post-accident trauma care coordination."
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
    notes: "2 consenting voluntary donors connected."
  }
];

const initialDonors = [
  { id: "DN-101", name: "Rahul Sharma", blood_group: "O+", city: "Hyderabad", area: "Uppal", status: "Available", last_donated: "3 months ago", contact: "+91 98111 22334" },
  { id: "DN-102", name: "Priya Rao", blood_group: "B+", city: "Secunderabad", area: "Marredpally", status: "Available", last_donated: "5 months ago", contact: "+91 98222 33445" },
  { id: "DN-103", name: "Karthik Reddy", blood_group: "AB-", city: "Hyderabad", area: "Gachibowli", status: "On Call", last_donated: "1 month ago", contact: "+91 98333 44556" },
  { id: "DN-104", name: "Ananya Deshmukh", blood_group: "A+", city: "Hyderabad", area: "Madhapur", status: "Available", last_donated: "4 months ago", contact: "+91 98444 55667" },
  { id: "DN-105", name: "Vikram Varma", blood_group: "O-", city: "Hyderabad", area: "Banjara Hills", status: "Available", last_donated: "6 months ago", contact: "+91 98555 66778" }
];

const initialCentres = [
  { id: "CB-01", name: "Red Cross Central Blood Bank", type: "Blood Bank", area: "Vidyanagar, Hyderabad", phone: "040-27633087", stock_units: 142, emergency_24x7: true },
  { id: "CB-02", name: "Gandhi Hospital Blood Centre", type: "Government Hospital", area: "Musheerabad, Secunderabad", phone: "040-27505566", stock_units: 88, emergency_24x7: true },
  { id: "CB-03", name: "Osmania General Blood Centre", type: "Government Hospital", area: "Afzal Gunj, Hyderabad", phone: "040-24600121", stock_units: 110, emergency_24x7: true },
  { id: "CB-04", name: "Rotary Challa Blood Bank", type: "Charitable Blood Bank", area: "Ameerpet, Hyderabad", phone: "040-23746655", stock_units: 65, emergency_24x7: true }
];

function readData(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
  }
  fs.writeFileSync(file, JSON.stringify(fallback, null, 2), "utf8");
  return fallback;
}

function writeData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}

// In-memory synced state
let demoRequests = readData(REQUESTS_FILE, initialRequests);
let demoDonors = readData(DONORS_FILE, initialDonors);
let demoCentres = readData(CENTRES_FILE, initialCentres);

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "LifeLink Smart Blood Network API",
    mode: "FULL_STACK",
    timestamp: new Date().toISOString()
  });
});

// Stats summary
app.get("/api/stats", (req, res) => {
  res.json({
    open_requests: demoRequests.length,
    registered_donors: 1240 + demoDonors.length - initialDonors.length,
    partner_centres: demoCentres.length,
    response_rate: "78%"
  });
});

// Requests API
app.get("/api/requests", (req, res) => {
  res.json({ requests: demoRequests });
});

app.post("/api/requests", (req, res) => {
  const { blood_group, units, hospital, area, urgency, contact, notes } = req.body || {};

  if (!bloodGroups.includes(blood_group)) {
    return res.status(400).json({ error: "Select a valid blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)." });
  }

  const numUnits = Number(units);
  if (!Number.isInteger(numUnits) || numUnits < 1 || numUnits > 4) {
    return res.status(400).json({ error: "Units must be an integer between 1 and 4." });
  }

  if (!hospital || typeof hospital !== "string" || hospital.trim().length < 2) {
    return res.status(400).json({ error: "Please enter a valid hospital or centre name." });
  }

  if (!area || typeof area !== "string" || area.trim().length < 2) {
    return res.status(400).json({ error: "Please specify the city or area." });
  }

  if (!contact || typeof contact !== "string" || contact.trim().length < 7) {
    return res.status(400).json({ error: "A contact phone number is required." });
  }

  // Clean contact formatting
  const cleanedContact = contact.trim();
  if (!/^[0-9+\s().-]{7,20}$/.test(cleanedContact)) {
    return res.status(400).json({ error: "Please enter a valid contact phone number." });
  }

  const validUrgencies = ["Urgent", "Within 24 hours", "Planned"];
  const chosenUrgency = validUrgencies.includes(urgency) ? urgency : "Urgent";

  const newRequest = {
    id: "LL-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
    blood_group,
    units: numUnits,
    hospital: hospital.trim(),
    area: area.trim(),
    urgency: chosenUrgency,
    contact: cleanedContact,
    status: "Request Submitted",
    created_at: new Date().toISOString(),
    notes: String(notes || "").trim().slice(0, 500)
  };

  demoRequests.unshift(newRequest);
  writeData(REQUESTS_FILE, demoRequests);

  res.status(201).json({
    success: true,
    message: "Request successfully registered in the LifeLink network",
    request: newRequest
  });
});

// Update request status
app.patch("/api/requests/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  const reqIndex = demoRequests.findIndex(r => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ error: "Request not found." });
  }

  const allowedStatuses = [
    "Request Submitted",
    "Verification Pending",
    "Alerts Sent",
    "Donor Responded",
    "Blood Bank Confirmed",
    "Request Completed",
    "Cancelled"
  ];

  if (status && allowedStatuses.includes(status)) {
    demoRequests[reqIndex].status = status;
    demoRequests[reqIndex].updated_at = new Date().toISOString();
    writeData(REQUESTS_FILE, demoRequests);
    return res.json({ success: true, request: demoRequests[reqIndex] });
  }

  res.status(400).json({ error: "Invalid status value." });
});

// Donors API
app.get("/api/donors", (req, res) => {
  res.json({ donors: demoDonors });
});

app.post("/api/donors", (req, res) => {
  const { name, blood_group, city, area, contact } = req.body || {};

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Donor name is required." });
  }

  if (!bloodGroups.includes(blood_group)) {
    return res.status(400).json({ error: "Select a valid blood group." });
  }

  if (!city || typeof city !== "string" || city.trim().length < 2) {
    return res.status(400).json({ error: "City is required." });
  }

  if (!contact || typeof contact !== "string" || !/^[0-9+\s().-]{7,20}$/.test(contact.trim())) {
    return res.status(400).json({ error: "A valid contact number is required." });
  }

  const newDonor = {
    id: "DN-" + (100 + demoDonors.length + 1),
    name: name.trim(),
    blood_group,
    city: city.trim(),
    area: String(area || "").trim(),
    status: "Available",
    last_donated: "Recently registered",
    contact: contact.trim(),
    created_at: new Date().toISOString()
  };

  demoDonors.unshift(newDonor);
  writeData(DONORS_FILE, demoDonors);

  res.status(201).json({
    success: true,
    message: "Thank you for registering as a voluntary donor!",
    donor: newDonor
  });
});

// Centres API
app.get("/api/centres", (req, res) => {
  res.json({ centres: demoCentres });
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Fallback route
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({ error: "An unexpected error occurred." });
});

const server = app.listen(PORT, () => {
  console.log(`LifeLink server running at http://localhost:${PORT}`);
});

module.exports = { app, server };
