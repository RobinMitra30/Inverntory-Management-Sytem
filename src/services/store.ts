import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError } from '../lib/error-handler';
import { cleanObject } from '../lib/utils';
import { OperationType, Product, Project, Vendor, Stock, PurchaseRequisition, MaterialRequisition, PurchaseOrder, GRN, GRNLineItem, DailyReport, SiteTask, StockMovement, MovementType, UserProfile, UserRole, ReturnToStore, ReturnToVendor, ProjectReturn, ProjectIssue, MAIN_WAREHOUSE_PROJECT_ID } from '../types';

async function logMovement(transaction: any, params: {
  productId: string,
  projectId: string,
  type: MovementType,
  quantity: number,
  currentStock: number,
  userId: string,
  userName: string,
  referenceId?: string,
  referenceType?: string,
  referenceNumber?: string,
  sourceProjectId?: string,
  sourceProjectName?: string,
  destinationProjectId?: string,
  destinationProjectName?: string,
  remarks?: string,
  location?: string,
  department?: string
}, product?: Product, project?: Project) {
  const movementRef = doc(collection(db, 'stockMovements'));
  transaction.set(movementRef, cleanObject({
    id: movementRef.id,
    productId: params.productId,
    productName: product?.name || 'Unknown',
    sku: product?.sku || 'Unknown',
    projectId: params.projectId,
    projectName: project?.name || 'Unknown',
    type: params.type,
    quantity: params.quantity,
    currentStock: params.currentStock,
    userId: params.userId,
    userName: params.userName,
    referenceId: params.referenceId,
    referenceType: params.referenceType,
    referenceNumber: params.referenceNumber,
    sourceProjectId: params.sourceProjectId,
    sourceProjectName: params.sourceProjectName,
    destinationProjectId: params.destinationProjectId,
    destinationProjectName: params.destinationProjectName,
    remarks: params.remarks,
    location: params.location,
    department: params.department,
    createdAt: new Date().toISOString()
  }));
}

