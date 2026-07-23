# 📋 LeadFlow Pro (Vehicle Finance Lead Management System)

Welcome to **LeadFlow Pro**! This platform is an enterprise-grade Lead Management System designed specifically for Direct Selling Agents (DSAs) and vehicle finance teams. It enables organizations to efficiently manage vehicle loan leads from inception to final disbursement with complete transparency, role-based security, and accountability.

---

## 🏗️ System Architecture

LeadFlow Pro recently underwent a massive architectural upgrade to a modern **Single Page Application (SPA)** decoupled architecture.

* **Frontend:** A lightning-fast **React 18** SPA built with **Vite**, **TypeScript**, **Zustand** (for state management), and **Tailwind CSS**. It is fully decoupled from the backend and communicates purely via REST APIs.
* **Backend:** A highly optimized **PHP 8 API Gateway** (`backend/api/index.php`) that routes all requests, enforces strict Role-Based Access Control (RBAC), handles JWT/Session authentication, and interacts with a **MySQL** database.
* **Self-Healing Database:** The backend features a unique auto-migration engine (`db.php`) that safely checks and injects missing schema tables and columns dynamically without blocking requests.

---

## 🚀 Core Operating Workflow

The core business process guarantees that every lead is fully traceable, documents are verified, and relevant parties are notified instantly.

### 1️⃣ Lead Entry & Tracking
* **Capture Details:** Capture Customer Profile, Vehicle Info (Make/Model, Year, RC), and Financials (Loan Amount, Lead Source).
* **Automated Logging:** Every update and status change creates an immutable audit log, guaranteeing complete visibility.

### 2️⃣ Mandatory KYC & Document Management
* **Upload Interface:** Secure drag-and-drop system for capturing essential documents (Aadhar, PAN, RC, Insurance, Bank Statements).
* **KYC Enforcement:** The system **strictly prevents** assigning any lead to a Field Executive or Financer until mandatory KYC documents (Aadhar or PAN) have been successfully uploaded.

### 3️⃣ Smart Assignment & WhatsApp Notifications
* **Assignments:** Admins and Staff assign leads to specific **Field Executives (SFEs)** and **Financers (Banks)**.
* **Dual-Notification Engine:** Upon successful assignment, the system generates custom **WhatsApp Deep Links** that auto-populate personalized greetings, loan details, and assigned IDs. 
* **Automated Alerts:** Internal system notifications and SMTP Emails are simultaneously triggered for newly assigned executives.

### 4️⃣ Follow-ups & Lifecycle Progression
* **Timeline Logging:** Executives log regular touchpoints and set "Next Action Dates" to ensure no lead goes cold.
* **Status Progression:** `New` ➡️ `Initiated` ➡️ `Pending` ➡️ `Approved` ➡️ `Disbursed` (Alternative states: `Rejected`, `On Hold`).

### 5️⃣ Commission Engine & Payouts
* **Automated Splits:** Supports advanced 90/10 split tracking logic.
* **Eligibility Gates:** The retention commission (10%) is strictly held back until the lead's RC Status, Insurance Status, and RTO Status are marked as completed.

---

## 🛡️ Role-Based Access Control (RBAC)

The system enforces strict data compartmentalization across various roles:
* **Admin / Manager:** Full system access, assignment control, and deep MIS reporting.
* **Staff:** Operations management and daily lead processing.
* **Agent (DSA Partner):** Restricted to viewing only their own submitted leads and tracking their specific commission payouts.
* **SFE (Field Executive):** Restricted to viewing and acting on leads explicitly assigned to them for follow-ups.

---

## 💻 Tech Stack Summary

* **Frontend:** React 18, Vite, TypeScript, React Router DOM, Zustand, Axios, Tailwind CSS v4, Lucide Icons.
* **Backend:** PHP 8 (Vanilla API), MySQLi (MySQL 8), PHPMailer.
* **Infrastructure:** Apache/Nginx (XAMPP for local dev).

---

## 🛠️ Local Development & Setup

### 1. Backend Setup (XAMPP/PHP)
1. Ensure XAMPP is running with Apache and MySQL.
2. The backend is located in the `backend/` directory.
3. Database credentials and settings are located in `backend/includes/db.php`.
4. Run the SQL schema found in `backend/sql/schema.sql` on your MySQL server to set up the foundation. *(Note: The system will automatically self-heal and inject missing columns automatically on API boot)*.

### 2. Frontend Setup (React/Vite)
1. Ensure you have **Node.js** installed.
2. Open a terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```
3. Start the Vite Development Server:
   ```bash
   npm run dev
   ```
4. The frontend will launch (usually on `http://localhost:5173`) and automatically proxy `/api` requests to your local Apache backend (`http://127.0.0.1/lead-follow-up/backend`).

---

## 🚀 Deployment

We have included a handy automated deployment script!

When you are ready to push your local changes to the live server, simply run:
```bash
.\deploy.bat
```
*(Or double-click `deploy.bat` in File Explorer).*

This script will automatically:
1. Navigate to the `frontend/` folder and run `npm run build` to compile the optimized React SPA.
2. Add all changes to Git.
3. Commit and push the updates to the repository, syncing it seamlessly with your live production server.
