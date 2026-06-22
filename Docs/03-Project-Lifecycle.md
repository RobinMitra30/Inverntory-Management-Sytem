# Project Lifecycle

This document describes the complete lifecycle of a construction project within the Sync Inventory ERP system.

---

## Project Lifecycle Workflow

```mermaid
flowchart TD

A([Admin / Project Manager])

A --> B[Create Project]

B --> C[Enter Project Details]

C --> D[Assign Project Manager]

D --> E[Assign Team Members]

E --> F[Define Budget]

F --> G[Set Timeline]

G --> H[Create Project]

H --> I[Project Status = Active]

I --> J[Material Planning]

J --> K[Raise Material Requirement]

K --> L{Warehouse Stock Available?}

L -->|Yes| M[Issue Material]

L -->|No| N[Create Purchase Requisition]

M --> O[Project Inventory Updated]

N --> P[Purchase Order]

P --> Q[Vendor Supply]

Q --> R[Goods Receipt Note]

R --> S[Quality Inspection]

S -->|Approved| T[Warehouse Stock Updated]

S -->|Rejected| U[Return To Vendor]

T --> V[Issue Material To Site]

V --> W[Project Inventory]

W --> X[Site Execution]

X --> Y[Daily Progress Report]

Y --> Z{Project Completed?}

Z -->|No| J

Z -->|Yes| AA[Final Inventory Audit]

AA --> AB[Close Open PR/PO]

AB --> AC[Generate Final Reports]

AC --> AD[Archive Project]

AD --> AE([Project Completed])

```

---

# Project Stages

| Stage | Description |
|---------|-------------|
| Planning | Project created and resources assigned |
| Active | Material procurement and execution started |
| Execution | Daily work, inventory, DPR and tasks |
| Monitoring | Reports, issues and progress tracking |
| Completion | Final audit and reporting |
| Archived | Read-only historical project |

---

# Key Modules Involved

- Projects
- Users
- Material Requirement
- Purchase Requisition
- Purchase Order
- Goods Receipt Note
- Warehouse
- Project Inventory
- Daily Progress Report
- Reports
- Audit Logs

---

# Business Rules

- Every project must have one Project Manager.
- Budget must be defined before procurement.
- Material Requirements must belong to a project.
- Inventory movements must always reference a project.
- DPRs can only be submitted for Active projects.
- Completed projects become read-only.
- Archived projects cannot receive new inventory transactions.

---

# Firestore Collections

- projects
- users
- materialRequirements
- purchaseRequisitions
- purchaseOrders
- goodsReceipts
- inventory
- stockMovements
- dailyReports
- auditLogs