export const ProductService = {
  subscribe: (callback: (products: Product[]) => void) => {
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));
  },
  add: async (product: Omit<Product, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'products'), cleanObject({
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
      throw err;
    }
  },
  batchAdd: async (products: Omit<Product, 'id'>[]) => {
    try {
      const batch = writeBatch(db);
      for (const product of products) {
        const docRef = doc(collection(db, 'products'));
        batch.set(docRef, cleanObject({
          ...product,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
      throw err;
    }
  },
  update: async (id: string, product: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', id), cleanObject(product));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  },
  delete: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  },
  batchDelete: async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'products', id));
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'products/batch');
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
      const docRef = await addDoc(collection(db, 'dailyReports'), cleanObject({
        ...report,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
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
      await addDoc(collection(db, 'siteTasks'), cleanObject({
        ...task,
        createdAt: new Date().toISOString()
      }));
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
  },
  update: async (id: string, task: Partial<SiteTask>) => {
    try {
      await updateDoc(doc(db, 'siteTasks', id), cleanObject(task));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `siteTasks/${id}`);
    }
  },
  remove: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'siteTasks', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `siteTasks/${id}`);
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
      await addDoc(collection(db, 'purchaseOrders'), cleanObject({
        ...po,
        createdAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'purchaseOrders');
    }
  },
  update: async (id: string, updates: Partial<PurchaseOrder>) => {
    try {
      await updateDoc(doc(db, 'purchaseOrders', id), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'purchaseOrders');
      throw err;
    }
  },
  updateStatus: async (po: PurchaseOrder, status: PurchaseOrder['status'], additionalUpdates: any = {}) => {
    try {
      const batch = writeBatch(db);
      const poRef = doc(db, 'purchaseOrders', po.id!);
      
      batch.update(poRef, {
        status,
        updatedAt: new Date().toISOString(),
        ...additionalUpdates
      });

      if (status === 'APPROVED') {
        const productIds = po.items.map(i => i.productId);
        
        // Fetch existing stocks for the Main Warehouse and these products
        const stockSnapshots = await Promise.all(
          Array.from({ length: Math.ceil(productIds.length / 10) }, (_, i) =>
            getDocs(query(
              collection(db, 'stocks'),
              where('projectId', '==', MAIN_WAREHOUSE_PROJECT_ID),
              where('productId', 'in', productIds.slice(i * 10, i * 10 + 10))
            ))
          )
        );

        const warehouseStockDocs: Record<string, any> = {};
        stockSnapshots.forEach(snap => {
          snap.forEach(doc => {
            warehouseStockDocs[doc.data().productId] = { id: doc.id, ...doc.data() };
          });
        });

        // Fetch products details for full-featured stock movement records
        const productSnapshots = await Promise.all(
          Array.from({ length: Math.ceil(productIds.length / 10) }, (_, i) =>
            getDocs(query(
              collection(db, 'products'),
              where('__name__', 'in', productIds.slice(i * 10, i * 10 + 10))
            ))
          )
        );
        const productsDict: Record<string, any> = {};
        productSnapshots.forEach(snap => {
          snap.forEach(doc => {
            productsDict[doc.id] = doc.data();
          });
        });

        for (const item of po.items) {
          const prod = productsDict[item.productId];
          const stockData = warehouseStockDocs[item.productId];
          if (stockData) {
            const stockRef = doc(db, 'stocks', stockData.id);
            const currentIncoming = stockData.incomingQuantity || 0;
            batch.update(stockRef, {
              incomingQuantity: currentIncoming + item.quantityOrdered,
              lastUpdated: new Date().toISOString()
            });
          } else {
            // Need to create warehouse stock entry if it doesn't exist
            const newStockRef = doc(collection(db, 'stocks'));
            batch.set(newStockRef, {
              projectId: MAIN_WAREHOUSE_PROJECT_ID,
              productId: item.productId,
              quantity: 0,
              reservedQuantity: 0,
              incomingQuantity: item.quantityOrdered,
              lastUpdated: new Date().toISOString()
            });
          }

          // Create stock movement ledger record (Incoming Stock, Immutable, Timestamped, User Tracked, Project Linked, Material Linked)
          const movementRef = doc(collection(db, 'stockMovements'));
          batch.set(movementRef, {
            id: movementRef.id,
            productId: item.productId,
            productName: prod?.name || 'Unknown Product',
            sku: prod?.sku || 'N/A',
            projectId: MAIN_WAREHOUSE_PROJECT_ID,
            projectName: 'Main Warehouse',
            type: MovementType.INCOMING_STOCK,
            quantity: item.quantityOrdered,
            currentStock: (stockData?.quantity || 0),
            userName: auth.currentUser?.displayName || 'System Approver',
            userId: auth.currentUser?.uid || 'system',
            referenceId: po.id,
            referenceType: 'PURCHASE_ORDER',
            referenceNumber: po.poNumber,
            remarks: `PO Approved. Incoming stock logged to Main Warehouse.`,
            createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchaseOrders/${po.id}`);
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
      const docRef = await addDoc(collection(db, 'purchaseRequisitions'), cleanObject({
        ...pr,
        createdAt: new Date().toISOString()
      }));
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'purchaseRequisitions');
      return null;
    }
  },
  update: async (id: string, data: Partial<PurchaseRequisition>) => {
    try {
      await updateDoc(doc(db, 'purchaseRequisitions', id), cleanObject({
        ...data,
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchaseRequisitions/${id}`);
    }
  },
  updateStatus: async (id: string, status: string, userId: string, userName: string, notes?: string) => {
    try {
      const prRef = doc(db, 'purchaseRequisitions', id);
      const prSnap = await getDoc(prRef);
      if (!prSnap.exists()) throw new Error('PR not found');
      const pr = prSnap.data() as PurchaseRequisition;
      const history = (pr.history || []) as any[];
      
      const updates: any = {
        status,
        updatedAt: new Date().toISOString(),
        history: [...history, cleanObject({
          status,
          userId,
          userName,
          timestamp: new Date().toISOString(),
          notes
        })]
      };

      // Set explicit approver IDs based on status transition
      if (status === 'UNDER_REVIEW') {
        // No specific approver set yet
      } else if (status === 'PM_APPROVED') {
        updates.pmApproverId = userId;
      } else if (status === 'ADMIN_APPROVED') {
        updates.adminApproverId = userId;
        updates.approverId = userId; // Legacy support
      }

      await updateDoc(prRef, cleanObject(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchaseRequisitions/${id}`);
    }
  },
  updateWithAudit: async (id: string, updates: Partial<PurchaseRequisition>, auditLogs: any[]) => {
    try {
      const prRef = doc(db, 'purchaseRequisitions', id);
      await updateDoc(prRef, cleanObject({
        ...updates,
        auditLogs: arrayUnion(...auditLogs.map(log => cleanObject(log))),
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchaseRequisitions/${id}`);
    }
  },
  reserveStock: async (prId: string, userId: string, userName: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const prRef = doc(db, 'purchaseRequisitions', prId);
        const prSnap = await transaction.get(prRef);
        if (!prSnap.exists()) throw new Error('PR not found');
        const pr = prSnap.data() as PurchaseRequisition;

        for (const item of pr.items) {
          const stockId = `${MAIN_WAREHOUSE_PROJECT_ID}_${item.productId}`;
          const stockRef = doc(db, 'stocks', stockId);
          const stockSnap = await transaction.get(stockRef);
          
          if (stockSnap.exists()) {
            const stock = stockSnap.data();
            const physicalStock = stock.quantity || 0;
            const currentReserved = stock.reservedQuantity || 0;
            const available = Math.max(0, physicalStock - currentReserved);
            
            // Fulfillment formula: MIN(warehouseStock, requestedQuantity)
            const fulfillmentQty = Math.min(available, item.quantity);
            
            if (fulfillmentQty > 0) {
              transaction.update(stockRef, {
                reservedQuantity: currentReserved + fulfillmentQty,
                lastUpdated: new Date().toISOString()
              });

              // Log reservation
              const productSnap = await transaction.get(doc(db, 'products', item.productId));
              const projectSnap = await transaction.get(doc(db, 'projects', pr.projectId));
              
              await logMovement(transaction, {
                productId: item.productId,
                projectId: MAIN_WAREHOUSE_PROJECT_ID,
                type: MovementType.STOCK_RESERVED,
                quantity: fulfillmentQty,
                currentStock: physicalStock,
                userId,
                userName,
                referenceId: prId,
                referenceType: 'PURCHASE_REQUISITION',
                remarks: `Quantity reserved for PR fulfillment (Part of partial procurement logic)`
              }, productSnap.exists() ? productSnap.data() as Product : undefined, projectSnap.exists() ? projectSnap.data() as Project : undefined);
            }
          }
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `PR Stock Reservation Failed`);
      throw err;
    }
  },
  fulfillFromWarehouse: async (prId: string, userId: string, userName: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        const prRef = doc(db, 'purchaseRequisitions', prId);
        const prSnap = await transaction.get(prRef);
        if (!prSnap.exists()) throw new Error('PR not found');
        const pr = prSnap.data() as PurchaseRequisition;
        
        const projectSnap = await transaction.get(doc(db, 'projects', pr.projectId));
        const projectName = projectSnap.exists() ? projectSnap.data().name : 'Unknown';

        const itemContexts = [];
        for (const item of pr.items) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await transaction.get(productRef);
          const product = productSnap.exists() ? productSnap.data() as Product : null;

          const whStockId = `${MAIN_WAREHOUSE_PROJECT_ID}_${item.productId}`;
          const whStockRef = doc(db, 'stocks', whStockId);
          const whStockSnap = await transaction.get(whStockRef);

          const siteStockId = `${pr.projectId}_${item.productId}`;
          const siteStockRef = doc(db, 'stocks', siteStockId);
          const siteStockSnap = await transaction.get(siteStockRef);

          itemContexts.push({
            item,
            product,
            whStockId,
            whStockRef,
            whStockSnap,
            siteStockId,
            siteStockRef,
            siteStockSnap
          });
        }

        // --- WRITE PHASE ---
        let allFulfilled = true;
        for (const ctx of itemContexts) {
          const { item, product, whStockId, whStockRef, whStockSnap, siteStockId, siteStockRef, siteStockSnap } = ctx;
          if (!product) continue;

          const whStock = whStockSnap.exists() ? whStockSnap.data() : { quantity: 0, reservedQuantity: 0 };
          const whQty = whStock.quantity || 0;
          const reserved = whStock.reservedQuantity || 0;
          
          // Fulfillment formula: MIN(warehouseStock, requestedQuantity)
          // Note: we check total physical stock here, but in practice we usually respect available (stock - other_reserved)
          // However, if the stock was ALREADY reserved for THIS PR, we should include that reservation.
          // Since it's hard to track which reservation belongs to which PR without a sub-collection,
          // we use the simpler logic: Issue what's physically there, up to the requested量.
          const issueQty = Math.min(whQty, item.quantity);
          
          if (issueQty <= 0) {
            allFulfilled = false;
            continue;
          }

          if (issueQty < item.quantity) {
            allFulfilled = false;
          }

          // 1. Reduce Warehouse Stock and Reservation
          const newWhQty = whQty - issueQty;
          const newWhReserved = Math.max(0, reserved - issueQty);

          transaction.set(whStockRef, {
            id: whStockId,
            productId: item.productId,
            projectId: MAIN_WAREHOUSE_PROJECT_ID,
            quantity: newWhQty,
            reservedQuantity: newWhReserved,
            lastUpdated: new Date().toISOString()
          }, { merge: true });

          // 2. Increase Site Stock
          const siteQty = siteStockSnap.exists() ? siteStockSnap.data().quantity : 0;
          const newSiteQty = siteQty + issueQty;

          transaction.set(siteStockRef, {
            id: siteStockId,
            productId: item.productId,
            projectId: pr.projectId,
            quantity: newSiteQty,
            lastUpdated: new Date().toISOString()
          }, { merge: true });

          // 3. Log Movements
          // Out from Warehouse
          const whMovRef = doc(collection(db, "stockMovements"));
          transaction.set(whMovRef, cleanObject({
            id: whMovRef.id,
            productId: item.productId,
            productName: product.name,
            sku: product.sku,
            projectId: MAIN_WAREHOUSE_PROJECT_ID,
            projectName: 'Main Warehouse',
            type: MovementType.DIRECT_WAREHOUSE_ISSUE,
            quantity: -issueQty,
            currentStock: newWhQty,
            userId,
            userName,
            referenceId: prId,
            referenceType: 'PURCHASE_REQUISITION',
            referenceNumber: pr.id?.slice(0, 8),
            destinationProjectId: pr.projectId,
            destinationProjectName: projectName,
            remarks: `Warehouse Issue for PR Fulfillment. Qty: ${issueQty}`,
            createdAt: new Date().toISOString()
          }));

          // In to Site
          const siteMovRef = doc(collection(db, "stockMovements"));
          transaction.set(siteMovRef, cleanObject({
            id: siteMovRef.id,
            productId: item.productId,
            productName: product.name,
            sku: product.sku,
            projectId: pr.projectId,
            projectName: projectName,
            type: MovementType.STOCK_IN,
            quantity: issueQty,
            currentStock: newSiteQty,
            userId,
            userName,
            referenceId: prId,
            referenceType: 'PURCHASE_REQUISITION',
            referenceNumber: pr.id?.slice(0, 8),
            sourceProjectId: MAIN_WAREHOUSE_PROJECT_ID,
            sourceProjectName: 'Main Warehouse',
            remarks: `Received from Main Warehouse (PR Fulfillment)`,
            createdAt: new Date().toISOString()
          }));
        }

        // 4. Update PR Status
        // If all fulfilled or partially, update history
        transaction.update(prRef, {
          status: allFulfilled ? 'CONVERTED_TO_PO' : pr.status, // We use CONVERTED_TO_PO as 'Closed' status for now
          updatedAt: new Date().toISOString(),
          history: arrayUnion({
            status: allFulfilled ? 'WAREHOUSE_FULFILLMENT_COMPLETED' : 'PARTIAL_WAREHOUSE_ISSUE',
            userId,
            userName,
            timestamp: new Date().toISOString(),
            notes: allFulfilled ? 'Fully fulfilled from warehouse inventory.' : 'Partially issued from warehouse inventory.'
          })
        });

        // 5. Create Audit Log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          id: auditRef.id,
          type: allFulfilled ? 'WAREHOUSE_FULFILLMENT_COMPLETED' : 'PARTIAL_WAREHOUSE_ISSUE',
          prId: prId,
          projectId: pr.projectId,
          projectName: projectName,
          userId,
          userName,
          timestamp: new Date().toISOString()
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `PR Fulfillment Failed`);
      throw err;
    }
  }
};

