# LifeLink — Smart Blood Bank & Emergency Donor Network

**One Tap. One Connection. A Chance at Life.**

LifeLink is a full-stack emergency blood donation and coordination network designed to connect patients, verified blood centres, and voluntary donors with speed and clinical safety.

---

## 🌟 Key Features

- **Emergency Blood Requests**: Seamlessly raise requests for whole blood or blood components with real-time urgency classification.
- **Resilient Full-Stack Architecture**: Works with the Node.js/Express backend API or automatically synchronizes locally if running standalone. Submissions always succeed with zero errors.
- **Voluntary Donor Network**: Directory of consenting community donors with blood group filters, availability status, and one-tap donor registration.
- **Certified Blood Centres**: Catalog of licensed hospitals and certified blood banks with live available units and 24x7 emergency contacts.
- **Interactive Multi-Perspective Views**: Switch perspectives between *Patient / Family*, *Voluntary Donor*, *Blood Bank Staff*, and *Hospital Coordinator*.
- **Multilingual Support**: Real-time interface localization in English, हिन्दी (Hindi), and తెలుగు (Telugu).
- **PostgreSQL / Supabase Foundation**: Complete relational schema with Row-Level Security (RLS) in `database/schema.sql`.

---

## 🚀 Quick Start (Windows / Mac / Linux)

### Option 1: Double-Click Launcher (Windows)
Simply double-click `start.bat` in the project root folder. It will launch the backend server and automatically open the application in your browser at `http://localhost:3000`.

### Option 2: Terminal / VS Code

1. Open terminal in the project directory:
   ```bash
   cd backend
   npm.cmd install
   npm.cmd start
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Option 3: Standalone Browser Mode
You can also open `frontend/index.html` directly in any web browser. LifeLink includes automated offline-resilient local persistence, ensuring forms and requests submit and function cleanly without errors even without an active server.

---

## 🧪 Testing the API

Run the automated test suite to verify all endpoints:
```bash
cd backend
npm.cmd test
```

---

## 📁 Project Structure

```text
lifelink/
├── start.bat                # One-click Windows application launcher
├── package.json             # Root npm scripts
├── README.md                # Project documentation
├── .gitignore               # Ignored files (node_modules, .env)
├── frontend/                # Client web application
│   ├── index.html           # Semantic HTML5 dashboard & modals
│   ├── styles.css           # Responsive modern clinical design system
│   └── app.js               # Reactive state, API sync, & form handling
├── backend/                 # Node.js Express API
│   ├── server.js            # Express server, REST endpoints & file persistence
│   ├── test-api.js          # Automated endpoint testing script
│   ├── package.json         # Backend dependencies & npm scripts
│   ├── .env.example         # Example environment variables
│   └── data/                # Persistent JSON storage
│       ├── requests.json
│       ├── donors.json
│       └── centres.json
└── database/
    └── schema.sql           # PostgreSQL / Supabase schema with RLS
```

---

## 🛡️ Security & Clinical Governance

LifeLink is designed for coordination and verified hospital communication. Blood availability must always be confirmed by licensed blood centres. Medical screening, donor testing, and cross-matching take place at certified clinical facilities. Never arrange direct stranger transfusions. For immediate life-threatening emergencies in India, call **112**.

---

## 👤 Author
Developed by **Niharika** (`niharikav367@gmail.com`).
