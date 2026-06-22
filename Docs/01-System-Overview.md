# Sync Inventory ERP - System Overview

This document provides a high-level overview of the Sync Inventory ERP workflow.

```mermaid
flowchart TD

A([User])

A --> B[Login]

B --> C[Authentication]

C --> D{Role Based Access}

D -->|Admin| E[Admin Dashboard]
D -->|Project Manager| F[Project Dashboard]
D -->|Store Keeper| G[Warehouse Dashboard]
D -->|Site Supervisor| H[Site Dashboard]
D -->|Quality Engineer| I[Quality Dashboard]
D -->|Accountant| J[Finance Dashboard]

E --> K[Project Management]
F --> K

K --> L[Raise Material Requirement]

L --> M{Warehouse Stock Available?}

M -->|Yes| N[Issue Material]

M -->|No| O[Create Purchase Requisition]

O --> P[Purchase Order]

P --> Q[Vendor]

Q --> R[Goods Receipt Note]

R --> S[Quality Inspection]

S -->|Passed| T[Main Warehouse Inventory]

S -->|Rejected| U[Return To Vendor]

T --> V[Issue Material To Project]

V --> W[Project Inventory]

W --> X[Material Consumption]

X --> Y[Daily Progress Report]

Y --> Z[Reports & Analytics]

T --> AA[Stock Ledger]

W --> AA

U --> AA

AA --> AB[Dashboard]

AB --> AC[Vendor Price Intelligence]

AC --> AD[Audit Logs]

AD --> AE([System Complete])
```

## Workflow

1. User logs into the application.
2. Authentication and Role-Based Access Control are verified.
3. Users are redirected to their respective dashboards.
4. Material requirements are created from projects.
5. Warehouse stock is checked.
6. Available stock is issued directly.
7. Unavailable stock generates a Purchase Requisition.
8. Purchase Orders are sent to Vendors.
9. Goods Receipt Notes are created after receiving materials.
10. Quality Inspection is performed.
11. Approved materials are added to the Main Warehouse.
12. Materials are issued to Project Inventory.
13. Site consumption is recorded.
14. Daily Progress Reports are generated.
15. Every inventory movement is recorded in the Stock Ledger.
16. Dashboards and Reports are updated automatically.
17. Audit Logs capture every critical system action.