export const MaterialRequisitionService = {
  subscribe: (callback: (reqs: MaterialRequisition[]) => void) => {
    return onSnapshot(collection(db, 'materialRequisitions'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialRequisition)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'materialRequisitions'));
  },
  add: async (rq: Omit<MaterialRequisition, 'id'>) => {
    try {
      await addDoc(collection(db, 'materialRequisitions'), cleanObject({
        ...rq,
        createdAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'materialRequisitions');
      throw err;
    }
  },
  updateStatus: async (id: string, status: 'APPROVED' | 'REJECTED', approverId: string) => {
    try {
      await updateDoc(doc(db, 'materialRequisitions', id), {
        status,
        approvedBy: approverId,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `materialRequisitions/${id}`);
      throw err;
    }
  },
  issueRequisition: async (requisition: MaterialRequisition, userId: string, userName: string) => {
    try {
      // 1. Loop through items and issue stock
      for (const item of requisition.items) {
        await InventoryService.issueStock({
          productId: item.productId,
          fromProjectId: MAIN_WAREHOUSE_PROJECT_ID,
          toProjectId: requisition.projectId,
          issueQuantity: item.quantityRequested,
          userId: userId,
          userName: userName,
          remarks: `Issued against Requisition: ${requisition.rqNumber}`,
          department: 'WAREHOUSE'
        });
      }

      // 2. Mark requisition as issued
      await updateDoc(doc(db, 'materialRequisitions', requisition.id), {
        status: 'ISSUED',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `materialRequisitions/${requisition.id}/issue`);
      throw err;
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
      const docRef = await addDoc(collection(db, 'projects'), cleanObject(project));
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
      const docRef = await addDoc(collection(db, 'vendors'), cleanObject({
        ...vendor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vendors');
      throw err;
    }
  }
};

export const MaterialPriceHistoryService = {
  subscribe: (callback: (records: any[]) => void) => {
    return onSnapshot(collection(db, 'materialPriceHistory'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'materialPriceHistory'));
  },
  getLatestPrice: async (materialId: string) => {
    try {
      const q = query(
        collection(db, 'materialPriceHistory'), 
        where('materialId', '==', materialId)
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      records.sort((a: any, b: any) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      return records.length > 0 ? records[0] : null;
    } catch (err) {
      console.error("Error fetching latest price", err);
      return null;
    }
  },
  getMaterialStats: async (materialId: string) => {
    try {
      const q = query(collection(db, 'materialPriceHistory'), where('materialId', '==', materialId));
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      if (records.length === 0) return null;
      
      records.sort((a: any, b: any) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      
      const lastPrice = records[0].unitPrice;
      const lowestPrice = Math.min(...records.map((r: any) => r.unitPrice));
      const averagePrice = records.reduce((acc: number, r: any) => acc + r.unitPrice * r.quantity, 0) / 
                           records.reduce((acc: number, r: any) => acc + r.quantity, 0);

      return {
        lastPrice,
        lowestPrice,
        averagePrice,
        lastPurchaseDate: records[0].purchaseDate
      };
    } catch (err) {
      console.error("Error fetching stats", err);
      return null;
    }
  },
  getAll: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'materialPriceHistory'));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error("Error fetching all price history", err);
      return [];
    }
  },
  add: async (record: Omit<any, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'materialPriceHistory'), cleanObject(record));
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'materialPriceHistory');
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
      await addDoc(collection(db, 'grns'), cleanObject({
        ...grn,
        createdAt: new Date().toISOString()
      }));
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
      await setDoc(doc(db, 'users', profile.uid), cleanObject(profile));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${profile.uid}`);
    }
  }
};

export const CatalogImportService = {
  subscribe: (callback: (imports: any[]) => void) => {
    return onSnapshot(collection(db, 'catalogImports'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'catalogImports'));
  },
  add: async (importLog: any) => {
    try {
      const docRef = await addDoc(collection(db, 'catalogImports'), cleanObject({
        ...importLog,
        createdAt: new Date().toISOString()
      }));
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'catalogImports');
      throw err;
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

        let po: PurchaseOrder | null = null;
        let poRef = null;
        if (grn.poId && grn.poId !== 'MANUAL') {
          poRef = doc(db, 'purchaseOrders', grn.poId);
          const poSnap = await transaction.get(poRef);
          if (!poSnap.exists()) throw new Error("Purchase Order not found");
          po = poSnap.data() as PurchaseOrder;
        }

        const vendorSnap = await transaction.get(doc(db, 'vendors', grn.vendorId));
        const vendor = vendorSnap.exists() ? vendorSnap.data() as Vendor : null;

        // Collect all stock snapshots before any writes
        const stockData = [];
        for (const item of grn.items) {
          const whStockId = `${MAIN_WAREHOUSE_PROJECT_ID}_${item.productId}`;
          const whStockRef = doc(db, 'stocks', whStockId);
          const whStockSnap = await transaction.get(whStockRef);

          let siteStockRef = null;
          let siteStockSnap = null;
          let siteStockId = null;

          if (grn.projectId !== MAIN_WAREHOUSE_PROJECT_ID) {
            siteStockId = `${grn.projectId}_${item.productId}`;
            siteStockRef = doc(db, 'stocks', siteStockId);
            siteStockSnap = await transaction.get(siteStockRef);
          }

          const productSnap = await transaction.get(doc(db, 'products', item.productId));

          stockData.push({
            item,
            whStockRef,
            whStockSnap,
            whStockId,
            siteStockRef,
            siteStockSnap,
            siteStockId,
            productSnap
          });
        }

        const projectSnap = await transaction.get(doc(db, 'projects', grn.projectId));
        const whProjectSnap = await transaction.get(doc(db, 'projects', MAIN_WAREHOUSE_PROJECT_ID));
        const userProfileSnap = await transaction.get(doc(db, 'users', approvedBy));
        const userProfile = userProfileSnap.exists() ? userProfileSnap.data() as UserProfile : null;

        // --- WRITE PHASE ---
        transaction.update(grnRef, { 
          status: 'APPROVED', 
          approvedBy, 
          updatedAt: serverTimestamp() 
        });

        const updatedPoItems = po ? [...(po.items || [])] : [];

        for (const data of stockData) {
          const { item, whStockRef, whStockSnap, whStockId, siteStockRef, siteStockSnap, siteStockId, productSnap } = data;
          const receivedQty = item.receivedQuantity;
          if (receivedQty <= 0) continue;

          const product = productSnap.exists() ? productSnap.data() as Product : undefined;
          const project = projectSnap.exists() ? projectSnap.data() as Project : undefined;
          const whProject = whProjectSnap.exists() ? whProjectSnap.data() as Project : undefined;

          // Update PO item received quantity
          if (po) {
            const poItemIdx = updatedPoItems.findIndex(i => i.productId === item.productId);
            if (poItemIdx > -1) {
              updatedPoItems[poItemIdx].quantityReceived = (updatedPoItems[poItemIdx].quantityReceived || 0) + receivedQty;
            }
          }

          // Case Handles
          if (grn.receiptType === 'VENDOR_TO_WAREHOUSE' || grn.receiptType === 'DIRECT_SITE_DELIVERY') {
            // STEP 1: PURCHASE_RECEIPT (Vendor -> Main Warehouse)
            let whQtyBefore = 0;
            let whIncomingBefore = 0;
            if (whStockSnap.exists()) {
              whQtyBefore = whStockSnap.data()?.quantity || 0;
              whIncomingBefore = whStockSnap.data()?.incomingQuantity || 0;
            }

            const whQtyAfterReceipt = whQtyBefore + receivedQty;
            const whIncomingAfterReceipt = Math.max(0, whIncomingBefore - receivedQty);

            transaction.set(whStockRef, {
              id: whStockId,
              productId: item.productId,
              projectId: MAIN_WAREHOUSE_PROJECT_ID,
              quantity: whQtyAfterReceipt,
              incomingQuantity: whIncomingAfterReceipt,
              lastUpdated: new Date().toISOString()
            }, { merge: true });

            // Transaction 1: Movement Type: PURCHASE_RECEIPT
            await logMovement(transaction, {
              productId: item.productId,
              projectId: MAIN_WAREHOUSE_PROJECT_ID,
              type: MovementType.PURCHASE_RECEIPT,
              quantity: receivedQty,
              currentStock: whQtyAfterReceipt,
              userId: approvedBy,
              userName: userProfile?.name || 'System',
              referenceId: grnId,
              referenceType: 'GRN',
              referenceNumber: grn.grnNumber,
              sourceProjectName: vendor?.name || 'Vendor',
              destinationProjectId: MAIN_WAREHOUSE_PROJECT_ID,
              destinationProjectName: 'Main Warehouse',
              location: 'Main Warehouse (Virtual Receipt)',
              remarks: `Virtual warehouse receipt for procurement.`
            }, product, whProject);

            // If CASE 3: Direct Site Delivery, continue to Step 2
            if (grn.receiptType === 'DIRECT_SITE_DELIVERY') {
              // Deduct from Main Warehouse
              const whQtyAfterIssue = whQtyAfterReceipt - receivedQty;
              transaction.set(whStockRef, {
                quantity: whQtyAfterIssue,
                lastUpdated: new Date().toISOString()
              }, { merge: true });

              // Add to Site
              let siteQtyBefore = 0;
              if (siteStockSnap?.exists()) {
                siteQtyBefore = siteStockSnap.data()?.quantity || 0;
              }
              const siteQtyAfter = siteQtyBefore + receivedQty;

              transaction.set(siteStockRef!, {
                id: siteStockId!,
                productId: item.productId,
                projectId: grn.projectId,
                quantity: siteQtyAfter,
                lastUpdated: new Date().toISOString()
              }, { merge: true });

              // Transaction 3: Movement Type: ISSUE_TO_SITE
              await logMovement(transaction, {
                productId: item.productId,
                projectId: MAIN_WAREHOUSE_PROJECT_ID,
                type: MovementType.ISSUE_TO_SITE,
                quantity: -receivedQty,
                currentStock: whQtyAfterIssue,
                userId: approvedBy,
                userName: userProfile?.name || 'System',
                referenceId: grnId,
                referenceType: 'GRN',
                referenceNumber: grn.grnNumber,
                sourceProjectId: MAIN_WAREHOUSE_PROJECT_ID,
                sourceProjectName: 'Main Warehouse',
                destinationProjectId: grn.projectId,
                destinationProjectName: project?.name,
                remarks: `Direct Site Issue (Virtual Transfer)`
              }, product, whProject);

              // Site Stock In (Logged as ISSUE_TO_SITE at destination)
              await logMovement(transaction, {
                productId: item.productId,
                projectId: grn.projectId,
                type: MovementType.ISSUE_TO_SITE,
                quantity: receivedQty,
                currentStock: siteQtyAfter,
                userId: approvedBy,
                userName: userProfile?.name || 'System',
                referenceId: grnId,
                referenceType: 'GRN',
                referenceNumber: grn.grnNumber,
                sourceProjectId: MAIN_WAREHOUSE_PROJECT_ID,
                sourceProjectName: 'Main Warehouse',
                remarks: 'Stock In via Warehouse Virtual Issue'
              }, product, project);
            }
          } else if (grn.receiptType === 'WAREHOUSE_TRANSFER') {
            // STEP: Warehouse -> Site
            let whQtyBefore = 0;
            if (whStockSnap.exists()) {
              whQtyBefore = whStockSnap.data()?.quantity || 0;
            }
            if (whQtyBefore < receivedQty) {
              console.warn(`Insufficient warehouse stock for transfer of ${item.productId}. Proceeding anyway to avoid transaction failure, but quantity will be negative in WH.`);
            }

            const whQtyAfter = whQtyBefore - receivedQty;
            transaction.set(whStockRef, {
              quantity: whQtyAfter,
              lastUpdated: new Date().toISOString()
            }, { merge: true });

            let siteQtyBefore = 0;
            if (siteStockSnap?.exists()) {
              siteQtyBefore = siteStockSnap.data()?.quantity || 0;
            }
            const siteQtyAfter = siteQtyBefore + receivedQty;

            transaction.set(siteStockRef!, {
              id: siteStockId!,
              productId: item.productId,
              projectId: grn.projectId,
              quantity: siteQtyAfter,
              lastUpdated: new Date().toISOString()
            }, { merge: true });

            // LOG: ISSUE_TO_SITE from Warehouse
            await logMovement(transaction, {
              productId: item.productId,
              projectId: MAIN_WAREHOUSE_PROJECT_ID,
              type: MovementType.ISSUE_TO_SITE,
              quantity: -receivedQty,
              currentStock: whQtyAfter,
              userId: approvedBy,
              userName: userProfile?.name || 'System',
              referenceId: grnId,
              referenceType: 'GRN',
              remarks: `Stock Transfer to ${project?.name}`
            }, product, whProject);

            // LOG: Site Stock In
            await logMovement(transaction, {
              productId: item.productId,
              projectId: grn.projectId,
              type: MovementType.ISSUE_TO_SITE,
              quantity: receivedQty,
              currentStock: siteQtyAfter,
              userId: approvedBy,
              userName: userProfile?.name || 'System',
              referenceId: grnId,
              referenceType: 'GRN',
              sourceProjectId: MAIN_WAREHOUSE_PROJECT_ID,
              sourceProjectName: 'Main Warehouse',
              remarks: `Materials received from warehouse`
            }, product, project);
          }
        }

        // Update the PO with new quantities and check if fully completed
        if (po && poRef) {
          const allItemsReceived = updatedPoItems.every(i => (i.quantityReceived || 0) >= i.quantityOrdered);
          transaction.update(poRef, {
            items: updatedPoItems,
            status: allItemsReceived ? 'RECEIVED' : 'PARTIAL_RECEIVED',
            updatedAt: serverTimestamp()
          });
        }

        const projectData = projectSnap.exists() ? projectSnap.data() as Project : null;

        // Calculate GRN total value, update project spent cache, and log Material Price History
        let grnValue = 0;
        for (const data of stockData) {
          const { item, productSnap } = data;
          let unitPrice = 0;
          if (po && po.items) {
            const poItem = po.items.find(pi => pi.productId === item.productId);
            if (poItem) {
              unitPrice = poItem.unitPrice || 0;
            }
          }
          if (!unitPrice && productSnap.exists()) {
            const product = productSnap.data() as Product;
            unitPrice = product.unitPrice || 0;
          }
          const itemTotal = (item.receivedQuantity || 0) * unitPrice;
          grnValue += itemTotal;

          // Record Material Price History if PO exists and is approved, and user is ADMIN
          if (userProfile?.role === 'ADMIN' && po && po.status !== 'DRAFT' && po.status !== 'PENDING' && po.status !== 'CANCELLED' && item.receivedQuantity > 0) {
             const product = productSnap.exists() ? productSnap.data() as Product : undefined;
             const historyRef = doc(collection(db, 'materialPriceHistory'));
             transaction.set(historyRef, cleanObject({
               id: historyRef.id,
               materialId: item.productId,
               materialName: product ? product.name : 'Unknown Material',
               sku: product ? (product.sku || '') : '',
               vendorId: grn.vendorId,
               vendorName: vendor ? vendor.name : 'Unknown Vendor',
               projectId: grn.projectId,
               projectName: projectData ? projectData.name : 'Unknown Project',
               poNumber: po.poNumber,
               poId: po.id,
               grnNumber: grn.grnNumber,
               grnId: grn.id,
               purchaseDate: new Date().toISOString(),
               unitPrice: unitPrice,
               quantity: item.receivedQuantity,
               totalAmount: itemTotal,
               currency: 'INR',
               createdBy: approvedBy,
               createdAt: new Date().toISOString()
             }));
          }
        }

        const prevSpent = (projectData as any)?.spent || 0;
        const newSpent = prevSpent + grnValue;

        if (projectSnap.exists() && grnValue > 0) {
          transaction.update(doc(db, 'projects', grn.projectId), {
            spent: newSpent,
            updatedAt: serverTimestamp()
          });

          // Write Financial Audit Trail
          const auditRef = doc(collection(db, 'auditLogs'));
          transaction.set(auditRef, {
            id: auditRef.id,
            type: 'FINANCIAL_AUDIT',
            projectId: grn.projectId,
            projectName: projectData?.name || 'Unknown',
            transactionType: 'GRN_APPROVED',
            grnNumber: grn.grnNumber || grnId,
            returnNumber: null,
            prevSpentAmount: prevSpent,
            newSpentAmount: newSpent,
            diffAmount: grnValue,
            userId: approvedBy,
            userName: userProfile?.name || 'System',
            notes: `Approved GRN ${grn.grnNumber || grnId} of total value ₹${grnValue.toLocaleString()}`,
            timestamp: new Date().toISOString()
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `grns/${grnId}/approve`);
    }
  },
  
  directStockAdjustment: async (params: {
    productId: string,
    projectId: string,
    quantity: number, // Delta or New depending on mode
    mode: 'INCREMENT' | 'DECREMENT' | 'SET',
    type: MovementType,
    userId: string,
    userName: string,
    remarks: string,
    referenceNumber?: string
  }) => {
    try {
      await runTransaction(db, async (transaction) => {
        const stockId = `${params.projectId}_${params.productId}`;
        const stockRef = doc(db, 'stocks', stockId);
        const stockSnap = await transaction.get(stockRef);
        
        const productSnap = await transaction.get(doc(db, 'products', params.productId));
        const projectSnap = await transaction.get(doc(db, 'projects', params.projectId));

        if (!productSnap.exists()) throw new Error('Product not found');
        const product = productSnap.data() as Product;

        const currentQty = stockSnap.exists() ? (stockSnap.data() as Stock).quantity : 0;
        let newQty = 0;
        let adjustmentAmount = 0;

        if (params.mode === 'SET') {
          newQty = params.quantity;
          adjustmentAmount = newQty - currentQty;
        } else if (params.mode === 'INCREMENT') {
          newQty = currentQty + params.quantity;
          adjustmentAmount = params.quantity;
        } else if (params.mode === 'DECREMENT') {
          newQty = currentQty - params.quantity;
          adjustmentAmount = -params.quantity;
        }

        if (newQty < 0) {
          throw new Error(`Insufficient stock. Current: ${currentQty}, Adjustment: ${adjustmentAmount}`);
        }

        // 1. Update/Create Stock
        transaction.set(stockRef, {
          id: stockId,
          productId: params.productId,
          projectId: params.projectId,
          quantity: newQty,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        // 2. Log Movement
        await logMovement(transaction, {
          productId: params.productId,
          projectId: params.projectId,
          type: params.type,
          quantity: adjustmentAmount,
          currentStock: newQty,
          userId: params.userId,
          userName: params.userName,
          remarks: params.remarks,
          referenceNumber: params.referenceNumber
        }, product, projectSnap.exists() ? projectSnap.data() as Project : undefined);

        // 3. Audit Log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, cleanObject({
          id: auditRef.id,
          type: 'STOCK_ADJUSTMENT',
          action: params.type,
          productId: params.productId,
          productName: product.name,
          sku: product.sku,
          projectId: params.projectId,
          oldQuantity: currentQty,
          newQuantity: newQty,
          adjustment: adjustmentAmount,
          userId: params.userId,
          userName: params.userName,
          remarks: params.remarks,
          timestamp: new Date().toISOString()
        }));
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/adjust/${params.productId}`);
      throw err;
    }
  },

  adjustStock: async (params: { 
    productId: string, 
    projectId: string, 
    newQuantity: number, 
    userId: string, 
    userName: string,
    remarks: string 
  }) => {
    return InventoryService.directStockAdjustment({
      ...params,
      quantity: params.newQuantity,
      mode: 'SET',
      type: MovementType.STOCK_ADJUSTMENT
    });
  },

  issueStock: async (params: { 
    productId: string, 
    fromProjectId: string,
    toProjectId: string,
    issueQuantity: number, 
    userId: string, 
    userName: string,
    remarks: string,
    department?: string
  }) => {
    try {
      await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        // From Stock (Warehouse)
        const fromStockId = `${params.fromProjectId}_${params.productId}`;
        const fromStockRef = doc(db, 'stocks', fromStockId);
        const fromStockSnap = await transaction.get(fromStockRef);
        
        // To Stock (Project)
        const toStockId = `${params.toProjectId}_${params.productId}`;
        const toStockRef = doc(db, 'stocks', toStockId);
        const toStockSnap = await transaction.get(toStockRef);

        const productSnap = await transaction.get(doc(db, 'products', params.productId));
        const fromProjectSnap = await transaction.get(doc(db, 'projects', params.fromProjectId));
        const toProjectSnap = await transaction.get(doc(db, 'projects', params.toProjectId));

        // --- WRITE PHASE ---
        if (!fromStockSnap.exists()) throw new Error("Warehouse Stock not found");
        const fromQty = fromStockSnap.data().quantity || 0;
        if (fromQty < params.issueQuantity) throw new Error("Insufficient warehouse stock");

        const toQty = toStockSnap.exists() ? (toStockSnap.data().quantity || 0) : 0;

        // 1. Update from record
        const currentReserved = fromStockSnap.data().reservedQuantity || 0;
        transaction.update(fromStockRef, {
          quantity: fromQty - params.issueQuantity,
          reservedQuantity: Math.max(0, currentReserved - params.issueQuantity),
          lastUpdated: new Date().toISOString()
        });

        // 2. Update to record
        if (toStockSnap.exists()) {
          transaction.update(toStockRef, {
            quantity: toQty + params.issueQuantity,
            lastUpdated: new Date().toISOString()
          });
        } else {
          transaction.set(toStockRef, {
            id: toStockId,
            productId: params.productId,
            projectId: params.toProjectId,
            quantity: params.issueQuantity,
            lastUpdated: new Date().toISOString()
          });
        }

        // 3. Log movements
        const product = productSnap.exists() ? productSnap.data() as Product : undefined;
        const fromProject = fromProjectSnap.exists() ? fromProjectSnap.data() as Project : undefined;
        const toProject = toProjectSnap.exists() ? toProjectSnap.data() as Project : undefined;

        await logMovement(transaction, {
          productId: params.productId,
          projectId: params.fromProjectId,
          type: MovementType.MATERIAL_ISSUE,
          quantity: -params.issueQuantity,
          currentStock: fromQty - params.issueQuantity,
          userId: params.userId,
          userName: params.userName,
          remarks: params.remarks,
          department: params.department
        }, product, fromProject);
        
        await logMovement(transaction, {
          productId: params.productId,
          projectId: params.toProjectId,
          type: MovementType.STOCK_IN,
          quantity: params.issueQuantity,
          currentStock: toQty + params.issueQuantity,
          userId: params.userId,
          userName: params.userName,
          remarks: 'Received from Warehouse',
          department: params.department
        }, product, toProject);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stocks/${params.fromProjectId}_${params.productId}/transfer`);
      throw err;
    }
  }
};

export const ProjectReturnService = {
  subscribe: (callback: (returns: ProjectReturn[]) => void) => {
    return onSnapshot(collection(db, 'projectReturns'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectReturn)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projectReturns'));
  },
  create: async (ret: Omit<ProjectReturn, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addDoc(collection(db, 'projectReturns'), cleanObject({
        ...ret,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'projectReturns');
    }
  },
  updateStatus: async (id: string, status: ProjectReturn['status'], userId: string, userName: string, notes?: string, approvedQuantity?: number) => {
    try {
      const returnRef = doc(db, 'projectReturns', id);
      const updates: any = { 
        status, 
        updatedAt: new Date().toISOString() 
      };
      
      if (status === 'WAREHOUSE_REVIEW') {
        updates.reviewerId = userId;
        updates.reviewerName = userName;
      }

      if (approvedQuantity !== undefined) {
        updates.approvedQuantity = approvedQuantity;
      }

      if (notes) {
        updates.reviewRemarks = notes;
      }

      updates.history = arrayUnion(cleanObject({
        status,
        userId,
        userName,
        timestamp: new Date().toISOString(),
        notes
      }));

      await updateDoc(returnRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projectReturns/${id}`);
    }
  },
  processReturnToWarehouse: async (returnId: string, warehouseUserId: string, warehouseUserName: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const returnRef = doc(db, 'projectReturns', returnId);
        const returnSnap = await transaction.get(returnRef);
        if (!returnSnap.exists()) throw new Error("Return document not found");
        const ret = returnSnap.data() as ProjectReturn;
        
        if (ret.status !== 'APPROVED') throw new Error("Return must be approved before processing");

        const qtyToReturn = ret.approvedQuantity || ret.returnQuantity;

        // 1. Project Stock (Source) - READ
        const projectStockId = `${ret.projectId}_${ret.productId}`;
        const projectStockRef = doc(db, 'stocks', projectStockId);
        const projectStockSnap = await transaction.get(projectStockRef);
        
        if (!projectStockSnap.exists()) throw new Error("Project Stock not found");
        const projectQty = projectStockSnap.data()?.quantity || 0;
        if (projectQty < qtyToReturn) throw new Error("Insufficient project stock for return");

        // 2. Warehouse Stock (Destination) - READ
        const warehouseStockId = `${MAIN_WAREHOUSE_PROJECT_ID}_${ret.productId}`;
        const warehouseStockRef = doc(db, 'stocks', warehouseStockId);
        const warehouseStockSnap = await transaction.get(warehouseStockRef);
        const warehouseQty = warehouseStockSnap.exists() ? (warehouseStockSnap.data()?.quantity || 0) : 0;
        
        // 3. Get Metadata for Logging - READ
        const productSnap = await transaction.get(doc(db, 'products', ret.productId));
        const projectSnap = await transaction.get(doc(db, 'projects', ret.projectId));
        const warehouseSnap = await transaction.get(doc(db, 'projects', MAIN_WAREHOUSE_PROJECT_ID));
        
        const product = productSnap.exists() ? productSnap.data() as Product : undefined;
        const project = projectSnap.exists() ? projectSnap.data() as Project : undefined;
        const warehouse = warehouseSnap.exists() ? warehouseSnap.data() as Project : undefined;

        // Update Project Return Status
        transaction.update(returnRef, {
          status: 'RETURNED',
          updatedAt: new Date().toISOString(),
          history: arrayUnion(cleanObject({
            status: 'RETURNED',
            userId: warehouseUserId,
            userName: warehouseUserName,
            timestamp: new Date().toISOString(),
            notes: 'Physical return processed to Warehouse'
          }))
        });

        // Update Project Stock
        const newProjectQty = projectQty - qtyToReturn;
        transaction.update(projectStockRef, { 
          quantity: newProjectQty,
          lastUpdated: new Date().toISOString()
        });

        // Update Warehouse Stock
        const newWarehouseQty = warehouseQty + qtyToReturn;
        transaction.set(warehouseStockRef, {
          id: warehouseStockId,
          productId: ret.productId,
          projectId: MAIN_WAREHOUSE_PROJECT_ID,
          quantity: newWarehouseQty,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        // Log Movements
        let returnMovementType = MovementType.RETURN_TO_WAREHOUSE;
        if (ret.returnType === 'DAMAGED_MATERIAL') returnMovementType = MovementType.DAMAGED_RETURN;
        if (ret.returnType === 'EXCESS_MATERIAL') returnMovementType = MovementType.EXCESS_RETURN;

        // Deduct from Site
        await logMovement(transaction, {
          productId: ret.productId,
          projectId: ret.projectId,
          type: returnMovementType,
          quantity: -qtyToReturn,
          currentStock: newProjectQty,
          userId: warehouseUserId,
          userName: warehouseUserName,
          referenceId: returnId,
          referenceType: 'RETURN',
          referenceNumber: ret.returnNumber,
          sourceProjectId: ret.projectId,
          sourceProjectName: project?.name,
          destinationProjectId: MAIN_WAREHOUSE_PROJECT_ID,
          destinationProjectName: 'Main Warehouse',
          remarks: `Return to Warehouse: ${ret.returnType}`
        }, product, project);

        // Add to Warehouse
        await logMovement(transaction, {
          productId: ret.productId,
          projectId: MAIN_WAREHOUSE_PROJECT_ID,
          type: returnMovementType,
          quantity: qtyToReturn,
          currentStock: newWarehouseQty,
          userId: warehouseUserId,
          userName: warehouseUserName,
          referenceId: returnId,
          referenceType: 'RETURN',
          referenceNumber: ret.returnNumber,
          sourceProjectId: ret.projectId,
          sourceProjectName: project?.name,
          destinationProjectId: MAIN_WAREHOUSE_PROJECT_ID,
          destinationProjectName: 'Main Warehouse',
          remarks: `Returned from Site: ${project?.name || ret.projectId}`
        }, product, warehouse);

        // Deduct returned material credit and write financial audit log
        const itemValue = qtyToReturn * (product?.unitPrice || 0);
        const prevSpent = (project as any)?.spent || 0;
        const newSpent = Math.max(0, prevSpent - itemValue);

        if (projectSnap.exists() && itemValue > 0) {
          transaction.update(projectSnap.ref, {
            spent: newSpent,
            updatedAt: new Date().toISOString()
          });

          // Write Financial Audit Trail
          const auditRef = doc(collection(db, 'auditLogs'));
          transaction.set(auditRef, {
            id: auditRef.id,
            type: 'FINANCIAL_AUDIT',
            projectId: ret.projectId,
            projectName: project?.name || 'Unknown',
            transactionType: 'RETURN_PROCESSED',
            grnNumber: null,
            returnNumber: ret.returnNumber || returnId,
            prevSpentAmount: prevSpent,
            newSpentAmount: newSpent,
            diffAmount: itemValue,
            userId: warehouseUserId,
            userName: warehouseUserName,
            notes: `Processed return to warehouse: Deducted ${qtyToReturn} of product (Value: ₹${itemValue.toLocaleString()})`,
            timestamp: new Date().toISOString()
          });
        }
      });
    } catch (err: any) {
      console.error('Process Return Error:', err);
      throw err;
    }
  }
};

