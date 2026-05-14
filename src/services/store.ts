import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  where,
  getDocs,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType, Product, Project, Vendor, Stock, PurchaseRequisition, PurchaseOrder, GRN, GRNLineItem, Attendance, DailyReport, SiteTask, StockMovement, MovementType, UserProfile, UserRole } from '../types';

export const ProductService = {
  subscribe: (callback: (products: Product[]) => void) => {
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));
  },
  add: async (product: Omit<Product, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
      throw err;
    }
  },
  update: async (id: string, product: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', id), product);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  }
};

export const AttendanceService = {
  subscribe: (callback: (attendance: Attendance[]) => void) => {
    return onSnapshot(collection(db, 'attendance'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));
  },
  add: async (entry: Omit<Attendance, 'id'>) => {
    try {
      await addDoc(collection(db, 'attendance'), entry);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'attendance');
    }
  }
};

export const ProgressService = {
  subscribe: (callback: (reports: DailyReport[]) => void) => {
    return onSnapshot(collection(db, 'dailyReports'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyReport)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'dailyReports'));
  },
  add: async (report: Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'dailyReports'), {
        ...report,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'dailyReports');
      throw err;
    }
  },
  updateStatus: async (id: string, status: DailyReport['status']) => {
    try {
      await updateDoc(doc(db, 'dailyReports', id), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `dailyReports/${id}`);
    }
  }
};

export const TaskService = {
  subscribe: (callback: (tasks: SiteTask[]) => void) => {
    return onSnapshot(collection(db, 'siteTasks'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SiteTask)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'siteTasks'));
  },
  add: async (task: Omit<SiteTask, 'id'>) => {
    try {
      await addDoc(collection(db, 'siteTasks'), {
        ...task,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'siteTasks');
    }
  },
  updateStatus: async (id: string, status: SiteTask['status']) => {
    try {
      await updateDoc(doc(db, 'siteTasks', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `siteTasks/${id}`);
    }
  }
};

export const POService = {
  subscribe: (callback: (orders: PurchaseOrder[]) => void) => {
    return onSnapshot(collection(db, 'purchaseOrders'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'purchaseOrders'));
  },
  add: async (po: Omit<PurchaseOrder, 'id'>) => {
    try {
      await addDoc(collection(db, 'purchaseOrders'), {
        ...po,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'purchaseOrders');
    }
  },
  updateStatus: async (id: string, status: PurchaseOrder['status']) => {
    try {
      await updateDoc(doc(db, 'purchaseOrders', id), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchaseOrders/${id}`);
    }
  }
};

export const PRService = {
  subscribe: (callback: (reqs: PurchaseRequisition[]) => void) => {
    return onSnapshot(collection(db, 'purchaseRequisitions'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseRequisition)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'purchaseRequisitions'));
  },
  add: async (pr: Omit<PurchaseRequisition, 'id'>) => {
    try {
      await addDoc(collection(db, 'purchaseRequisitions'), {
        ...pr,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'purchaseRequisitions');
    }
  },
  updateStatus: async (id: string, status: 'APPROVED' | 'REJECTED', approverId: string) => {
    try {
      await updateDoc(doc(db, 'purchaseRequisitions', id), {
        status,
        approverId,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchaseRequisitions/${id}`);
    }
  }
};

export const ProjectService = {
  subscribe: (callback: (projects: Project[]) => void) => {
    return onSnapshot(collection(db, 'projects'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));
  },
  add: async (project: Omit<Project, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'projects'), project);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'projects');
      throw err;
    }
  }
};

export const VendorService = {
  subscribe: (callback: (vendors: Vendor[]) => void) => {
    return onSnapshot(collection(db, 'vendors'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vendors'));
  },
  add: async (vendor: Omit<Vendor, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'vendors'), {
        ...vendor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vendors');
      throw err;
    }
  }
};

export const GRNService = {
  subscribe: (callback: (grns: GRN[]) => void) => {
    return onSnapshot(collection(db, 'grns'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GRN)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'grns'));
  },
  create: async (grn: Omit<GRN, 'id'>) => {
    try {
      await addDoc(collection(db, 'grns'), {
        ...grn,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'grns');
    }
  },
  updateStatus: async (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL') => {
    try {
      await updateDoc(doc(db, 'grns', id), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `grns/${id}`);
    }
  }
};

export const MovementService = {
  subscribe: (callback: (movements: StockMovement[]) => void) => {
    return onSnapshot(collection(db, 'stockMovements'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stockMovements'));
  }
};

export const UserService = {
  subscribe: (callback: (users: UserProfile[]) => void) => {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ ...d.data() } as UserProfile)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
  },
  updateRole: async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },
  updateAssignedProjects: async (uid: string, projectIds: string[]) => {
    try {
      await updateDoc(doc(db, 'users', uid), { assignedProjects: projectIds });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },
  createProfile: async (profile: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', profile.uid), profile);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${profile.uid}`);
    }
  }
};

