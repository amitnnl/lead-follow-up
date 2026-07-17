# 📋 LeadFlow Pro (Vehicle Finance Lead Management System)

Welcome to **LeadFlow Pro**! This system is designed for Direct Selling Agents (DSAs) and finance teams to efficiently manage vehicle finance leads from inception to disbursement.

---

## 🚀 Operating Workflow

The core business process is divided into three simple, highly-efficient steps:

### 1️⃣ Step 1: Create Lead (Lead Entry)
* **Who:** Agents (DSA Partners) or Internal Staff.
* **Where:** `Leads` > `New Lead`
* **Action:** Capture the foundational details of the prospective client.
  * **Customer Profile:** Full Name, Primary & Alternate Mobile numbers, and Address.
  * **Vehicle Info:** Make & Model (e.g., *TATA 1512*), Year of Manufacture, Registration Number.
  * **Financials:** Requested Loan Amount and Lead Source.
* **Automation:** The system instantly generates a secure, sequential Lead ID (e.g., `DSA-2025-0001`), defaults the status to `New`, and creates a tamper-proof audit log.

### 2️⃣ Step 2: Assign Lead (Executive & Partner Assignment)
* **Who:** Admins and Internal Staff.
* **Where:** `Leads` > `Edit/Assign`
* **Action:** Connect the lead to the operational network.
  * **SFE / Executive:** Assign the Field Executive responsible for tracking and client visits.
  * **Financer / Bank:** Assign the funding institution (e.g., *AU Bank*, *Chola*).
  * **Agent / DSA:** Link the commissionable partner.
  * **Dealer:** Associate the commercial vehicle dealer.
* **Document Enforcements:** Input statuses for RC, Insurance, and RTO. 
  * *Note:* If an Agent is assigned, the system strictly enforces that the client's Bank Details (Name, Account, IFSC) and Document Statuses are fully updated.

### 3️⃣ Step 3: Follow Up (Tracking & Payout Lifecycle)
* **Who:** Assigned Field Executive (SFE), Staff, or Admins.
* **Where:** `Lead Details` > `Logs & Follow-ups`
* **Action:** Progress the lead towards final disbursement.
  * **Timeline Remarks:** Executives log regular touchpoints (e.g., *"Income proof collected"*).
  * **Next Action Dates:** Schedule the next follow-up call/visit to ensure leads stay warm.
  * **Status Progression:** Seamlessly transition the lead: 
    `New` ➡️ `Pending` ➡️ `Approved` ➡️ `Disbursed` ➡️ `Rejected` / `On Hold`.
* **Closing:** Once a lead enters the `Disbursed` status, payouts and agent commissions activate. Payout amounts are tracked transparently in the Commissions module.

---

## 🌟 Today's Implementations (Phase 1 to 5 Workflow)

We completed a massive 5-Phase upgrade to the platform today. Below is the complete workflow of features implemented:

### 🚀 Phase 1: Core Lead Tracking & Role Scoping
* **Database Expansion:** Added new columns to track `refinance_status`, `sfe_id` (Sales Field Executive), and `financer_id` directly to the `leads` table.
* **Role Scoping (SFE):** Introduced a specialized `sfe` user role. SFE users can now log into the platform, but they only see leads that are explicitly assigned to them.
* **Security:** Refactored `index.php` and `leads/view.php` to strictly ensure data compartmentalization and prevent privilege escalation.

### 💬 Phase 2: Action Triggers (WhatsApp/Call Integration)
* **Communication Actions:** Integrated one-click WhatsApp message triggers and Direct Calling links directly inside the lead view panel.
* **Dynamic Content:** WhatsApp triggers auto-populate personalized greetings using the customer's name and reference loan details.
* **Logging:** Interacting with these triggers automatically logs an action in the `lead_history` timeline, ensuring complete audit trails of all follow-up attempts.

### 📄 Phase 3: Document Management System (DMS)
* **Upload Interface:** Created a secure drag-and-drop or select interface for uploading critical documents (Aadhar, PAN, RC, Insurance, etc.).
* **Preview Features:** Added instant in-browser modal previews for uploaded PDFs and Images.
* **Admin Verification:** Implemented an admin verification layer. Uploaded documents remain in an 'unverified' state until an Admin reviews and marks them as 'Verified'.
* **Security Check:** Strictly enforced file extensions (`.pdf`, `.jpg`, `.png`, `.jpeg`) and MIME type checks to prevent malicious uploads.

### 💰 Phase 4: Advanced Commissions & 90/10 Split
* **Split Calculator:** Completely refactored `commissions/index.php` to visually support a 90% upfront payout and a 10% retention payout.
* **Eligibility Gates:** The 10% retention commission is strictly "Held" and only becomes "Eligible" once the lead's RC Status, Insurance Status, and RTO Status are marked as completed/received.
* **Database Migration:** Deployed `migrate_phase4.php` to safely add tracking columns (`payout_90_status`, `payout_10_status`, `additional_payout`) without data loss.

### 📊 Phase 5: Deep MIS Analytics & Reporting
* **Deep Filters:** Upgraded `reports/index.php` to allow simultaneous, complex filtering combinations across Agents, SFEs, Financers, Date Ranges, and Lead Statuses.
* **Dynamic SQL Engine:** Built a dynamic query compiler that safely binds parameters based on the active filters without exposing the database to SQL injection.
* **KPI Metrics:** Integrated beautiful, live-updating KPI cards (Total Leads, Total Disbursed, Pending Follow-ups, Revenue Estimates) that recalculate based on the currently applied deep filters.

---

## 💻 Tech Stack
- **Backend:** PHP (Vanilla) + MySQL
- **Frontend:** HTML5, Tailwind CSS v4 (Emerald Mint & Alpine White Theme)
- **Styling Architecture:** Compiled via `@tailwindcss/cli` into `assets/css/tailwind.css`
- **Features:** Glassmorphic UI elements, dynamic DataTables, role-based access control (Admin, Staff, Agent, Executive), and real-time interactive status pills.

## 🛠️ Development & Building
To re-compile the CSS after modifying `input.css`, run:
```bash
npm run build
```
*(This triggers `npx @tailwindcss/cli -i input.css -o assets/css/tailwind.css --minify`)*
