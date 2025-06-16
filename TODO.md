# ERP System - TODO List

## 🔄 Future Development Tasks

### ⚠️ High Priority

#### 1. Supplier Purchase Integration
**Status:** Pending  
**Priority:** High  
**Estimated Time:** 2-3 hours  

**Description:**  
Connect supplier statistics (`total_purchases` and `total_spent` columns) to the actual purchase system for real-time tracking.

**Current Issue:**
- Suppliers table has `total_purchases` and `total_spent` fields that are static
- These fields are not updated when purchases are created/updated
- Currently showing hardcoded/outdated values

**Implementation Plan:**
1. **Database Level Changes:**
   - Create PostgreSQL trigger function to update supplier totals
   - Trigger should fire on: purchase creation, status changes, and purchase deletions
   - Calculate totals from `purchases` table where `supplier_id` matches

2. **Backend Integration:**
   - Update `createPurchase()` function to trigger supplier total recalculation
   - Update `updatePurchase()` function for status changes
   - Add `recalculateSupplierTotals()` utility function

3. **Frontend Updates:**
   - Re-enable "Purchases" and "Total Spent" columns in `/purchases/suppliers` page
   - Update stats cards to show connected data
   - Add refresh mechanism for real-time updates

**Files to Modify:**
- `src/lib/supabase/mutations.ts` - Add supplier total update functions
- `src/lib/supabase/purchases.ts` - Integrate supplier total updates
- `src/app/purchases/suppliers/page.tsx` - Re-enable hidden columns
- Database migrations - Add trigger functions

**Database Trigger Example:**
```sql
CREATE OR REPLACE FUNCTION update_supplier_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE suppliers 
  SET 
    total_purchases = (
      SELECT COUNT(*) 
      FROM purchases 
      WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
      AND status NOT IN ('cancelled')
    ),
    total_spent = (
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM purchases 
      WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
      AND status IN ('received', 'partially_received')
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';
```

**Notes:**
- Hidden columns temporarily in suppliers page (commit: [current])
- Sample data in database has hardcoded values that will be recalculated
- Consider performance impact on large datasets

---

## 📋 Other Tasks

### 2. [Next TODO Item]
**Status:** [Pending/In Progress/Completed]  
**Priority:** [Low/Medium/High]  
**Description:** [To be added when requested]

---

## ✅ Completed Tasks

### ✅ Supplier Management System
**Completed:** [Current Date]  
**Description:** Created comprehensive supplier management page with CRUD operations, status management, and Supabase integration.

---

## 📝 Notes

- Use this file to track all future development tasks
- Update status and add completion dates when tasks are finished
- Include estimated time and priority for better planning
- Add technical details and implementation notes for each task

---

**Last Updated:** $(date)  
**Next Review:** When new tasks are added 