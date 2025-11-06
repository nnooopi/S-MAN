# 📁 Complete File Listing

## SQL Migration Files (Apply in This Order)

### 001_phase_evaluation_schema_updates.sql
- **Purpose:** Add foreign key constraints and indexes
- **Risk Level:** LOW
- **Execution Time:** ~1 minute
- **What It Does:**
  - Adds FK: phase_evaluation_forms → project_phases
  - Adds FK: phase_evaluation_criteria → phase_evaluation_forms
  - Creates performance indexes
  - Adds deadline_updated_at column for audit trail
  - Adds documentation comments

### 002_project_evaluation_forms_updates.sql
- **Purpose:** Setup project evaluation form constraints and tracking
- **Risk Level:** LOW
- **Execution Time:** ~1 minute
- **What It Does:**
  - Adds FK: project_evaluation_forms → projects
  - Adds FK: project_evaluation_criteria → project_evaluation_forms
  - Adds deadline_synced_from_phase_id (to track which phase to sync from)
  - Adds deadline_updated_at column
  - Creates indexes for lookups

### 003_consolidate_evaluation_tables.sql
- **Purpose:** Merge custom evaluation data into main tables
- **Risk Level:** MEDIUM
- **Execution Time:** ~1-5 minutes
- **What It Does:**
  - Adds custom_file_url, custom_file_name, is_custom_evaluation columns
  - Migrates phase_custom_evaluations → phase_evaluation_forms
  - Migrates project_custom_evaluations → project_evaluation_forms
  - Creates compatibility views for transition period
  - Does NOT drop old tables (safe to rollback)

### 004_create_evaluation_recalculation_functions.sql
- **Purpose:** Create triggers and utility functions
- **Risk Level:** VERY LOW
- **Execution Time:** ~1 minute
- **What It Does:**
  - Creates recalculate_phase_evaluation_deadlines() function
  - Creates sync_project_evaluation_from_last_phase() function
  - Creates trg_recalculate_phase_eval_on_end_date_change trigger
  - Creates trg_sync_project_eval_from_phase trigger
  - Creates recalculate_all_project_evaluations() utility function
  - Creates validate_evaluation_deadlines() diagnostic function

### 005_fix_existing_evaluation_deadlines.sql
- **Purpose:** Fix incorrect deadlines in current data
- **Risk Level:** MEDIUM
- **Execution Time:** ~5-30 minutes
- **What It Does:**
  - Analyzes all existing phase evaluations
  - Recalculates correct deadlines based on phase.end_date
  - Updates phase_evaluation_forms with correct dates
  - Updates project_evaluation_forms to sync from last phase
  - Shows summary of fixes applied
  - Validates all results

### 006_cleanup_redundant_tables.sql
- **Purpose:** Remove old redundant tables (DESTRUCTIVE)
- **Risk Level:** HIGH ⚠️
- **Execution Time:** ~1 minute
- **When to Run:** ONLY after all tests pass!
- **What It Does:**
  - Verifies migration was successful
  - Drops phase_custom_evaluations (data now in phase_evaluation_forms)
  - Drops project_custom_evaluations (data now in project_evaluation_forms)
  - Drops compatibility views
  - Final verification and summary

---

## Documentation Files

### README.md
- **Type:** Overview & Quick Start
- **Read First:** YES
- **Contains:**
  - What gets fixed
  - Quick start instructions
  - File listing
  - Verification checklist
  - Troubleshooting tips
  - System benefits

### MIGRATION_GUIDE.md
- **Type:** Comprehensive Technical Guide
- **Read When:** Planning detailed implementation
- **Contains:**
  - Detailed explanation of each migration
  - How the system works after migration
  - Verification queries
  - Rollback procedures
  - Backend code changes needed
  - Testing checklist
  - Monitoring & maintenance

### QUICK_START.md
- **Type:** Quick Reference
- **Read When:** Ready to apply migrations
- **Contains:**
  - Prerequisites
  - Step-by-step execution
  - Shell/PowerShell scripts
  - Individual migration commands
  - Troubleshooting
  - Validation commands

### MIGRATION_IMPLEMENTATION_SUMMARY.md
- **Type:** Executive Summary
- **Read When:** Need overview of all changes
- **Contains:**
  - Files created list
  - Database changes overview
  - Architecture improvements
  - Execution timeline
  - Backend code changes required
  - Performance considerations

### ARCHITECTURE_DIAGRAMS.md
- **Type:** Visual Documentation
- **Read When:** Need to understand flows
- **Contains:**
  - Database structure diagram
  - Evaluation deadline timeline
  - Automatic trigger cascade
  - Data flow (creation & modification)
  - Custom vs built-in evaluations
  - Validation diagnostic view
  - Table consolidation summary

### VERIFICATION_QUERIES.sql
- **Type:** SQL Testing & Validation
- **Read When:** Need to verify migrations
- **Contains:**
  - Post-migration verification queries
  - Consolidation verification
  - Functions verification
  - Sample project validation
  - Trigger functionality tests
  - Timeline consistency checks
  - Custom evaluation checks
  - Data consistency checks
  - Performance monitoring
  - Bulk validation
  - Health check queries

---

## How to Use These Files

