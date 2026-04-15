import { Router, RequestHandler } from 'express';
import { PharmacyController } from './pharmacy.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { requireFeature } from '../../middleware/featureFlag.middleware';
import { validate } from '../../middleware/validate';
import { addMedicineSchema, updateStockSchema } from './pharmacy.schema';
import { SupplierController } from './supplier.controller';
import { PurchaseController } from './purchase.controller';
import { PharmacySaleController } from './pharmacy-sale.controller';

const router = Router();

router.use(authMiddleware as RequestHandler);
router.use(requireFeature('pharmacy') as RequestHandler);

// View inventory — admin & cashier
router.get('/', allowRoles('admin', 'super_admin', 'cashier') as RequestHandler, PharmacyController.getInventory as RequestHandler);

// Add medicine — admin only
router.post('/', allowRoles('admin', 'super_admin') as RequestHandler, validate(addMedicineSchema), PharmacyController.addMedicine as RequestHandler);

// Update stock
router.put('/:id/stock', allowRoles('admin', 'super_admin', 'warehouse_manager') as RequestHandler, validate(updateStockSchema), PharmacyController.updateStock as RequestHandler);

// Delete — admin only
router.delete('/:id', allowRoles('admin', 'super_admin') as RequestHandler, PharmacyController.deleteMedicine as RequestHandler);

// Suppliers
router.get('/suppliers', allowRoles('admin', 'super_admin', 'warehouse_manager') as RequestHandler, SupplierController.getSuppliers as RequestHandler);
router.post('/suppliers', allowRoles('admin', 'super_admin', 'warehouse_manager') as RequestHandler, SupplierController.addSupplier as RequestHandler);

// Purchase Flow
router.post('/purchase', allowRoles('admin', 'super_admin', 'warehouse_manager') as RequestHandler, PurchaseController.processFactura as RequestHandler);

// Sales & Inpatients (Phase 3)
router.get('/inpatients', allowRoles('admin', 'super_admin', 'cashier') as RequestHandler, PharmacySaleController.getInpatients as RequestHandler);
router.post('/sale', allowRoles('admin', 'super_admin', 'cashier') as RequestHandler, PharmacySaleController.processSale as RequestHandler);

export default router;
