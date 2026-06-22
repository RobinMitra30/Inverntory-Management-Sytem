# Firestore Database Architecture

This document describes the Firestore database architecture of the Sync Inventory ERP system.

The database is designed around a centralized inventory model where the Main Warehouse acts as the single source of truth and every transaction is recorded for complete traceability.

---

## Firestore Entity Relationship Diagram (ERD)

```mermaid
erDiagram

    USERS {
        string userId PK
        string fullName
        string email
        string role
        string status
    }

    PROJECTS {
        string projectId PK
        string projectName
        string managerId FK
        number budget
        string status
    }

    PRODUCTS {
        string productId PK
        string sku
        string productName
        string category
        string uom
    }

    VENDORS {
        string vendorId PK
        string vendorName
        string contact
        string gstNumber
    }

    WAREHOUSE {
        string warehouseId PK
        string warehouseName
        string location
    }

    INVENTORY {
        string inventoryId PK
        string productId FK
        number quantity
        number reserved
        number available
    }

    PROJECT_INVENTORY {
        string projectInventoryId PK
        string projectId FK
        string productId FK
        number quantity
    }

    PURCHASE_REQUISITIONS {
        string prId PK
        string projectId FK
        string requestedBy FK
        string status
    }

    PURCHASE_ORDERS {
        string poId PK
        string vendorId FK
        string prId FK
        string status
    }

    GOODS_RECEIPTS {
        string grnId PK
        string poId FK
        string vendorId FK
        string status
    }

    RETURNS {
        string returnId PK
        string projectId FK
        string type
        string status
    }

    STOCK_MOVEMENTS {
        string movementId PK
        string productId FK
        string transactionType
        number quantity
    }

    MATERIAL_PRICE_HISTORY {
        string historyId PK
        string productId FK
        string vendorId FK
        number unitPrice
    }

    AUDIT_LOGS {
        string auditId PK
        string userId FK
        string action
        timestamp createdAt
    }

    USERS ||--o{ PROJECTS : manages

    USERS ||--o{ PURCHASE_REQUISITIONS : creates

    USERS ||--o{ AUDIT_LOGS : performs

    PROJECTS ||--o{ PURCHASE_REQUISITIONS : generates

    PROJECTS ||--o{ PROJECT_INVENTORY : owns

    PRODUCTS ||--o{ INVENTORY : stored_in

    PRODUCTS ||--o{ PROJECT_INVENTORY : allocated_to

    PRODUCTS ||--o{ STOCK_MOVEMENTS : tracked_by

    PRODUCTS ||--o{ MATERIAL_PRICE_HISTORY : priced_in

    PURCHASE_REQUISITIONS ||--|| PURCHASE_ORDERS : converts_to

    PURCHASE_ORDERS ||--o{ GOODS_RECEIPTS : receives

    GOODS_RECEIPTS ||--o{ INVENTORY : updates

    VENDORS ||--o{ PURCHASE_ORDERS : supplies

    VENDORS ||--o{ GOODS_RECEIPTS : delivers

    VENDORS ||--o{ MATERIAL_PRICE_HISTORY : pricing

    INVENTORY ||--o{ STOCK_MOVEMENTS : records

    PROJECT_INVENTORY ||--o{ RETURNS : returns

    RETURNS ||--o{ STOCK_MOVEMENTS : updates

```

---

# Primary Firestore Collections

| Collection | Purpose |
|------------|---------|
| users | User Accounts |
| projects | Project Master |
| products | Product Catalog |
| vendors | Vendor Master |
| inventory | Main Warehouse Inventory |
| projectInventory | Site Inventory |
| purchaseRequisitions | Material Requests |
| purchaseOrders | Vendor Orders |
| goodsReceipts | GRN Records |
| returns | Return Management |
| stockMovements | Inventory Ledger |
| materialPriceHistory | Price Intelligence |
| auditLogs | System Audit |

---

# Design Principles

- Firestore Document IDs are used internally.
- Human-readable names are displayed in the UI.
- Main Warehouse is the single source of truth.
- Every inventory movement creates a Stock Movement record.
- Every purchase updates Material Price History.
- Every action is recorded in Audit Logs.
- All relationships are maintained through document references.

---

# Architecture Highlights

✅ Centralized Warehouse Model

✅ Project-wise Inventory Tracking

✅ Complete Procurement Workflow

✅ Vendor Price Intelligence

✅ Immutable Stock Ledger

✅ Role-Based Access Control (RBAC)

✅ Audit Logging

✅ Real-time Firestore Synchronization