### Before Starting
1. Read: **README.md** (5 min)
2. Review: **MIGRATION_IMPLEMENTATION_SUMMARY.md** (5 min)
3. Backup your database!

### During Implementation
1. Follow: **QUICK_START.md** (step-by-step)
2. Reference: **QUICK_START.md** shell scripts
3. Apply each SQL migration in order

### After Each Migration
1. Run: Relevant queries from **VERIFICATION_QUERIES.sql**
2. Check: All outputs for errors
3. Review: Summary information

### For Understanding
1. Read: **MIGRATION_GUIDE.md** (comprehensive)
2. View: **ARCHITECTURE_DIAGRAMS.md** (visual)
3. Reference: Specific sections as needed

### For Troubleshooting
1. Check: Troubleshooting sections in docs
2. Run: Diagnostic queries from **VERIFICATION_QUERIES.sql**
3. Review: Database logs
4. Reference: **MIGRATION_GUIDE.md** Rollback Procedure

### For Debugging
1. Run: `validate_evaluation_deadlines('PROJECT_ID')`
2. Review: Issue column for problems
3. Run: `recalculate_all_project_evaluations('PROJECT_ID')`
4. Check: Trigger execution timestamps

---

## File Application Order

### Step 1: Preparation (Read Docs)
```
1. README.md
2. MIGRATION_IMPLEMENTATION_SUMMARY.md
3. QUICK_START.md (review)
```

### Step 2: Safety (Backup & Test)
```
1. Backup database
2. Run on development environment first
3. Review ARCHITECTURE_DIAGRAMS.md
```

### Step 3: Apply Migrations (Phase 1 - Safe)
```
1. 001_phase_evaluation_schema_updates.sql
2. 002_project_evaluation_forms_updates.sql
3. 004_create_evaluation_recalculation_functions.sql
→ Verify with: VERIFICATION_QUERIES.sql (Section 1-2)
```

### Step 4: Apply Migrations (Phase 2 - Data)
```
1. 003_consolidate_evaluation_tables.sql
2. 005_fix_existing_evaluation_deadlines.sql
→ Verify with: VERIFICATION_QUERIES.sql (Section 3-6)
→ Review output carefully
```

### Step 5: Testing
```
1. VERIFICATION_QUERIES.sql (all sections)
2. ARCHITECTURE_DIAGRAMS.md (understand flows)
3. Manual testing (change phase date, verify update)
```

### Step 6: Code Update
```
1. MIGRATION_GUIDE.md - Backend Code Changes section
2. Update application code
3. Remove old table references
4. Remove manual calculations
```

### Step 7: Final Cleanup (Only if All Tests Pass!)
```
1. 006_cleanup_redundant_tables.sql
→ Verify with: VERIFICATION_QUERIES.sql (Section 1)
```

---

## Quick Navigation

### "I want to understand what's happening"
→ ARCHITECTURE_DIAGRAMS.md

### "I want to apply the migrations"
→ QUICK_START.md

### "I want detailed technical info"
→ MIGRATION_GUIDE.md

### "I want to verify everything works"
→ VERIFICATION_QUERIES.sql

### "I want an overview"
→ README.md

### "I need to troubleshoot"
→ MIGRATION_GUIDE.md Troubleshooting section

### "I need to rollback"
→ MIGRATION_GUIDE.md Rollback Procedure section

---

## Key Statistics

| Metric | Value |
|--------|-------|
| SQL Migration Files | 6 |
| Documentation Files | 7 |
| Total New Columns | 7 |
| Foreign Keys Added | 5 |
| Indexes Created | 7 |
| Triggers Created | 2 |
| Functions Created | 4 |
| Views Created | 2 |
| Tables to Drop | 2 |
| Estimated Total Time | 4-8 hours |

---

## Risk Summary

| Risk Level | Migrations | Mitigation |
|-----------|-----------|-----------|
| **Very Low** | 4 | Safe to run anytime |
| **Low** | 1, 2 | Only adds constraints/indexes |
| **Medium** | 3, 5 | Data migration but reversible |
| **High** | 6 | Destructive - only after verification |

---

## Support Matrix

| Issue Type | File to Check | Query to Run |
|-----------|---------------|------------|
| Constraints not created | QUICK_START.md | `\d phase_evaluation_forms` |
| Triggers not firing | VERIFICATION_QUERIES.sql | Section 3 |
| Deadlines incorrect | VERIFICATION_QUERIES.sql | Section 4 |
| Data migration failed | MIGRATION_GUIDE.md | Section 3 verification |
| Rollback needed | MIGRATION_GUIDE.md | Rollback Procedure |
| Performance issues | VERIFICATION_QUERIES.sql | Section 10 |
| Deadline logic wrong | ARCHITECTURE_DIAGRAMS.md | Review flow |

---

## Next Steps

1. ✅ Read README.md
2. ✅ Review all documentation
3. ✅ Backup database
4. ✅ Apply migrations (QUICK_START.md)
5. ✅ Verify (VERIFICATION_QUERIES.sql)
6. ✅ Update backend code (MIGRATION_GUIDE.md)
7. ✅ Test thoroughly
8. ✅ Deploy to production

**You're ready to implement!** 🚀

