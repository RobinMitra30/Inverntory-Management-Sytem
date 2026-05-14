export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SITE_SUPERVISOR = 'SITE_SUPERVISOR',
  QUALITY_ENGINEER = 'QUALITY_ENGINEER',
  STORE_KEEPER = 'STORE_KEEPER',
  ACCOUNTANT = 'ACCOUNTANT',
  SAFETY_OFFICER = 'SAFETY_OFFICER'
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  assignedProjects: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  budget: number;
  managerId: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
  isDemo?: boolean;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
  categories: string[];
  rating: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  uom: string;
  lowStockThreshold: number;
  description: string;
  unitPrice: number;
}

export interface Stock {
  id: string;
  productId: string;
  projectId: string;
  warehouseId?: string;
  quantity: number;
  lastUpdated: string;
}

export interface LineItem {
  productId: string;
  quantity: number;
  estimatedPrice: number;
  quantityReceived?: number;
}

export interface PurchaseRequisition {
  id?: string;
  projectId: string;
  requesterId: string;
  vendorId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  items: LineItem[];
  totalEstimatedAmount: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  approverId?: string;
  remarks?: string;
  createdAt: string;
}

export interface POLineItem {
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prId?: string;
  vendorId: string;
  projectId: string;
  status: 'PENDING' | 'APPROVED' | 'READY_FOR_PICKUP' | 'SHIPPED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  items: POLineItem[];
  taxPercent: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
}

export interface GRNLineItem {
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  qcStatus: 'PASSED' | 'FAILED';
}

export interface GRN {
  id: string;
  grnNumber: string;
  poId: string;
  projectId: string;
  vendorId: string;
  challanNumber: string;
  challanUrl?: string;
  items: GRNLineItem[];
  qcStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'PARTIAL';
  qcRemarks?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  receivedBy: string;
  approvedBy?: string;
  siteLocation: string;
  createdAt: string;
}

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT'
}

export interface StockMovement {
  id: string;
  productId: string;
  projectId: string;
  type: MovementType;
  quantity: number;
  referenceId?: string;
  referenceType?: string;
  userId: string;
  remarks?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  projectId: string;
  date: string;
  workerName: string;
  workerType: 'LABOR' | 'SUPERVISOR' | 'CONTRACTOR';
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY';
  shift: 'DAY' | 'NIGHT';
  remarks?: string;
  markedBy: string;
}

export interface StockDetail {
  productId: string;
  receivedQuantity: number;
  usedQuantity: number;
  remainingBalance: number;
}

export interface WorkDetail {
  workType: string;
  totalWork: number;
  unitOfWork: string;
  todayWork: number;
  balanceWork: number;
  progressPercent: number;
  drawingReceived: boolean;
}

export interface WorkTimeline {
  workType: string;
  startDate: string;
  endDate: string;
  completionDay?: string;
  remark?: string;
}

export interface WorkerDetail {
  workType: string;
  contractorName: string;
  skilledWorkers: number;
  nonSkilledWorkers: number;
  requiredWorkers: number;
}

export interface DailyReport {
  id: string;
  projectId: string;
  projectName?: string;
  siteInchargeName?: string;
  date: string;
  supervisorId: string;
  supervisorName?: string;
  stockDetails: StockDetail[];
  workDetails: WorkDetail[];
  workTimelines: WorkTimeline[];
  workerDetails: WorkerDetail[];
  issues: string;
  photoUrls: string[];
  signature: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED';
  createdAt: string;
  updatedAt?: string;
  pdfUrl?: string;
}

export interface SiteTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  createdBy: string;
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