export const ReturnToStoreService = {
  subscribe: (callback: (returns: ReturnToStore[]) => void) => {
    return onSnapshot(collection(db, 'returnsToStore'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReturnToStore)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'returnsToStore'));
  },
  create: async (ret: Omit<ReturnToStore, 'id'>) => {
    try {
      await addDoc(collection(db, 'returnsToStore'), cleanObject({
        ...ret,
        createdAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'returnsToStore');
    }
  },
  approve: async (returnId: string, approvedBy: string, userName: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const returnRef = doc(db, 'returnsToStore', returnId);
        const returnSnap = await transaction.get(returnRef);
        if (!returnSnap.exists()) throw new Error("Return document not found");
        const ret = returnSnap.data() as ReturnToStore;
        if (ret.status !== 'PENDING') return;

        // 1. Project Stock (Source) - READ
        const projectStockId = `${ret.projectId}_${ret.productId}`;
        const projectStockRef = doc(db, 'stocks', projectStockId);
        const projectStockSnap = await transaction.get(projectStockRef);
        
        if (!projectStockSnap.exists()) throw new Error("Project Stock not found");
        const projectQty = projectStockSnap.data().quantity || 0;
        if (projectQty < ret.quantity) throw new Error("Insufficient project stock for return");

        // 2. Warehouse Stock (Destination) - READ
        const warehouseStockId = `${MAIN_WAREHOUSE_PROJECT_ID}_${ret.productId}`;
        const warehouseStockRef = doc(db, 'stocks', warehouseStockId);
        const warehouseStockSnap = await transaction.get(warehouseStockRef);
        const warehouseQty = warehouseStockSnap.exists() ? (warehouseStockSnap.data().quantity || 0) : 0;
        
        // 5. Get Metadata for Logging - READ
        const productSnap = await transaction.get(doc(db, 'products', ret.productId));
        const projectSnap = await transaction.get(doc(db, 'projects', ret.projectId));
        const warehouseSnap = await transaction.get(doc(db, 'projects', MAIN_WAREHOUSE_PROJECT_ID));
        
        const product = productSnap.exists() ? productSnap.data() as Product : undefined;
        const project = projectSnap.exists() ? projectSnap.data() as Project : undefined;
        const warehouse = warehouseSnap.exists() ? warehouseSnap.data() as Project : undefined;

        // 3. Update Stocks - WRITE
        transaction.update(projectStockRef, { 
          quantity: projectQty - ret.quantity, 
          lastUpdated: new Date().toISOString() 
        });

        if (warehouseStockSnap.exists()) {
          transaction.update(warehouseStockRef, { 
            quantity: warehouseQty + ret.quantity, 
            lastUpdated: new Date().toISOString() 
          });
        } else {
          transaction.set(warehouseStockRef, {
            id: warehouseStockId,
            productId: ret.productId,
            projectId: MAIN_WAREHOUSE_PROJECT_ID,
            quantity: ret.quantity,
            lastUpdated: new Date().toISOString()
          });
        }

        // 4. Update Return Status - WRITE
        transaction.update(returnRef, { status: 'APPROVED', approvedBy });

        // Log deduction from project - WRITE
        await logMovement(transaction, {
          productId: ret.productId,
          projectId: ret.projectId,
          type: MovementType.RETURN_TO_STORE,
          quantity: -ret.quantity,
          currentStock: projectQty - ret.quantity,
          userId: approvedBy,
          userName: userName,
          referenceId: returnId,
          referenceType: 'RETURN_TO_STORE',
          referenceNumber: ret.returnNumber,
          remarks: ret.reason,
          department: ret.department
        }, product, project);

        // Log addition to warehouse - WRITE
        await logMovement(transaction, {
          productId: ret.productId,
          projectId: MAIN_WAREHOUSE_PROJECT_ID,
          type: MovementType.RETURN_TO_STORE,
          quantity: ret.quantity,
          currentStock: warehouseQty + ret.quantity,
          userId: approvedBy,
          userName: userName,
          referenceId: returnId,
          referenceType: 'RETURN_TO_STORE',
          referenceNumber: ret.returnNumber,
          remarks: `Received return from project ${project?.name || 'Unknown'}`,
          department: 'WAREHOUSE'
        }, product, warehouse);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `returnsToStore/${returnId}/approve`);
      throw err;
    }
  }
};