export const InventoryService = {
  subscribe: (callback: (stocks: Stock[]) => void) => {
    return onSnapshot(collection(db, 'stocks'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stock)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stocks'));
  },

  // CORE: GRN Approval Transaction
  approveGRN: async (grnId: string, approvedBy: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        const grnRef = doc(db, 'grns', grnId);
        const grnSnap = await transaction.get(grnRef);
        
        if (!grnSnap.exists()) throw new Error("GRN does not exist");
        const grn = grnSnap.data() as GRN;
        if (grn.status === 'APPROVED') return;

        const poRef = doc(db, 'purchaseOrders', grn.poId);
        const poSnap = await transaction.get(poRef);
        if (!poSnap.exists()) throw new Error("Purchase Order not found");
        const po = poSnap.data() as PurchaseOrder;

        // Collect all stock snapshots before any writes
        const stockData = [];
        for (const item of grn.items) {
          const stockId = `${grn.projectId}_${item.productId}`;
          const stockRef = doc(db, 'stocks', stockId);
          const stockSnap = await transaction.get(stockRef);
          stockData.push({ item, stockRef, stockSnap, stockId });
        }

        // --- WRITE PHASE ---
        transaction.update(grnRef, { 
          status: 'APPROVED', 
          approvedBy, 
          updatedAt: serverTimestamp() 
        });

        const updatedPoItems = [...(po.items || [])];

        for (const { item, stockRef, stockSnap, stockId } of stockData) {
          const receivedQty = item.receivedQuantity;
          
          // Update PO item received quantity
          const poItemIdx = updatedPoItems.findIndex(i => i.productId === item.productId);
          if (poItemIdx > -1) {
            updatedPoItems[poItemIdx].quantityReceived = (updatedPoItems[poItemIdx].quantityReceived || 0) + receivedQty;
          }

          if (stockSnap.exists()) {
            const currentQty = stockSnap.data()?.quantity || 0;
            transaction.update(stockRef, { 
              quantity: currentQty + receivedQty,
              lastUpdated: new Date().toISOString()
            });
          } else {
            transaction.set(stockRef, {
              id: stockId,
              productId: item.productId,
              projectId: grn.projectId,
              quantity: receivedQty,
              lastUpdated: new Date().toISOString()
            });
          }

          // Create Stock Movement Log
          const movementRef = doc(collection(db, 'stockMovements'));
          transaction.set(movementRef, {
            id: movementRef.id,
            productId: item.productId,
            projectId: grn.projectId,
            type: 'IN',
            quantity: receivedQty,
            referenceId: grnId,
            referenceType: 'GRN',
            userId: approvedBy,
            createdAt: new Date().toISOString()
          });
        }

        // Update the PO with new quantities and check if fully completed
        const allItemsReceived = updatedPoItems.every(i => (i.quantityReceived || 0) >= i.quantityOrdered);
        transaction.update(poRef, {
          items: updatedPoItems,
          status: allItemsReceived ? 'COMPLETED' : 'PARTIAL',
          updatedAt: serverTimestamp()
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `grns/${grnId}/approve`);
    }
  },

  adjustStock: async (params: { 
    productId: string, 
    projectId: string, 
    newQuantity: number, 
    userId: string, 
    remarks: string 
  }) => {
    try {
      await runTransaction(db, async (transaction) => {
        const stockId = `${params.projectId}_${params.productId}`;
        const stockRef = doc(db, 'stocks', stockId);
        const stockSnap = await transaction.get(stockRef);
        
        const oldQuantity = stockSnap.exists() ? stockSnap.data().quantity : 0;
        const adjustmentAmount = params.newQuantity - oldQuantity;

        // 1. Update or create stock record
        if (stockSnap.exists()) {
          transaction.update(stockRef, {
            quantity: params.newQuantity,
            lastUpdated: new Date().toISOString()
          });
        } else {
          transaction.set(stockRef, {
            id: stockId,
            productId: params.productId,
            projectId: params.projectId,
            quantity: params.newQuantity,
            lastUpdated: new Date().toISOString()
          });
        }

        // 2. Log movement
        const movementRef = doc(collection(db, 'stockMovements'));
        transaction.set(movementRef, {
          id: movementRef.id,
          productId: params.productId,
          projectId: params.projectId,
          type: MovementType.ADJUSTMENT,
          quantity: adjustmentAmount,
          userId: params.userId,
          remarks: params.remarks,
          createdAt: new Date().toISOString()
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stocks/${params.projectId}_${params.productId}/adjust`);
    }
  },

  issueStock: async (params: { 
    productId: string, 
    projectId: string, 
    issueQuantity: number, 
    userId: string, 
    remarks: string 
  }) => {
    try {
      await runTransaction(db, async (transaction) => {
        const stockId = `${params.projectId}_${params.productId}`;
        const stockRef = doc(db, 'stocks', stockId);
        const stockSnap = await transaction.get(stockRef);
        
        if (!stockSnap.exists()) throw new Error("Stock not found");
        const currentQty = stockSnap.data().quantity || 0;
        
        if (currentQty < params.issueQuantity) throw new Error("Insufficient stock");

        // 1. Update stock record
        transaction.update(stockRef, {
          quantity: currentQty - params.issueQuantity,
          lastUpdated: new Date().toISOString()
        });

        // 2. Log movement
        const movementRef = doc(collection(db, 'stockMovements'));
        transaction.set(movementRef, {
          id: movementRef.id,
          productId: params.productId,
          projectId: params.projectId,
          type: MovementType.OUT,
          quantity: -params.issueQuantity,
          userId: params.userId,
          remarks: params.remarks,
          createdAt: new Date().toISOString()
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stocks/${params.projectId}_${params.productId}/issue`);
      throw err;
    }
  }
};
