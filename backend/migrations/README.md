# Phase & Project Evaluation Deadlines Fix - Complete Documentation

## 📋 Overview

This migration suite fixes the broken evaluation deadline system where:
- **Problem:** Evaluation deadlines were calculated once and never updated if phase dates changed
- **Solution:** Implement database triggers and consolidate tables for automatic recalculation

## 🎯 What Gets Fixed

### Before
```
Phase 1 ends Oct 10
↓ (manual calculation)
Evaluation form created: Oct 11-12
↓
Phase 1 moved to Oct 15 (by professor)
↓ ❌
Evaluation form STILL shows: Oct 11-12 (WRONG!)
```

### After
```
Phase 1 ends Oct 10
↓ (calculated once)
Evaluation form created: Oct 11-12
↓
Phase 1 moved to Oct 15 (by professor)
↓ ✓
Trigger fires automatically
↓
Evaluation form updated to: Oct 16-17 (CORRECT!)
```

## 📦 Files Included

### SQL Migrations (6 files)
| # | File | Purpose | Risk | Time |
|---|------|---------|------|------|
| 1 | `001_phase_evaluation_schema_updates.sql` | Add constraints & indexes | Low | ~1 min |
| 2 | `002_project_evaluation_forms_updates.sql` | Setup project eval structure | Low | ~1 min |
| 3 | `003_consolidate_evaluation_tables.sql` | Merge custom eval tables | Medium | ~5 min |
| 4 | `004_create_evaluation_recalculation_functions.sql` | Create triggers & functions | Very Low | ~1 min |
| 5 | `005_fix_existing_evaluation_deadlines.sql` | Fix current data | Medium | ~30 min |
| 6 | `006_cleanup_redundant_tables.sql` | Drop old tables | High ⚠️ | ~1 min |

### Documentation Files (7 files)
1. **README.md** (this file) - Start here
2. **MIGRATION_GUIDE.md** - Comprehensive technical guide
3. **QUICK_START.md** - Quick reference commands
4. **MIGRATION_IMPLEMENTATION_SUMMARY.md** - High-level overview
5. **ARCHITECTURE_DIAGRAMS.md** - Visual flowcharts
6. **VERIFICATION_QUERIES.sql** - SQL validation queries
7. **QUICK_REFERENCE.txt** (next section) - Cheat sheet

## 🚀 Quick Start (TL;DR)

### 1. Backup your database
```bash
pg_dump -U your_user -d your_db > backup_$(date +%Y%m%d).sql
```

### 2. Apply migrations in order
```bash
for i in {1..6}; do
  echo "Applying migration $i..."
  psql -U your_user -d your_db < $(printf "%03d" $i)_*.sql
done
```

### 3. Verify
```bash
psql -U your_user -d your_db -c "SELECT * FROM validate_evaluation_deadlines('SAMPLE_PROJECT_ID');"
```

### 4. Update backend code
- Remove manual deadline calculations
- Remove references to deleted tables
- See MIGRATION_GUIDE.md for details

### 5. Test in development
- Create a sample project
- Change a phase end date
- Verify evaluation deadlines update automatically

## 📋 Application Order

### Phase 1: Setup (Safe - Low Risk)
```bash
# Apply constraints and structure
psql -U user -d db < 001_phase_evaluation_schema_updates.sql
psql -U user -d db < 002_project_evaluation_forms_updates.sql
psql -U user -d db < 004_create_evaluation_recalculation_functions.sql
# Duration: ~3 minutes
```

### Phase 2: Data Migration (Moderate Risk - Requires Review)
```bash
# Consolidate data
psql -U user -d db < 003_consolidate_evaluation_tables.sql
# Review output for migration success

# Fix existing deadlines
psql -U user -d db < 005_fix_existing_evaluation_deadlines.sql
# Review output showing what was fixed
# Duration: ~10-40 minutes
```

### Phase 3: Cleanup (High Risk - Optional)
```bash
# Only after everything verified!
psql -U user -d db < 006_cleanup_redundant_tables.sql
# Duration: ~1 minute
```

## ✅ Verification Checklist

After each migration:

- [ ] No SQL errors in output
- [ ] All constraints created successfully
- [ ] All functions created successfully
- [ ] All triggers created successfully
- [ ] `SELECT * FROM validate_evaluation_deadlines('PROJECT_ID');` shows all valid
- [ ] Test: Change a phase end_date, verify evaluation deadlines update
- [ ] Test: Verify project evaluation syncs from last phase
- [ ] Backend code updated to use new schema

## 🔧 Backend Code Changes

### Remove These
```javascript
// DELETE - No longer needed
calculateEvaluationStartDate()
calculateEvaluationDueDate()
calculateBreathePhaseEnd()

// DELETE references to old tables
phase_custom_evaluations
project_custom_evaluations
```

### Update These
```javascript
// FROM:
SELECT * FROM phase_custom_evaluations WHERE phase_id = ?;

// TO:
SELECT * FROM phase_evaluation_forms 
WHERE phase_id = ? AND is_custom_evaluation = TRUE;
```

### Keep These
```javascript
// Frontend still calculates at creation time (OK)
// Database now handles updates via triggers
// Backend doesn't need to recalculate manually
```

## 🧪 Testing Scenarios

### Test 1: Basic Creation
```sql
-- Create project with phases
-- Verify: evaluation_available_from > phase.end_date ✓
SELECT * FROM validate_evaluation_deadlines('NEW_PROJECT_ID');
```

