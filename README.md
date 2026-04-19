# Poonawalla Fincorp – AI Loan Wizard 🏦🤖

Experience the future of lending. This project is a production-grade, AI-powered Loan Origination System (LOS) designed for **Poonawalla Fincorp**. It leverages multi-modal AI to automate the entire loan journey—from campaign landing to instant sanction.

![Project Preview](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-blueviolet)
![Tech Stack](https://img.shields.io/badge/Stack-Flask%20%7C%20MongoDB%20%7C%20Vanilla%20JS-blue)

## 🚀 Key Features

### 1. Unified Instant Onboarding
- **AI Video KYC**: Multi-modal assessment during a 3-minute video session.
- **Speech-to-Text**: Conversational data extraction (Income, Employment, Loan Purpose).
- **Computer Vision**: Real-time age estimation and liveness detection to prevent spoofing.

### 2. Intelligent Risk Engine
- **Gemini AI Integration**: Uses Google Gemini 1.5 Flash to categorize applicants into Risk Bands (A+, A, B+, B).
- **Dynamic Offers**: Instantly generates personalized loan amounts, interest rates, and EMI plans.

### 3. Central Audit & Monitoring Dashboard
- **Admin Portal**: Real-time monitoring of all applications.
- **Central Audit Repository**: RBI-compliant audit logging with cryptographic hashing for tamper-proof records.
- **Fraud Monitor**: Detects geo-mismatches and verbal inconsistencies during video calls.

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom Design System), and Modern JavaScript (ES6+).
- **Backend**: Python Flask with RESTful API architecture.
- **Database**: MongoDB (NoSQL) for flexible application and audit data storage.
- **AI Power**: Google Gemini 1.5 Flash (Generative AI) for credit risk assessment.

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.9+
- MongoDB (Running locally on `localhost:27017` or via MongoDB Atlas)
- Google Gemini API Key

### Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   pip install flask flask-cors pymongo google-generativeai
   ```
3. Set your Gemini API Key in `app.py` or as an environment variable.
4. Run the server:
   ```bash
   python app.py
   ```
   *The backend runs on `http://localhost:5001`.*

### Frontend Setup
1. Simply open `index.html` in any modern browser (or serve it via a local server).
2. Ensure the backend is running to handle authentication and data fetching.

---

## 🔐 Credentials for Testing

Access the unified login system at `login.html`:

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@poonawalla.com` | `Poonawalla@2025` |
| **New User** | (Create via Signup page) | (Selected by user) |

---

## 📁 Project Structure

```text
├── backend/
│   ├── app.py              # Flask API, AI Logic, DB Seeding
│   └── poonawalla.db       # SQLite version (backup)
├── js/
│   ├── auth.js             # RBAC & Session Management
│   ├── dashboard.js        # Admin Portal interactions & Charts
│   └── onboarding.js       # Customer application flow
├── styles/
│   ├── main.css            # Core Design System
│   ├── dashboard.css       # Admin dashboard layouts
│   └── landing.css         # Public landing page styles
├── index.html              # Customer Landing Page
├── login.html              # Unified Auth Portal
├── signup.html             # Dedicated Registration Page
├── onboarding.html         # Loan Journey UI
├── dashboard.html          # Admin Audit & Monitoring Portal
└── README.md
```

## 🛡️ Compliance & Security
This system is designed with **DPDP (Digital Personal Data Protection) Act** principles in mind, featuring:
- Role-Based Access Control (RBAC).
- Encrypted audit logs.
- Secure, non-raw data seeding for clean development.

---
*Created for Poonawalla Fincorp – Advanced AI Solutions.*
