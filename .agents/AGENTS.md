# Project Behavioral Rules

Build a simple, secure, and modern vehicle finance lead management system that enables Admins, Staff, Agents (DSA), and Field Executives to manage leads from creation to final disbursal with complete transparency and accountability.

Core Workflow
Lead statuses: New → Pending → Approved → Disbursed
Alternative states: Rejected and On Hold
All status changes must be validated and recorded in audit logs.
Lead Management
Auto-generate unique Lead IDs.
Capture customer, vehicle, loan, and source information.
Default every new lead to New status.
Maintain complete lead history.
Assignments
Only Admins and Staff can assign:
Field Executives
Agents (DSA)
Banks/Financers
Dealers
Every assignment change must create an audit entry.
Agent & Document Requirements
Agent leads require verified bank details and mandatory KYC documents.
Support document upload, preview, download, and admin verification.
No permanent deletion; maintain document history.
Communication & Follow-Ups
WhatsApp and call actions must be logged automatically.
Unlimited follow-up notes with next action dates.
Highlight overdue tasks on dashboards.
Commission Management
Standard split:
90% Agent
10% Organization
Commission calculations must occur on the backend only.
Dashboard & Reports
KPI cards for leads, approvals, disbursals, commissions, and loan values.
Filters by date, agent, bank, dealer, executive, and status.
Export to PDF, Excel, and CSV with A4-friendly layouts.
Role-Based Access
Admin: Full access.
Staff: Operations and assignments.
Agent: Own leads and commissions only.
Field Executive: Assigned leads and follow-ups only.
Security & Compliance
Hash passwords.
Validate uploads.
Mask sensitive information.
Enforce role permissions.
Keep immutable audit trails.
AI Agent Rules
Preserve business workflows.
Never bypass approvals or audit mechanisms.
Do not introduce new statuses or commission structures without approval.
Prefer minimal, backward-compatible changes.
Golden Rule

Every lead must remain fully traceable from creation to disbursal, with accurate financial tracking, complete audit history, and strict role-based security.
## UI POPUP / FORM RULE — MANDATORY
Make ALL forms, modals, dialogs, dropdowns, popovers, and popup menus fully visible and accessible at all times once opened.
- No hover-only behavior.
- No clipping from overflow, cards, tables, sidebars, or containers.
- No background interference while interacting with a popup.
- Use proper portal/root rendering + high z-index (e.g. z-[100] / z-[9999]).
- Keep popups open until the user intentionally closes or completes them.
- If content is large, scroll inside the popup, not the background.
- Ensure 100% viewport visibility and responsive positioning on desktop/tablet/mobile.
- Never hide, cut off, or move forms because of mouse movement.
- Priority: Functionality and visibility > decorative effects.
