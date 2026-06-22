# Technical Architecture Documentation

## 1. Project Overview
Enterprise-grade Construction & Inventory Management System designed to handle multi-project scaling, central warehousing, automated procurement intelligence, and daily site reporting. Extensively utilizes React for the interface, Firebase/Firestore for realtime operations, and Tailwind CSS for utility-first styling.

---

## 2. Technology Stack

* **Frontend Framework**: React 19 (via Vite)
* **Language**: TypeScript
* **State Management**: React Hooks (useState, useEffect) + Real-time Firestore subscriptions attached to custom singleton services.
* **Database (Backend-as-a-Service)**: Firebase Firestore
* **Authentication**: Firebase Auth
* **UI/Component Framework**: shadcn/ui (Radix Primitives)
* **Styling**: Tailwind CSS v4
* **Icons**: `lucide-react`
* **Charting**: Recharts
* **PDF/Excel Export**: `jspdf`, `jspdf-autotable`, `xlsx`
* **Document Parsing/Formatting**: `date-fns`, `zod`

---

## 3. Folder Structure Overview

```text
/src
 ├── /components       # Reusable UI parts
 │    ├── /landing     # Public site sub-components
 │    ├── /layout      # Dashboard shell, Sidebar, Header
 │    ├── /ui          # shadcn primitive components (Buttons, Select, Input)
 │    └── (Shared widgets like VendorSelector, MaterialSelector, etc.)
 ├── /data             # Static fallback data, constants, product catalog
 ├── /lib              # Utility configurations
 │    ├── firebase.ts  # Firebase app initialization
 │    └── utils.ts     # classnames / tailwind-merge (cn) helpers
 ├── /pages            # Route-level components (Screens/Views)
 ├── /services         # Firebase abstraction layer
 │    ├── financials.ts# Utility for cost aggregation
 │    └── store.ts     # The core Firebase Database Engine module
 ├── App.tsx           # Global routing & auth provider wrapper
 ├── main.tsx          # Root DOM injection
 └── types.ts          # Central domain models & TS Interfaces
```

---

## 4. Application Architecture

* **Authentication Context**: Handled primarily at the `App.tsx` level using a custom `useAuth()` implementation interacting with Firebase Auth. App routes are gated based on authentication state.
* **Routing**: Implementation uses `react-router-dom`. Views are divided generally into `AuthRoutes` (Login) and `Protected/Dashboard Routes`.
* **Service Layer (`services/store.ts`)**: In order to prevent scattered Firestore queries, all DB operations (CRUD, Transactions) are consolidated inside `store.ts`. Services are organized per-domain (e.g., `ProductService`, `ProjectService`, `PurchaseOrderService`). They expose `subscribe(callback)` methods invoking `onSnapshot` for real-time reactivity, returning cleanup functions.

---

## 5. Firestore Database Architecture

The data architecture is strictly NoSQL, heavily denormalized for read performance. Relational lookups check IDs while duplicating textual names to reduce join-fetching.

### Collections:

* `users`
  * Primary Keys: `uid` (Auth ID).
  * Structure: roles, allowed projects arrays.
* `projects`
  * PK: `id`. Tracks budget, status, progress %, manager.
* `products`
  * PK: `id`. Core catalog item. Holds SKU, uom, threshold logic.
* `vendors`
  * PK: `id`. Ratings, categories, statuses.
* `stocks`
  * PK: `id`. Highly transactional. Joint Key concept `productId_projectId`.
  * Structure: exact real-time balance per project/warehouse.
* `stockMovements`
  * PK: `id`. Unchanging ledger rows. References `productId`, `projectId`, `MovementType`.
* `materialRequirements`
  * PK: `id`. Requisitions generated from site. Array of requested items.
* `purchaseRequisitions` (PR)
  * PK: `id`. Needs Admin/PM approval. Reusable Array structures (`items`).
* `purchaseOrders` (PO)
  * PK: `id`. Linked to PRs. `totalAmount`, `status`. Items include pricing.
* `goodsReceipts` (GRN)
  * PK: `id`. Array of `receivedQuantity` vs `orderedQuantity`.
* `projectReturns` & `returnsToVendor`
  * RTV tracking entities linked via ID to specific PO/Products.
* `dailyReports`
  * DPR tracking. Massive denormalized objects combining stock consumptions, labor maps, work segments, and base64 signatures.
* `materialPriceHistory`
  * Price intelligence rows generated on GRN creation.

---

## 6. Inventory Engine Architecture

The core of the system is the **Stock and Movement Engine**.

1. **Transactional Integrity**: Any stock modification uses Firestore `runTransaction`.
2. **Current Balance calculation**: The `quantity` integer on a `stock` document represents the instantaneous quantity physically resting at that location (Project or Main Warehouse).
3. **Immutability**: `stockMovements` documents are *append-only*.
4. **Site Consumption**: Daily Progress Reports (DPRs) inherently drain site inventory. Submission of a DPR opens a batch/transaction converting `Work items` into `STOCK_OUT` (Consumption) movements. 

---

## 7. Procurement Engine

* **Analysis Hook**: Built-in historical price-check logic.
* **Tolerance**: When a PO generates line items, the system checks the current `unitPrice` against the `averagePrice` fetched from `materialPriceHistory`. If it breaches limits, it flags for higher approval (`PRICE_VERIFICATION_REQUIRED`).

---

## 8. Security Architecture

### Role Validation
* Read-only vs Read-Write operations are gated primarily at the GUI level via checking the global `profile.role` against enums like `['ADMIN', 'STORE_KEEPER']`.
* Component buttons are disabled/hidden accordingly.

*Security rules exist in `firestore.rules` handling backend validations enforcing similar matches on `request.auth.uid` against the requested paths (e.g. `doc.data.managerId == request.auth.uid`).*

---

## 9. Code Optimization Strategies

* **Optimistic UI Data**: Read paths heavily use Firestore's client-side cache caching.
* **Component Lazy-loading potential**: `Router` is segmented.
* **Pagination & Virtualization**: Used via `slice()` or standard JS methodologies within long tables (e.g., Reports Page).
* **Batch Executions**: Large PR & PO operations and dependent record creations are done in a single `.commit()` chunk to Firebase.

---

## 10. External Libraries Justification

* **shadcn/radix**: Offers accessible, high-quality base primitives uncoupled from standard heavy UI libraries (like MUI/Antd), permitting fine-grained Tailwind styling.
* **jspdf / html2canvas / xlsx**: Complete internalization of reporting. No external server required to generate or calculate documents, offloading PDF rendering to the client's browser.
* **recharts**: SVG-based performant charting library integrated cleanly into React lifecycles.
