# Procurement Workflow

This document describes the complete procurement lifecycle from Material Requirement to Goods Receipt, Warehouse Stock Update, Site Issue, and Price Intelligence.

---

## Procurement Workflow

```mermaid
flowchart TD

A([Project Site])

A --> B[Raise Material Requirement]

B --> C[Project Manager Review]

C --> D{Requirement Approved?}

D -->|No| E[Reject Requirement]

D -->|Yes| F[Check Main Warehouse Inventory]

F --> G{Stock Available?}

G -->|Yes| H[Reserve Warehouse Stock]

G -->|No| I[Calculate Shortage]

I --> J[Generate Purchase Requisition]

J --> K[Admin Approval]

K --> L{Approved?}

L -->|Rejected| M[Close PR]

L -->|Approved| N[Create Purchase Order]

N --> O[Select Vendor]

O --> P[Vendor Price Intelligence]

P --> Q{Price Alert?}

Q -->|Normal| R[Approve PO]

Q -->|Higher Price| S[Manager Approval]

S --> R

R --> T[Send Purchase Order]

T --> U[Vendor Dispatch]

U --> V[Receive Material]

V --> W[Create Goods Receipt Note]

W --> X[Quality Inspection]

X --> Y{QC Passed?}

Y -->|Rejected| Z[Return To Vendor]

Y -->|Approved| AA[Register Material In Main Warehouse]

AA --> AB[Increase Warehouse Stock]

AB --> AC[Update Stock Ledger]

AC --> AD{Material Reserved For Project?}

AD -->|Yes| AE[Issue Material To Project]

AD -->|No| AF[Available For Future Requests]

AE --> AG[Reduce Warehouse Stock]

AG --> AH[Increase Project Inventory]

AH --> AI[Create Stock Movement]

AI --> AJ[Update Inventory Dashboard]

AJ --> AK[Update Reports]

AK --> AL([Procurement Completed])
```

---

# Procurement Stages

| Stage | Description |
|--------|-------------|
| Material Requirement | Site raises material demand |
| Warehouse Check | Check stock availability |
| Purchase Requisition | Auto-create for shortages |
| Approval | Manager/Admin approval |
| Purchase Order | Vendor order creation |
| Vendor Supply | Vendor dispatches materials |
| GRN | Material received |
| QC | Quality inspection |
| Warehouse | Main Warehouse registration |
| Site Issue | Material transferred to project |
| Inventory | Warehouse & Project inventory updated |
| Reporting | Dashboard & reports refreshed |

---

# Business Rules

- Main Warehouse must always be checked first.
- Purchase Requisition is generated only for shortages.
- If Warehouse has 4 units and Project needs 5, only 1 unit should be procured.
- Every vendor delivery must first be registered in Main Warehouse, even if physically delivered directly to the site.
- Warehouse becomes the single source of truth.
- Every movement must create a Stock Ledger entry.
- Approved GRNs update inventory automatically.
- Vendor Price Intelligence is updated after every Approved GRN.

---

# Firestore Collections

- materialRequirements
- purchaseRequisitions
- purchaseOrders
- goodsReceipts
- inventory
- projectInventory
- stockMovements
- materialPriceHistory
- vendorPriceAnalytics
- auditLogs