### Test 2: Trigger Execution
```sql
-- Update phase end_date
UPDATE project_phases SET end_date = NOW() + INTERVAL '10 days' WHERE id = 'PHASE_ID';

-- Verify: evaluation dates automatically updated
SELECT available_from, due_date FROM phase_evaluation_forms WHERE phase_id = 'PHASE_ID';
```

### Test 3: Sync Functionality
```sql
-- Verify project eval syncs from last phase
SELECT * FROM project_evaluation_forms 
WHERE project_id = 'PROJECT_ID';

-- Compare with last phase eval
SELECT * FROM phase_evaluation_forms 
WHERE phase_id = (
  SELECT id FROM project_phases 
  WHERE project_id = 'PROJECT_ID'
  ORDER BY phase_number DESC LIMIT 1
);
-- Dates should match! ✓
```

## 🆘 Troubleshooting

### Migration fails on constraint
```
ERROR: violating foreign key constraint
→ Existing data doesn't match new constraints
→ Review MIGRATION_GUIDE.md "Rollback Procedure"
→ Check database for orphaned records
```

### Triggers not firing
```
SELECT * FROM information_schema.triggers 
WHERE trigger_schema = 'public';
→ Should show: trg_recalculate_phase_eval_on_end_date_change
→ Should show: trg_sync_project_eval_from_phase
```

### Evaluation deadlines still wrong
```
SELECT * FROM validate_evaluation_deadlines('PROJECT_ID');
→ Look for rows where is_valid = FALSE
→ Check issue column for explanation
→ Run: SELECT * FROM recalculate_all_project_evaluations('PROJECT_ID');
```

## 📊 System Architecture

### Tables Involved
```
projects (parent)
  ├─ project_phases (1:Many)
  │  ├─ phase_evaluation_forms ✓ CONSOLIDATED (was 2 tables)
  │  ├─ phase_rubrics
  │  └─ phase_rubric_criteria
  ├─ project_evaluation_forms ✓ CONSOLIDATED (was 2 tables)
  ├─ project_rubrics
  └─ project_rubric_criteria
```

### Automatic Triggers
```
1. Professor updates phase.end_date
   ↓
2. Trigger: trg_recalculate_phase_eval_on_end_date_change
   ↓
3. Update phase_evaluation_forms with new deadlines
   ↓
4. Trigger: trg_sync_project_eval_from_phase
   ↓
5. Update project_evaluation_forms (if last phase)
   ↓
6. ✓ All deadlines automatically synced!
```

## 🔍 Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Deadline Updates** | Manual (never happens) | Automatic (via triggers) |
| **Custom Evaluations** | Separate table | Consolidated with flag |
| **Data Redundancy** | High (2+ tables per type) | Low (1 table per type) |
| **Consistency** | Manual sync needed | Automatic sync |
| **Validation** | None | Built-in function |
| **Audit Trail** | None | `deadline_updated_at` column |
| **Diagnostics** | Impossible | `validate_evaluation_deadlines()` |

## 📚 Documentation Guide

- **Start Here:** README.md (you are here)
- **How-to Guide:** MIGRATION_GUIDE.md
- **Quick Commands:** QUICK_START.md
- **High-Level:** MIGRATION_IMPLEMENTATION_SUMMARY.md
- **Visual Flows:** ARCHITECTURE_DIAGRAMS.md
- **SQL Checks:** VERIFICATION_QUERIES.sql

## ⏱️ Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Setup** | 3 min | Apply migrations 1, 2, 4 |
| **Data Migration** | 10-40 min | Apply migrations 3, 5 |
| **Cleanup** | 1 min | Apply migration 6 (optional) |
| **Testing** | 1-2 hours | Test trigger, sync, custom evals |
| **Backend Updates** | 1-4 hours | Update code, remove old refs |
| **Deployment** | 30 min | Test → staging → production |
| **Verification** | 30 min | Check triggers, validate data |
| **Total** | 4-8 hours | Complete implementation |

## ⚠️ Important Warnings

1. **Backup First!** This modifies your database structure
2. **Test on Development** before running on production
3. **Migration 6 is Destructive** - Only run after verification
4. **Phase 5 Modifies Data** - Review output carefully
5. **Backend Code Changes** - Some code will need updating

## ✨ After Migration Benefits

✅ Evaluation deadlines auto-update when phases change
✅ No more manual deadline recalculation
✅ Consistent state across all evaluations
✅ Built-in validation and diagnostics
✅ Single source of truth for each evaluation
✅ Audit trail for deadline changes
✅ Triggers cascade changes automatically

## 🤝 Support

If you encounter issues:
1. Check troubleshooting in MIGRATION_GUIDE.md
2. Review the specific migration file that failed
3. Run VERIFICATION_QUERIES.sql to diagnose
4. Check database logs for error details
5. Review ARCHITECTURE_DIAGRAMS.md for flow understanding

## 📞 Quick Reference

**Validate a project:**
```sql
SELECT * FROM validate_evaluation_deadlines('PROJECT_ID');
```

**Recalculate all evaluations:**
```sql
SELECT * FROM recalculate_all_project_evaluations('PROJECT_ID');
```

**Check trigger execution:**
```sql
SELECT * FROM phase_evaluation_forms 
WHERE deadline_updated_at > NOW() - INTERVAL '1 hour';
```

**List custom evaluations:**
```sql
SELECT * FROM phase_evaluation_forms 
WHERE is_custom_evaluation = TRUE;
```

---

**Ready?** Start with QUICK_START.md for step-by-step instructions!

