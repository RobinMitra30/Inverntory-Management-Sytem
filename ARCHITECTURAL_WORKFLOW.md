# System Architectural Workflow Documentation

This document explains the complete end-to-end workflow of the application, encompassing authentication, resource management, core inventory, procurement, and site operations.

---

## 1. Overall System Workflow

The system is a unified Enterprise Resource Planning (ERP) platform specifically designed to orchestrate materials, procurement, and progress tracking for multiple projects, connected to a central warehouse. 
The core orchestration flows as:
**Need Identification (MR) &rarr; Fulfillment Analysis &rarr; Requisition (PR) &rarr; Purchase Order (PO) &rarr; Goods Receipt (GRN) &rarr; Stock Issuance &rarr; Site Progress (DPR)**.

---

## 2. User Authentication & Authorization Flow
* **Purpose**: To securely verify user identity and enforce access control.
* **Trigger**: A user visits the application.
* **Process**:
  1. User enters Email and Password on the `LoginPage`.
  2. Firebase Auth performs credential verification.
  3. Upon success, the system queries the `users` collection to fetch the user's `UserProfile`.
  4. The global auth context sets the active `profile` (Admin, PM, Store Keeper, etc.).
  5. Routing layer checks permissions (e.g., redirecting users from `/admin` if not an ADMIN).
* **Database Collections**: `users`
* **Validations**: Valid email format, active user, matching role permissions.
* **Final Output**: An authenticated user session with role-specific UI rendering.

---

## 3. Role-Based Access Control
* **Purpose**: To restrict module access based on organizational roles.
* **Roles Implemented**:
  * **ADMIN**: Global access (Create users, manage exact pricing, full reporting).
  * **PROJECT_MANAGER**: Manages specific projects, approves PR/MR/Site Returns, submits DPRs.
  * **STORE_KEEPER**: Manages warehouse stock, processes GRNs, handles direct issues.
  * **SITE_SUPERVISOR**: Submits Daily Progress Reports (DPRs), monitors local project inventory, flags issues.
* **Process**: Modules and API services check `profile.role` against allowed arrays before rendering or committing Firestore transactions.

---

## 4. Project Creation Workflow
* **Purpose**: Initialize a new project context for tracking materials and progress.
* **Trigger**: Admin creates a new project via `AdminPage` or `ProjectsPage`.
* **Process**:
  1. Fill project details (Name, Location, Budget, Assigned PM).
  2. Create a document in `projects` collection.
  3. System dynamically supports filtering data (Stock, PRs, POs) using the new `project.id`.
* **Database Collections**: `projects`
* **Permissions**: `ADMIN` only.
* **Output**: A new, trackable project entity.

---

## 5. Material Requirements (MR) Workflow
* **Purpose**: Capture material needs from a project site and check against central warehouse availability.
* **Trigger**: Site Supervisor or PM submits a Material Requirement form.
* **Process**:
  1. User selects a project and required products/quantities.
  2. System compares requested qty vs `MAIN_WAREHOUSE` stock.
  3. Items are split into `warehouseFulfillmentQuantity` vs `procurementQuantity` (if short).
  4. Saved to `materialRequirements` collection.
  5. PM or Admin approves the MR.
  6. **Fulfillable parts** can trigger a direct warehouse issue.
  7. **Shortage parts** generate a Purchase Requisition (PR).
* **Database Collections**: `materialRequirements`, `stocks`
* **Output**: Centralized request for items dictating the next fulfillment step.

---

## 6. Purchase Requisition (PR) Workflow
* **Purpose**: Formally request the procurement of new materials typically handled by central purchasing.
* **Trigger**: Manual PR creation or automatically generated from MR shortages.
* **Process**:
  1. User adds items, quantities, estimated prices, and urgency.
  2. Saved as `DRAFT` or `SUBMITTED` into `purchaseRequisitions`.
  3. Routing for approval: PM approves &rarr; Admin approves.
  4. Logs updates into the `history` and `auditLogs` sub-arrays within the PR document.
* **Database Collections**: `purchaseRequisitions`
* **Output**: Approved PR ready to be converted into a Purchase Order.

---

## 7. Purchase Order (PO) Workflow
* **Purpose**: Legally binding authorization for a vendor to supply materials.
* **Trigger**: Admin converts an approved PR into a PO, or creates one directly.
* **Process**:
  1. Select Vendor, Project, items (from PR or manual).
  2. Apply tax, discount, calculate `totalAmount`.
  3. **Price Verification**: Checks historical unit prices via material intelligence. If the new price exceeds previous prices significantly, flags for explicit approval.
  4. Save to `purchaseOrders`.
* **Database Collections**: `purchaseOrders`, `purchaseRequisitions` (Update status)
* **Output**: Official PO document shared with the vendor.

---

## 8. Goods Receipt Note (GRN) Workflow
* **Purpose**: Acknowledge physical receipt of materials against a PO.
* **Trigger**: Store Keeper receives a physical delivery at the warehouse or site.
* **Process**:
  1. User selects the PO and enters the received/rejected quantities.
  2. Selects Receipt Type (`VENDOR_TO_WAREHOUSE` vs `DIRECT_SITE_DELIVERY`).
  3. Create document in `goodsReceipts`.
  4. Updates `quantityReceived` on the PO line items.
  5. If received at Warehouse, increments warehouse stock (creates a `STOCK_IN` movement).
  6. If Direct Site Delivery, increments project stock (creates a `DIRECT_SITE_DELIVERY` movement).
  7. Records material price point into historical tracking.
