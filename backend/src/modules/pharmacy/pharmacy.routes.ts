import { Router } from 'express';
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

router.use(authMiddleware);
router.use(requireFeature('pharmacy'));

// View inventory — admin & cashier
router.get('/', allowRoles('admin', 'super_admin', 'cashier'), PharmacyController.getInventory);

// Add medicine — admin only
router.post('/', allowRoles('admin', 'super_admin'), validate(addMedicineSchema), PharmacyController.addMedicine);

// Update stock
router.put('/:id/stock', allowRoles('admin', 'super_admin', 'warehouse_manager'), validate(updateStockSchema), PharmacyController.updateStock);

// Delete — admin only
router.delete('/:id', allowRoles('admin', 'super_admin'), PharmacyController.deleteMedicine);

// Suppliers
router.get('/suppliers', allowRoles('admin', 'super_admin', 'warehouse_manager'), SupplierController.getSuppliers);
router.post('/suppliers', allowRoles('admin', 'super_admin', 'warehouse_manager'), SupplierController.addSupplier);

// Purchase Flow
router.post('/purchase', allowRoles('admin', 'super_admin', 'warehouse_manager'), PurchaseController.processFactura);

// Sales & Inpatients (Phase 3)
router.get('/inpatients', allowRoles('admin', 'super_admin', 'cashier'), PharmacySaleController.getInpatients);
router.post('/sale', allowRoles('admin', 'super_admin', 'cashier'), PharmacySaleController.processSale);

export default router;
