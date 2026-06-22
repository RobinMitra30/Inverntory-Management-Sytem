# Application Architecture

This document describes the overall software architecture of the **Sync Inventory ERP System**. It illustrates how the frontend, backend, services, Firebase, Firestore, and business modules interact to deliver a real-time inventory and procurement management platform.

---

## Application Architecture

```mermaid
flowchart TD

A([End User])

A --> B[React + TypeScript Frontend]

subgraph Frontend

B --> C[Authentication Module]
B --> D[Dashboard]
B --> E[Project Management]
B --> F[Inventory Management]
B --> G[Procurement]
B --> H[Warehouse]
B --> I[Vendor Management]
B --> J[Reports]
B --> K[Settings]

end

subgraph State_Management

L[Context API]
M[React Hooks]
N[Global State]

L --> M
M --> N

end

C --> L
D --> L
E --> L
F --> L
G --> L
H --> L
I --> L
J --> L
K --> L

subgraph Services

S1[Authentication Service]
S2[Inventory Service]
S3[Project Service]
S4[Procurement Service]
S5[Vendor Service]
S6[Reporting Service]
S7[Audit Service]

end

N --> S1
N --> S2
N --> S3
N --> S4
N --> S5
N --> S6
N --> S7

subgraph Firebase

FB1[Firebase Authentication]

FB2[Cloud Firestore]

FB3[Firebase Storage]

FB4[Firebase Security Rules]

end

S1 --> FB1

S2 --> FB2

S3 --> FB2

S4 --> FB2

S5 --> FB2

S6 --> FB2

S7 --> FB2

FB2 --> FB3

FB2 --> FB4

subgraph Business_Modules

BM1[Projects]

BM2[Products]

BM3[Warehouse]

BM4[Inventory]

BM5[Purchase Requisition]

BM6[Purchase Order]

BM7[Goods Receipt]

BM8[Returns]

BM9[Vendor Price Intelligence]

BM10[Reports]

BM11[Audit Logs]

end

FB2 --> BM1
FB2 --> BM2
FB2 --> BM3
FB2 --> BM4
FB2 --> BM5
FB2 --> BM6
FB2 --> BM7
FB2 --> BM8
FB2 --> BM9
FB2 --> BM10
FB2 --> BM11

BM4 --> BM10

BM5 --> BM6

BM6 --> BM7

BM7 --> BM4

BM4 --> BM8

BM8 --> BM4

BM7 --> BM9

BM9 --> BM10

BM10 --> BM11

BM11 --> Z([System Complete])

```

---

# Technology Stack

| Layer | Technology |
|--------|------------|
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router |
| State Management | Context API |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Storage | Firebase Storage |
| Security | Firestore Rules |
| Hosting | Firebase Hosting / Google Cloud |

---

# Core Modules

- Authentication
- Dashboard
- Projects
- Inventory
- Main Warehouse
- Project Inventory
- Purchase Requisition
- Purchase Order
- Goods Receipt Note (GRN)
- Returns Management
- Vendor Management
- Vendor Price Intelligence
- Reports & Analytics
- Audit Logs

---

# Architectural Principles

- Modular Architecture
- Component-Based Design
- Service Layer Abstraction
- Centralized State Management
- Real-time Firestore Synchronization
- Single Source of Truth (Main Warehouse)
- Immutable Stock Ledger
- Role-Based Access Control (RBAC)
- Enterprise-grade Audit Logging

---

# Data Flow

1. User performs an action through the React UI.
2. The request is processed by the appropriate Service Layer.
3. Firebase Authentication validates the user.
4. Firestore Security Rules verify permissions.
5. Firestore performs the database operation.
6. Business Modules update related collections.
7. Inventory and Reports refresh automatically.
8. Audit Logs capture every important transaction.

---

# Benefits

- Scalable architecture
- Real-time synchronization
- Secure authentication
- Modular services
- Easy maintenance
- High performance
- Enterprise-ready design
- Cloud-native deployment