export const ReturnToVendorService = {
  subscribe: (callback: (returns: ReturnToVendor[]) => void) => {
    return onSnapshot(collection(db, 'returnsToVendor'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReturnToVendor)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'returnsToVendor'));
  },
  create: async (ret: Omit<ReturnToVendor, 'id'>) => {
    try {
      await addDoc(collection(db, 'returnsToVendor'), cleanObject({
        ...ret,
        createdAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'returnsToVendor');
    }
  },
  approve: async (rtvId: string, approvedBy: string, userName: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const rtvRef = doc(db, 'returnsToVendor', rtvId);
        const rtvSnap = await transaction.get(rtvRef);
        if (!rtvSnap.exists()) throw new Error("RTV document not found");
        const rtv = rtvSnap.data() as ReturnToVendor;
        if (rtv.status !== 'PENDING') return;

        const stockId = `${rtv.projectId}_${rtv.productId}`;
        const stockRef = doc(db, 'stocks', stockId);
        const stockSnap = await transaction.get(stockRef);

        if (!stockSnap.exists()) throw new Error("Stock not found for return");
        const currentQty = stockSnap.data().quantity;
        if (currentQty < rtv.quantity) throw new Error("Insufficient stock for vendor return");

        const newQty = currentQty - rtv.quantity;

        // Update Stock
        transaction.update(stockRef, { 
          quantity: newQty, 
          lastUpdated: new Date().toISOString() 
        });

        // Update Return Status
        transaction.update(rtvRef, { status: 'APPROVED', approvedBy });

        // Log Movement
        const productSnap = await transaction.get(doc(db, 'products', rtv.productId));
        const projectSnap = await transaction.get(doc(db, 'projects', rtv.projectId));
        const product = productSnap.exists() ? productSnap.data() as Product : undefined;
        const project = projectSnap.exists() ? projectSnap.data() as Project : undefined;

        await logMovement(transaction, {
          productId: rtv.productId,
          projectId: rtv.projectId,
          type: MovementType.RETURN_TO_VENDOR,
          quantity: -rtv.quantity,
          currentStock: newQty,
          userId: approvedBy,
          userName: userName,
          referenceId: rtvId,
          referenceType: 'RETURN_TO_VENDOR',
          referenceNumber: rtv.rtvNumber,
          remarks: rtv.reason
        }, product, project);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `returnsToVendor/${rtvId}/approve`);
      throw err;
    }
  }
};

export const IssueService = {
  subscribe: (callback: (issues: ProjectIssue[]) => void) => {
    return onSnapshot(collection(db, 'projectIssues'), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectIssue)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projectIssues'));
  },
  add: async (issue: Omit<ProjectIssue, 'id'>) => {
    try {
      await addDoc(collection(db, 'projectIssues'), cleanObject({
        ...issue,
        createdAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'projectIssues');
    }
  },
  updateStatus: async (id: string, status: ProjectIssue['status'], resolutionNotes?: string) => {
    try {
      const updates: Partial<ProjectIssue> = { status };
      if (status === 'RESOLVED') {
        updates.resolvedAt = new Date().toISOString();
      }
      if (resolutionNotes !== undefined) {
        updates.resolutionNotes = resolutionNotes;
      }
      await updateDoc(doc(db, 'projectIssues', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projectIssues/${id}`);
    }
  },
  update: async (id: string, issue: Partial<ProjectIssue>) => {
    try {
      await updateDoc(doc(db, 'projectIssues', id), cleanObject(issue));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projectIssues/${id}`);
    }
  },
  delete: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projectIssues', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projectIssues/${id}`);
    }
  }
};
