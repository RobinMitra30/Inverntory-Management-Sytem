# User & Developer Documentation

## 1. Project Introduction
This Construction ERP system provides tight operational control across procurement, inventory dispatching, daily field reporting, and financial tracking. Whether managing the central warehouse or overseeing field operations, this software synchronizes data natively across teams in real time using Firebase infrastructure.

---

## 2. User Roles & Permissions

The application heavily utilizes Role-Based Access Control (RBAC):
* **Admin**: Ultimate authority. Creates and views cross-project metrics, manages system users, catalogs, global vendors, and executes high-level POs.
* **Project Manager (PM)**: Responsible for specific projects. Can approve Purchase Requisitions (PRs), site Material Requirements (MRs), and review Daily Progress Reports (DPRs).
* **Store Keeper**: Ground-level logistics operative. Processes incoming Goods Receipts (GRNs), dispatches inventory to sites, transfers stock, and tracks vendor returns (RTV).
* **Site Supervisor**: Base-level operational input. Responsible for sending Daily Progress Reports, reporting site tasks and issues, and requesting materials (MRs).
* *(QA/Accountant/Safety Officer have read-oriented scopes based on future system integrations).*

---

## 3. Installation & Run Guide

**Prerequisites:**
* Node.js (v18 or greater)
* Active Firebase Project

**Step 1: Clone & Install**
```bash
npm install
```

**Step 2: Environment Config**
Create a `firebase-applet-config.json` containing the standard config keys provided by Google Firebase (appId, projectId, apiKey, messagingSenderId, etc.). Alternatively, environment variables (`.env`) can be used if refactored.

**Step 3: Run Development Server**
```bash
npm run dev
```

**Step 4: Build for Production**
```bash
npm run build
```

---

## 4. Key Module Guides

### A. Procurement Engine (From Need to Order)
1. **Material Requirements (MR)**: Sites ask for materials. The system evaluates whether it can be fulfilled from existing Warehouse Stock or if Procurement is needed.
2. **Purchase Requisition (PR)**: Internal document evaluating *what* needs to be bought and by when. PMs and Admin approve these.
3. **Purchase Orders (PO)**: Officially assigning a PR to a Vendor at specific negotiated rates. Generates PDF/Excel artifacts. POs have embedded AI checks comparing historical catalog rates against requested rates.

### B. Inventory Management & Logging
1. **The Central Ledger (Stock Movements)**: Every addition, subtraction, adjustment, GRN, or project issue creates an inalterable row inside the stock ledger tracking *Who* touched it, *Why*, and the *Exact Quantities*.
2. **Goods Receipt Note (GRN)**: Processed when physical items hit the dock. Matches against the PO. Marks pass/fail QC. Updates actual physical numbers.
3. **Returns Management**: 
   * **Project Returns**: Sites returning excess material to the Warehouse.
   * **RTV (Returns to Vendor)**: Warehouse returning defective goods from a PO/GRN back to external suppliers.

### C. Site & Project Control
1. **Daily Progress Reports (DPR)**: Submitted end of day. Integrates Labor calculations, Material Deductions, and Tasks completed. Replaces manual logbooks.
2. **Site Tasks & Issues**: Sub-modules to track micro-tickets for operations blocking progress (Weather, Safety, Delays).

---

## 5. Reporting & Exports
The system supports rich, client-side generation without backend overhead:
* **Procurement Intelligence**: Visual representation of purchasing history leveraging `Recharts`.
* **Data Dumps**: Click 'Export to Excel' to generate `.xlsx` tables utilizing `xlsx` module.
* **PDF Tickets**: Prints official PO formats and DPR records through the `jspdf` autotable library seamlessly.

---

## 6. Troubleshooting & FAQs

**Q: Users are unable to see certain projects?**
A: Ensure the `UserProfile` has the project's ID assigned to their `assignedProjects` array within Firestore or the Admin configuration.

**Q: Purchases are locked in `Price Verification Required` state?**
A: The system automatically flagged an item because its unit cost jumped more than the set tolerance compared to past POs. An `ADMIN` must override or approve it manually inside the active PO view.

**Q: GRN is not incrementing project stock correctly?**
A: Assure you denote `DIRECT_SITE_DELIVERY` correctly on the receipt type versus standard warehouse deliveries.

**Q: Where is data seeded from initially?**
A: The system includes a `DataSeeder.tsx` helper and multiple `product-catalog.ts` static files for demo operations. Do not leave active in production.

---

## 7. Future Improvements
* Complete OAuth Integration mapping to enterprise directories.
* Deeply detailed offline caching capabilities (using IndexedDB mapping over standard Firebase cache).
* Real-time Barcode scanning integrations mapping directly to SKU definitions during the GRN phase.
* Push Notifications via Firebase Cloud Messaging for instant approval notifications.
