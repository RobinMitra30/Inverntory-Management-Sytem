# Inventory Workflow

This document describes the complete inventory lifecycle within the Sync Inventory ERP system, covering warehouse management, stock movements, project inventory, manual adjustments, returns, and inventory reconciliation.

---

## Inventory Workflow

```mermaid
flowchart TD

A([Inventory Transaction])

A --> B{Transaction Type}

%% =========================
%% PROCUREMENT
%% =========================

B -->|GRN| C[Receive Material]

C --> D[Register in Main Warehouse]

D --> E[Increase Warehouse Stock]

E --> F[Create Stock Movement]

%% =========================
%% ISSUE TO PROJECT
%% =========================

B -->|Issue Material| G[Select Project]

G --> H[Reserve Warehouse Stock]

H --> I[Reduce Warehouse Stock]

I --> J[Increase Project Inventory]

J --> K[Create Stock Movement]

%% =========================
%% DIRECT STOCK ENTRY
%% =========================

B -->|Manual Entry| L[Admin / Store Keeper]

L --> M[Select Material]

M --> N[Enter Quantity]

N --> O[Increase Warehouse Stock]

O --> P[Create Adjustment Entry]

%% =========================
%% STOCK ADJUSTMENT
%% =========================

B -->|Adjustment| Q[Physical Verification]

Q --> R{Variance Found?}

R -->|Yes| S[Adjust Inventory]

S --> T[Create Adjustment Ledger]

R -->|No| U[No Changes]

%% =========================
%% MATERIAL CONSUMPTION
%% =========================

B -->|Consumption| V[Site Uses Material]

V --> W[Reduce Project Inventory]

W --> X[Update Consumption Ledger]

%% =========================
%% RETURN TO WAREHOUSE
%% =========================

B -->|Project Return| Y[Return Material]

Y --> Z[Warehouse Inspection]

Z --> AA{Condition Good?}

AA -->|Yes| AB[Increase Warehouse Stock]

AA -->|Damaged| AC[Scrap Inventory]

AB --> AD[Create Return Ledger]

AC --> AD

%% =========================
%% RETURN TO VENDOR
%% =========================

B -->|Return To Vendor| AE[Select Vendor]

AE --> AF[Reduce Warehouse Stock]

AF --> AG[Create RTV Document]

AG --> AH[Update Stock Ledger]

%% =========================
%% INVENTORY DASHBOARD
%% =========================

F --> AI
K --> AI
P --> AI
T --> AI
X --> AI
AD --> AI
AH --> AI

AI[Inventory Dashboard]

AI --> AJ[Warehouse Stock]

AI --> AK[Project Inventory]

AI --> AL[Low Stock Alerts]

AI --> AM[Stock Valuation]

AI --> AN[Inventory Reports]

AN --> AO([Inventory Updated])
```

---

# Inventory Components

| Module | Description |
|----------|-------------|
| Main Warehouse | Central inventory repository |
| Project Inventory | Site-specific inventory |
| Stock Movement | Complete inventory audit trail |
| Manual Stock Entry | Direct inventory addition |
| Stock Adjustment | Physical stock correction |
| Material Consumption | Site material usage |
| Return Management | Warehouse and Vendor returns |
| Dashboard | Live inventory analytics |

---

# Business Rules

- Every incoming material must first be registered in the Main Warehouse.
- Every issue reduces Warehouse stock and increases Project Inventory.
- Manual Stock Entry is restricted to Admin and Store Keeper.
- Every inventory transaction must generate a Stock Movement record.
- Negative stock is not allowed.
- Inventory adjustments require remarks.
- Project Inventory cannot exceed issued quantity.
- Returns automatically update warehouse stock after approval.
- Inventory Dashboard always reflects live Firestore data.

---

# Firestore Collections

- inventory
- warehouseInventory
- projectInventory
- stockMovements
- returns
- returnsToVendor
- goodsReceipts
- stockAdjustments
- auditLogs

---

# Inventory Lifecycle

1. Material Received (GRN)
2. Main Warehouse Registration
3. Stock Ledger Update
4. Material Issued to Project
5. Project Inventory Updated
6. Material Consumed
7. Material Returned (Optional)
8. Warehouse Updated
9. Dashboard Refreshed
10. Reports Generated
