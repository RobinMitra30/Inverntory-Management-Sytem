# Complete System Sequence Diagram

This document describes the end-to-end sequence of a material procurement and inventory transaction in the Sync Inventory ERP System.

---

## End-to-End System Sequence

```mermaid
sequenceDiagram

actor PM as Project Manager
actor Admin
actor Vendor
actor Store as Store Keeper
actor Supervisor

participant UI as React UI
participant Auth as Firebase Auth
participant DB as Cloud Firestore
participant WH as Main Warehouse
participant INV as Project Inventory
participant PI as Price Intelligence
participant AUDIT as Audit Logs
participant DASH as Dashboard

PM->>UI: Raise Material Requirement

UI->>DB: Save Material Requirement

DB-->>UI: Requirement Created

UI->>WH: Check Warehouse Stock

alt Stock Available

WH-->>UI: Stock Available

UI->>DB: Create Issue Slip

DB->>WH: Reduce Warehouse Stock

DB->>INV: Increase Project Inventory

DB->>AUDIT: Create Audit Log

DB->>DASH: Refresh Dashboard

Supervisor->>UI: Receive Material

UI->>DB: Update Project Inventory

else Stock Not Available

WH-->>UI: Insufficient Stock

UI->>DB: Generate Purchase Requisition

Admin->>UI: Review PR

UI->>DB: Approve PR

DB-->>UI: PR Approved

Admin->>UI: Create Purchase Order

UI->>Vendor: Send Purchase Order

Vendor-->>Store: Deliver Material

Store->>UI: Create GRN

UI->>DB: Save GRN

Store->>UI: Perform Quality Inspection

alt QC Passed

UI->>DB: Register Material in Main Warehouse

DB->>WH: Increase Warehouse Stock

DB->>PI: Update Material Price History

PI->>PI: Compare Previous Price

PI-->>UI: Green / Yellow / Red Indicator

DB->>AUDIT: Record Transaction

DB->>DASH: Refresh Inventory

WH->>UI: Issue Material

UI->>DB: Reduce Warehouse Stock

DB->>INV: Increase Project Inventory

DB->>AUDIT: Record Stock Movement

Supervisor->>UI: Confirm Receipt

else QC Failed

Store->>UI: Create Return To Vendor

UI->>DB: Save RTV

DB->>AUDIT: Record RTV

Vendor-->>Store: Replacement Material

end

end

Supervisor->>UI: Submit Daily Progress Report

UI->>DB: Save DPR

DB->>DASH: Update Dashboard

DB->>AUDIT: Final Audit Entry

DASH-->>PM: Live Reports Updated

```

---

# Sequence Summary

1. Project Manager raises a Material Requirement.
2. Main Warehouse inventory is checked.
3. If stock is available, it is issued directly.
4. If stock is unavailable, a Purchase Requisition is generated.
5. Admin reviews and approves the Purchase Requisition.
6. Purchase Order is created and sent to the Vendor.
7. Vendor delivers materials.
8. Store Keeper creates the Goods Receipt Note (GRN).
9. Quality Inspection is performed.
10. Approved materials are registered in the Main Warehouse.
11. Material Price Intelligence updates automatically.
12. Required materials are issued to the Project.
13. Project Inventory is updated.
14. Stock Ledger and Audit Logs are created.
15. Supervisor submits the Daily Progress Report.
16. Dashboard and Analytics refresh in real time.

---

# Systems Involved

- React Frontend
- Firebase Authentication
- Cloud Firestore
- Main Warehouse
- Project Inventory
- Vendor Price Intelligence
- Audit Logs
- Dashboard & Analytics

---

# Key Business Rules

- Main Warehouse is always checked before procurement.
- Every vendor delivery is first registered in the Main Warehouse.
- Every inventory movement creates a Stock Ledger entry.
- Every important action creates an Audit Log.
- Dashboard updates automatically using Firestore real-time listeners.
