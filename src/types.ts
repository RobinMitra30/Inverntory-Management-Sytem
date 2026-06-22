export const MAIN_WAREHOUSE_PROJECT_ID = 'MAIN_WAREHOUSE';

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
  subcategory: string;
  uom: string;
  minStockLevel: number;
  description: string;
  unitPrice: number;
  hsnCode: string;
  materialType: string;
}

export interface Stock {
  id: string;
  productId: string;
  projectId: string;
  warehouseId?: string;
  quantity: number;
  reservedQuantity?: number;
  incomingQuantity?: number;
  lastUpdated: string;
}

export interface LineItem {
  productId: string;
  quantity: number;
  estimatedPrice: number;
  quantityReceived?: number;
}

export interface PRComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  type: 'INTERNAL' | 'APPROVAL' | 'REJECTION' | 'CHANGE_REQUEST';
  createdAt: string;
}

export interface PRAttachment {
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface MaterialRequisition {
  id: string;
  rqNumber: string;
  projectId: string;
  projectName: string;
  requesterId: string;
  requesterName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED';
  items: {
    productId: string;
    productName: string;
    quantityRequested: number;
    quantityIssued?: number;
  }[];
  remarks?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PRAuditLog {
  id: string;
  field: string;
  oldValue: any;
  newValue: any;
  userId: string;
  userName: string;
  timestamp: string;
  reason?: string;
}

export interface PurchaseRequisition {
  id?: string;
  projectId: string;
  requesterId: string;
  requesterName?: string;
  vendorId?: string;
  linkedMrId?: string;
  linkedMrNumber?: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'PM_APPROVED' | 'ADMIN_APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO' | 'CHANGES_REQUESTED' | 'PENDING_APPROVAL';
  items: LineItem[];
  totalEstimatedAmount: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  approverId?: string;
  pmApproverId?: string;
  adminApproverId?: string;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
  history?: Array<{
    status: string;
    userId: string;
    userName: string;
    timestamp: string;
    notes?: string;
  }>;
  auditLogs?: PRAuditLog[];
  comments?: PRComment[];
  attachments?: PRAttachment[];
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
  linkedMrNumber?: string;
  vendorId: string;
  projectId: string;
  status: 'DRAFT' | 'PENDING' | 'PRICE_VERIFICATION_REQUIRED' | 'APPROVED' | 'SHIPPED' | 'PARTIAL_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'REJECTED' | 'CANCELLED';
  items: POLineItem[];
  taxPercent: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
  priceVerification?: {
    highestPercentageIncrease: number;
    reason?: string;
    approvedBy?: string;
    approvalTime?: string;
    flaggedItems?: {
      productId: string;
      productName: string;
      currentPrice: number;
      previousPrice: number;
      percentageIncrease: number;
    }[];
  };
}

export enum ReceiptType {
  VENDOR_TO_WAREHOUSE = 'VENDOR_TO_WAREHOUSE',
  WAREHOUSE_TRANSFER = 'WAREHOUSE_TRANSFER',
  DIRECT_SITE_DELIVERY = 'DIRECT_SITE_DELIVERY'
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
  receiptType: ReceiptType;
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
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  PURCHASE_ENTRY = 'PURCHASE_ENTRY',
  GRN_ENTRY = 'GRN_ENTRY',
  MATERIAL_ISSUE = 'MATERIAL_ISSUE',
  SITE_TRANSFER = 'SITE_TRANSFER',
  RETURN_TO_STORE = 'RETURN_TO_STORE',
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  DAMAGE_ENTRY = 'DAMAGE_ENTRY',
  SCRAP_ENTRY = 'SCRAP_ENTRY',
  ADJUSTMENT_ENTRY = 'ADJUSTMENT_ENTRY',
  CONSUMPTION_ENTRY = 'CONSUMPTION_ENTRY',
  STOCK_RESERVED = 'STOCK_RESERVED',
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  ISSUE_TO_SITE = 'ISSUE_TO_SITE',
  RETURN_REQUEST = 'RETURN_REQUEST',
  RETURN_APPROVED = 'RETURN_APPROVED',
  RETURN_TO_WAREHOUSE = 'RETURN_TO_WAREHOUSE',
  DAMAGED_RETURN = 'DAMAGED_RETURN',
  EXCESS_RETURN = 'EXCESS_RETURN',
  MATERIAL_REQUEST = 'MATERIAL_REQUEST',
  MR_APPROVED = 'MR_APPROVED',
  MR_REJECTED = 'MR_REJECTED',
  PR_CREATED = 'PR_CREATED',
  PR_APPROVED = 'PR_APPROVED',
  PR_REJECTED = 'PR_REJECTED',
  PO_CREATED = 'PO_CREATED',
  INCOMING_STOCK = 'INCOMING_STOCK',
  DIRECT_SITE_DELIVERY = 'DIRECT_SITE_DELIVERY',
  DIRECT_SITE_DELIVERY_VIRTUAL = 'DIRECT_SITE_DELIVERY_VIRTUAL',
  WAREHOUSE_RECEIPT = 'WAREHOUSE_RECEIPT',
  EMERGENCY_PROCUREMENT = 'EMERGENCY_PROCUREMENT',
  WAREHOUSE_FULFILLMENT = 'WAREHOUSE_FULFILLMENT',
  DIRECT_WAREHOUSE_ISSUE = 'DIRECT_WAREHOUSE_ISSUE',
  OPENING_STOCK = 'OPENING_STOCK',
  MANUAL_ADDITION = 'MANUAL_ADDITION',
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
  STOCK_CORRECTION = 'STOCK_CORRECTION',
  VENDOR_DIRECT_ENTRY = 'VENDOR_DIRECT_ENTRY',
  IN = 'IN', // Legacy
  OUT = 'OUT', // Legacy
  ADJUSTMENT = 'ADJUSTMENT' // Legacy
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  projectId: string;
  projectName: string;
  type: MovementType;
  quantity: number; // Positive for IN, Negative for OUT
  currentStock: number; // Balance after movement
  location?: string;
  department?: string;
  userName: string;
  userId: string;
  referenceId?: string;
  referenceType?: string;
  referenceNumber?: string;
  sourceProjectId?: string;
  sourceProjectName?: string;
  destinationProjectId?: string;
  destinationProjectName?: string;
  remarks?: string;
  createdAt: string;
}

export interface ReturnToStore {
  id: string;
  returnNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  projectId: string;
  projectName: string;
  department: string;
  employeeName: string;
  condition: 'GOOD' | 'DAMAGED' | 'UNUSABLE';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  imageUrls?: string[];
  createdAt: string;
}

export interface ReturnToVendor {
  id: string;
  rtvNumber: string;
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  quantity: number;
  projectId: string;
  projectName: string;
  reason: string;
  damageStatus: boolean;
  poRef?: string;
  grnRef?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  imageUrls?: string[];
  createdAt: string;
}

export interface ProjectReturn {
  id: string;
  returnNumber: string;
  projectId: string;
  projectName: string;
  productId: string;
  productName: string;
  issuedQuantity: number;
  currentSiteStock: number;
  returnQuantity: number;
  returnType: 'UNUSED_MATERIAL' | 'EXCESS_MATERIAL' | 'DAMAGED_MATERIAL' | 'WRONG_MATERIAL';
  condition: string;
  remarks: string;
  photoUrls: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'WAREHOUSE_REVIEW' | 'APPROVED' | 'RETURNED' | 'REJECTED';
  requesterId: string;
  requesterName: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewRemarks?: string;
  approvedQuantity?: number;
  createdAt: string;
  updatedAt: string;
  history: Array<{
    status: string;
    userId: string;
    userName: string;
    timestamp: string;
    notes?: string;
  }>;
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
  comments?: Array<{
    id: string;
    text: string;
    createdBy: string;
    createdAt: string;
  }>;
}

export interface ProjectIssue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: 'MATERIAL' | 'LABOR' | 'WEATHER' | 'MACHINERY' | 'SAFETY' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'RESOLVED';
  reportedBy: string;
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface MaterialPriceHistoryRecord {
  id: string;
  materialId: string;
  materialName: string;
  sku: string;
  vendorId: string;
  vendorName: string;
  projectId: string;
  projectName: string;
  poNumber: string;
  poId: string;
  grnNumber: string;
  grnId: string;
  purchaseDate: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  currency: string;
  createdBy: string;
  createdAt: string;
}

export interface MRLineItem {
  productId: string;
  productName: string;
  quantityRequested: number;
  quantityAvailable?: number;
  shortage?: number;
  warehouseStock?: number;
  warehouseFulfillmentQuantity?: number;
  procurementQuantity?: number;
  fulfillmentType?: 'FULL_WAREHOUSE' | 'PARTIAL_PROCUREMENT' | 'FULL_PROCUREMENT';
}

export interface MaterialRequirement {
  id: string;
  mrNumber: string;
  projectId: string;
  projectName: string;
  requesterId: string;
  requesterName: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  fulfillmentStatus?: 'FULFILLABLE' | 'SHORTAGE' | 'PARTIAL';
  approvalRemarks?: string;
  approvedBy?: string;
  approvedAt?: string;
  items: MRLineItem[];
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
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