* **Database Collections**: `goodsReceipts`, `purchaseOrders`, `stocks`, `stockMovements`
* **Transactions**: Uses atomic Firestore transactions to ensure stock ledger matches PO states.
* **Output**: Updated inventory balance and closed/partially closed PO.

---

## 9. Material Issue to Site Workflow
* **Purpose**: Transfer physically available stock from the Main Warehouse to a specific Project Site.
* **Trigger**: Store Keeper fulfills an approved MR or physically issues material.
* **Process**:
  1. Select target project and items.
  2. Run a Firestore Transaction to:
     a. Decrease warehouse stock (`STOCK_OUT`).
     b. Increase project site stock (`STOCK_IN`).
  3. Log precise movements linking the source and destination.
* **Database Collections**: `stocks`, `stockMovements`
* **Output**: Transferred ownership and precise physical tracking of materials.

---

## 10. Return to Warehouse Workflow
* **Purpose**: Handle excess, wrong, or unused materials being sent back from a site to the central warehouse.
* **Trigger**: Site Supervisor submits a Return Request via `ProjectInventoryPage` context.
* **Process**:
  1. User specifies the item, qty, condition (Good/Damaged), and reason.
  2. Saves to `projectReturns`.
  3. Warehouse evaluates and accepts.
  4. Decreases site stock &rarr; Increases warehouse stock (if Good).
* **Database Collections**: `projectReturns`, `stocks`, `stockMovements`
* **Output**: Rebalanced stock counts and captured condition logs.

---

## 11. Return to Vendor (RTV) Workflow
* **Purpose**: Send defective or incorrect materials back to the supplier.
* **Trigger**: Identifying damaged goods during GRN or later at the warehouse.
* **Process**:
  1. Define vendor, PO reference, item, quantity, and damage status.
  2. Saves to `returnsToVendor`.
  3. Decrements actual warehouse stock based on the return quantity.
* **Database Collections**: `returnsToVendor`, `stocks`, `stockMovements`
* **Output**: Tracked RTV document and corrected available inventory.

---

## 12. Manual Stock Entry & Adjustment Workflow
* **Purpose**: Correct inventory discrepancies found during physical audits.
* **Trigger**: Store Keeper or Admin initiates an adjustment (Add/Reduce).
* **Process**:
  1. User specifies the new actual quantity or the delta.
  2. Firestore Transaction replaces previous `quantity` with the new audited `quantity`.
  3. Generates a `STOCK_ADJUSTMENT` movement record.
* **Database Collections**: `stocks`, `stockMovements`.

---

## 13. Daily Progress Report (DPR) Workflow
* **Purpose**: Core operational logging for daily site productivity and material consumption.
* **Trigger**: Site Supervisor submits end-of-day report.
* **Process**:
  1. Collects structured arrays for:
     * Material consumed today (decrements project local stock).
     * Work progress timelines and % completed.
     * Labor/Worker attendance (Skilled vs. Unskilled).
  2. Supervisor signature (base64 or reference).
  3. Submitted to `dailyReports`.
  4. Project progress percentage is updated based on weighted work items.
* **Database Collections**: `dailyReports`, `stocks`, `projects`
* **Output**: Definitive daily ledger of progress, decrementing site inventory automatically.

---

## 14. Stock Ledger & Movements Workflow
* **Purpose**: Immutable history of all material transactions.
* **Trigger**: Triggered absolutely *anytime* stock is altered.
* **Process**:
  1. Calculates the `currentStock` (running balance).
  2. Appends type (`IN`, `OUT`, `ISSUE_TO_SITE`, etc.).
  3. Records `userName` and timestamp to enforce complete traceability.
* **Database Collections**: `stockMovements`

---

## 15. Vendor Price Intelligence Workflow
* **Purpose**: Track price inflation/deflation and rate vendors historically.
* **Trigger**: Recorded upon GRN approval.
* **Process**:
  1. Parses the paid unit price for standard materials.
  2. Visual analysis via Recharts (Line/Bar graphs) to show average unit costs over time per material.
  3. Warns approvers automatically if a generated PO exceeds the historical median by X%.
* **Database Collections**: `materialPriceHistory`

---

## 16. Reports & Analytics Workflow
* **Purpose**: Digest macro-level company data for executives.
* **Trigger**: Admin requesting PDF/Excel reports.
* **Process**:
  1. App aggregates queries across `stocks`, `purchaseOrders`, `dailyReports`.
  2. Data mapped to multi-sheet workbooks (using `xlsx`) or auto-table PDFs (`jspdf`).
  3. Triggers browser download.

---

## 17. Issue Management & Site Task Workflows
* **Purpose**: Minor ticketing systems attached to project sites for quick resolution.
* **Trigger**: Created by PM or Supervisors.
* **Process**: Uses `siteTasks` and `projectIssues` collections to track assignment, priority, and resolution dates. Does not manipulate inventory, focuses purely on communication.
