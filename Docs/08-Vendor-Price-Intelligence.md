# Vendor Price Intelligence

This document describes the Vendor Price Intelligence Engine implemented in the Sync Inventory ERP system.

The objective of this module is to help procurement teams purchase materials at the most competitive price by maintaining historical pricing, vendor comparisons, and procurement analytics.

---

## Vendor Price Intelligence Workflow

```mermaid
flowchart TD

A([Purchase Requisition Approved])

A --> B[Create Purchase Order]

B --> C[Select Vendor]

C --> D[Select Material]

D --> E[Enter Unit Price]

E --> F[Load Material Price History]

F --> G{Previous Purchase Exists?}

G -->|No| H[Save As First Purchase]

G -->|Yes| I[Compare Previous Purchase Price]

I --> J{Current Price}

J -->|Lower| K[Green Price Indicator]

J -->|Same| L[Yellow Price Indicator]

J -->|Higher| M[Red Price Indicator]

K --> N[Calculate Savings]

L --> O[No Price Difference]

M --> P[Calculate Extra Cost]

N --> Q[Vendor Analytics]

O --> Q

P --> Q

Q --> R[Update Material Price History]

R --> S[Generate Procurement Insights]

S --> T[Recommend Best Vendor]

T --> U[Save Analytics]

U --> V[Display Dashboard KPIs]

V --> W([Price Intelligence Updated])

```

---

# Vendor Price History

Every approved purchase creates a permanent historical record.

Each record stores:

- Material ID
- Material Name
- SKU
- Vendor ID
- Vendor Name
- Purchase Order
- GRN
- Unit Price
- Quantity
- Total Cost
- Purchase Date
- Project
- User
- Timestamp

Historical records are never overwritten.

---

# Price Comparison Logic

Whenever a Purchase Order is created, the system automatically compares:

Current Purchase Price

↓

Previous Purchase Price

↓

Difference

↓

Percentage Difference

↓

Price Indicator

---

## Price Indicators

| Indicator | Meaning |
|-----------|---------|
| 🟢 Green | Current purchase is cheaper than previous purchase |
| 🟡 Yellow | Price difference is within acceptable tolerance |
| 🔴 Red | Current purchase is more expensive than previous purchase |

---

# Procurement Intelligence

The system automatically calculates:

- Previous Purchase Price
- Current Purchase Price
- Price Difference
- Percentage Change
- Savings
- Additional Cost
- Vendor Performance
- Purchase Frequency
- Average Material Cost

---

# Vendor Recommendation Workflow

```mermaid
flowchart TD

A[Select Material]

A --> B[Load Vendor Price History]

B --> C[Compare All Vendors]

C --> D[Calculate Average Price]

D --> E[Find Lowest Price]

E --> F[Rank Vendors]

F --> G[Recommend Best Vendor]

G --> H[Display Estimated Savings]

```

---

# Dashboard KPIs

The Vendor Intelligence Dashboard displays:

- Lowest Purchase Price
- Highest Purchase Price
- Average Purchase Price
- Current Purchase Price
- Total Savings
- Extra Procurement Cost
- Best Vendor
- Worst Vendor
- Price Inflation
- Purchase Trend
- Vendor Ranking

---

# Business Rules

- Price History is created only after an Approved GRN.
- Historical records cannot be modified.
- Vendor comparison uses only approved purchases.
- Price calculations always use live Firestore data.
- Every purchase updates procurement analytics.
- Every price comparison is logged in the Audit Log.
- Procurement recommendations are generated automatically.

---

# Firestore Collections

- materialPriceHistory
- vendorPriceAnalytics
- purchaseOrders
- goodsReceipts
- vendors
- inventory
- auditLogs

---

# Benefits

- Historical price tracking
- Vendor comparison
- Procurement optimization
- Cost reduction
- Better purchasing decisions
- Enterprise procurement analytics
- Complete audit trail
- Automatic vendor recommendations
- Price trend analysis
- Budget control
