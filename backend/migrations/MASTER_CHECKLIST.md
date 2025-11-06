# 🎯 MASTER IMPLEMENTATION CHECKLIST

## Pre-Implementation (Read Everything First!)

- [ ] Read README.md completely
- [ ] Review MIGRATION_IMPLEMENTATION_SUMMARY.md
- [ ] Review ARCHITECTURE_DIAGRAMS.md (understand flows)
- [ ] Understand what each migration does
- [ ] Review FILE_INDEX.md to know where to find things
- [ ] Backup database to safe location
- [ ] Ensure development environment is ready
- [ ] Have PostgreSQL client ready
- [ ] Have proper database credentials

---

## Phase 1: Apply Safe Migrations (Low Risk)

### Migration 001: Phase Evaluation Schema Updates
- [ ] Run: `psql -U [user] -d [database] -f 001_phase_evaluation_schema_updates.sql`
- [ ] No errors in output ✓
- [ ] Check: Foreign key constraints created
  ```sql
  SELECT constraint_name FROM information_schema.table_constraints 
  WHERE table_name = 'phase_evaluation_forms' AND constraint_type = 'FOREIGN KEY';
  ```
- [ ] Check: Indexes created
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename LIKE 'phase_evaluation%';
  ```
- [ ] Check: Column added
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'phase_evaluation_forms' AND column_name = 'deadline_updated_at';
  ```

### Migration 002: Project Evaluation Forms Updates
- [ ] Run: `psql -U [user] -d [database] -f 002_project_evaluation_forms_updates.sql`
- [ ] No errors in output ✓
- [ ] Check: Foreign key constraints created
  ```sql
  SELECT constraint_name FROM information_schema.table_constraints 
  WHERE table_name = 'project_evaluation_forms' AND constraint_type = 'FOREIGN KEY';
  ```
- [ ] Check: New columns added (deadline_synced_from_phase_id, deadline_updated_at)
- [ ] Check: Indexes created

### Migration 004: Create Evaluation Recalculation Functions
- [ ] Run: `psql -U [user] -d [database] -f 004_create_evaluation_recalculation_functions.sql`
- [ ] No errors in output ✓
- [ ] Check: Functions exist
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public' AND routine_name LIKE 'recalculate%';
  ```
- [ ] Check: Triggers exist
  ```sql
  SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';
  ```
- [ ] Check: Triggers are on correct tables (project_phases, phase_evaluation_forms)

---

## Phase 2: Data Migration (Moderate Risk - Review Output!)

### Migration 003: Consolidate Evaluation Tables
- [ ] Run: `psql -U [user] -d [database] -f 003_consolidate_evaluation_tables.sql`
- [ ] No errors in output ✓
- [ ] Review output: Any data type mismatches?
- [ ] Check: New columns exist (is_custom_evaluation, custom_file_url, custom_file_name)
- [ ] Check: Data migrated
  ```sql
  SELECT COUNT(*) as custom_count FROM phase_evaluation_forms WHERE is_custom_evaluation = TRUE;
  ```
- [ ] Check: Views created
  ```sql
  SELECT * FROM phase_custom_evaluations_view LIMIT 1;
  SELECT * FROM project_custom_evaluations_view LIMIT 1;
  ```
- [ ] Verify: Old tables still exist (for safety)
  ```sql
  SELECT * FROM phase_custom_evaluations LIMIT 1;
  SELECT * FROM project_custom_evaluations LIMIT 1;
  ```

### Migration 005: Fix Existing Evaluation Deadlines
- [ ] Run: `psql -U [user] -d [database] -f 005_fix_existing_evaluation_deadlines.sql`
- [ ] **IMPORTANT:** Review output carefully!
- [ ] Check: How many evaluations were fixed?
- [ ] Check: Any errors or warnings?
- [ ] Verify: Sample project has correct deadlines
  ```sql
  SELECT * FROM validate_evaluation_deadlines('SAMPLE_PROJECT_ID');
  ```
- [ ] All rows should show `is_valid = TRUE`
- [ ] Check another project to verify
- [ ] Check: Project evaluations synced from phases
  ```sql
  SELECT pef.project_id, pef.deadline_synced_from_phase_id 
  FROM project_evaluation_forms pef;
  ```

---

## Phase 3: Comprehensive Testing

### Test 1: Validation Function Works
- [ ] Run: `SELECT * FROM validate_evaluation_deadlines('PROJECT_ID_1');`
- [ ] Shows all phases with their evaluation dates
- [ ] All rows show `is_valid = TRUE`
- [ ] No rows show issues
- [ ] Try with 2-3 different projects

### Test 2: Trigger Execution - Phase End Date Change
- [ ] Find a test project: `SELECT id FROM projects WHERE title LIKE '%test%' LIMIT 1;`
- [ ] Find a phase: `SELECT id FROM project_phases WHERE project_id = 'PROJECT_ID' LIMIT 1;`
- [ ] Get current eval deadline:
  ```sql
  SELECT available_from, due_date FROM phase_evaluation_forms 
  WHERE phase_id = 'PHASE_ID';
  ```
- [ ] Update phase end date to future:
  ```sql
  UPDATE project_phases SET end_date = NOW() + INTERVAL '20 days' WHERE id = 'PHASE_ID';
  ```
- [ ] Check evaluation dates changed:
  ```sql
  SELECT available_from, due_date FROM phase_evaluation_forms 
  WHERE phase_id = 'PHASE_ID';
  ```
- [ ] ✓ Dates should be different and later
- [ ] ✓ Trigger executed automatically!

### Test 3: Project Evaluation Sync
- [ ] Get project evaluation before phase update:
  ```sql
  SELECT available_from, due_date FROM project_evaluation_forms 
  WHERE project_id = 'PROJECT_ID';
  ```
- [ ] Get last phase's evaluation:
  ```sql
  SELECT pef.available_from, pef.due_date FROM phase_evaluation_forms pef
  WHERE pef.phase_id = (
    SELECT id FROM project_phases 
    WHERE project_id = 'PROJECT_ID'
    ORDER BY phase_number DESC LIMIT 1
  );
  ```
- [ ] If phase was last, dates should match
- [ ] ✓ Sync works correctly!

### Test 4: Custom Evaluations Work
- [ ] Find a project with custom evaluation:
  ```sql
  SELECT * FROM phase_evaluation_forms 
  WHERE is_custom_evaluation = TRUE AND project_id = 'PROJECT_ID' LIMIT 1;
  ```
- [ ] Check custom_file_url is populated
- [ ] Check custom_file_name is populated
- [ ] Verify deadline structure is same as built-in
- [ ] ✓ Custom evaluations work!

### Test 5: Backward Compatibility Views Work
- [ ] Query old table name (via view):
  ```sql
  SELECT * FROM phase_custom_evaluations_view LIMIT 1;
  ```
- [ ] Should return results without error
- [ ] Results should match consolidated table:
  ```sql
  SELECT * FROM phase_evaluation_forms WHERE is_custom_evaluation = TRUE LIMIT 1;
  ```
- [ ] ✓ Views work, transition smooth

### Test 6: Timeline Consistency
- [ ] Run validation query:
  ```sql
  SELECT pp.phase_number, pp.end_date, pef.available_from, 
         pef.due_date, pef.available_from > pp.end_date as valid
  FROM project_phases pp
  JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
  WHERE pp.project_id = 'PROJECT_ID'
  ORDER BY pp.phase_number;
  ```
- [ ] All rows show `valid = TRUE`
- [ ] available_from > end_date ✓
- [ ] due_date > available_from ✓

---

## Phase 4: Backend Code Updates

### Remove Old Code
- [ ] Remove `calculateEvaluationStartDate()` function
- [ ] Remove `calculateEvaluationDueDate()` function
- [ ] Remove `calculateBreathePhaseEnd()` function
- [ ] Remove manual deadline calculations from project creation
- [ ] Remove manual deadline updates from phase modification
- [ ] Search for: `phase_custom_evaluations` - remove all references
- [ ] Search for: `project_custom_evaluations` - remove all references

### Update Query Code
- [ ] Update all queries referencing old tables:
  ```javascript
  // FROM:
  SELECT * FROM phase_custom_evaluations WHERE ...;
  
  // TO:
  SELECT * FROM phase_evaluation_forms 
  WHERE is_custom_evaluation = TRUE ...;
  ```
- [ ] Update project creation API:
  - Remove manual deadline calculation
  - Let database handle dates via triggers
- [ ] Update phase modification API:
  - Just update project_phases
  - Triggers update evaluations automatically
- [ ] Add diagnostic function usage:
  - Use `validate_evaluation_deadlines()` for debugging
  - Use `recalculate_all_project_evaluations()` if needed

### Code Review
- [ ] No references to deleted tables remain
- [ ] No manual deadline calculations remain
- [ ] Queries use consolidated tables correctly
- [ ] is_custom_evaluation flag used correctly
- [ ] No hardcoded assumptions about evaluation structure

---

## Phase 5: Validation & Testing

### Functional Tests
- [ ] Create new test project
- [ ] Verify evaluation deadlines correct
- [ ] Modify phase dates
- [ ] Verify deadlines auto-update
- [ ] Create project with custom evaluation
- [ ] Verify custom file stored and accessible
- [ ] Create project with multiple phases
- [ ] Verify project eval syncs from last phase
- [ ] Verify breathe phase logic works
- [ ] Change evaluation_phase_days in projects
- [ ] Verify all evaluations recalculate

### Edge Case Tests
- [ ] Single phase project (project eval = phase eval)
- [ ] Very short timeline (1 day phases)
- [ ] Very long timeline (many phases)
- [ ] Change phase dates multiple times (triggers fire each time)
- [ ] Move phase backwards in time
- [ ] Overlapping phases (should validate against)

### Integration Tests
- [ ] Student can see evaluation deadlines
- [ ] Professor can see evaluation deadlines
- [ ] Student can submit evaluation when window open
- [ ] Student cannot submit outside window
- [ ] Evaluation window correctly calculated
- [ ] Multiple projects work independently

### Performance Tests
- [ ] Create 100 test projects
- [ ] Query validation on all at once
- [ ] Trigger performance (update 1 phase, check query time)
- [ ] No database locks or timeouts
- [ ] Response time acceptable (<5 seconds)

---

## Phase 6: Staging Deployment

- [ ] Run all migrations on staging
- [ ] Deploy backend code to staging
- [ ] Run full integration tests on staging
- [ ] Check student/professor interfaces
- [ ] Verify all deadline displays
- [ ] Test phase modification workflow
- [ ] Check database performance
- [ ] Monitor error logs (should be none)
- [ ] 24-hour soak test (no issues)

---

## Phase 7: Cleanup (ONLY IF ALL TESTS PASS!)

### Pre-Cleanup Verification
- [ ] All previous phases completed ✓
- [ ] All tests passed ✓
- [ ] Staging deployment successful ✓
- [ ] 24-hour soak test passed ✓
- [ ] Backend code fully updated ✓
- [ ] Manager approval obtained ✓

### Migration 006: Cleanup Redundant Tables
- [ ] Run: `psql -U [user] -d [database] -f 006_cleanup_redundant_tables.sql`
- [ ] No errors in output ✓
- [ ] Review: Migration summary
- [ ] Verify: Old tables actually dropped
  ```sql
  SELECT * FROM information_schema.tables 
  WHERE table_name IN ('phase_custom_evaluations', 'project_custom_evaluations');
  ```
- [ ] Should return 0 rows
- [ ] Check: Views dropped
  ```sql
  SELECT * FROM information_schema.views 
  WHERE table_name LIKE '%custom_evaluations%';
  ```
- [ ] Should return 0 rows
- [ ] ✓ Cleanup complete!

---

## Phase 8: Production Deployment

### Pre-Deployment Checklist
- [ ] Database backup taken
- [ ] Rollback plan documented
- [ ] Maintenance window scheduled
- [ ] Team notified
- [ ] Monitoring enabled
- [ ] Incident response plan ready

### Deployment Steps
- [ ] Disable student submissions (if applicable)
- [ ] Deploy backend code first
- [ ] Apply migration 1-2 (safe)
- [ ] Apply migration 4 (triggers/functions)
- [ ] Apply migration 3-5 (data migration)
- [ ] Validate production data
- [ ] Re-enable student submissions
- [ ] Monitor for issues (30 minutes)
- [ ] If stable, apply migration 6 (optional)

### Post-Deployment Verification
- [ ] All migrations succeeded
- [ ] No data corruption
- [ ] Triggers firing correctly
- [ ] Deadlines displaying correctly
- [ ] Phase modifications working
- [ ] Custom evaluations accessible
- [ ] No errors in logs
- [ ] Performance acceptable
- [ ] Students can access evaluations
- [ ] Professors can manage deadlines

### Post-Deployment Monitoring (24 hours)
- [ ] Check system logs every hour
- [ ] Monitor database performance
- [ ] Watch for error patterns
- [ ] Check trigger execution times
- [ ] Verify student submissions working
- [ ] Monitor deadline-based events
- [ ] Check email notifications (if any)
- [ ] All systems stable ✓

---

## Success Criteria

### ✅ Must Have
- [x] All 6 migrations applied without errors
- [x] No data loss or corruption
- [x] Triggers firing automatically on phase updates
- [x] Evaluation deadlines correct for all projects
- [x] Project evaluations synced from last phase
- [x] Backend code updated and working
- [x] All tests passing
- [x] No performance degradation
- [x] Production deployment successful

### ✅ Should Have
- [x] Custom evaluations working correctly
- [x] Timeline validation diagnostics available
- [x] Backward compatibility maintained during transition
- [x] Documentation complete and accessible
- [x] Team trained on new system
- [x] Monitoring in place

### ✅ Nice to Have
- [x] Zero downtime deployment
- [x] Automated validation tests
- [x] Automated performance monitoring
- [x] Database audit trail
- [x] Slack/email alerts on trigger execution

---

## Sign-Off

- [ ] Database Administrator: Migrations applied successfully
- [ ] Backend Developer: Code updated and tested
- [ ] QA Lead: All tests passed
- [ ] Product Manager: Features verified
- [ ] Project Manager: Ready for deployment
- [ ] DevOps: Production deployment successful

---

## Rollback Plan (If Issues Arise)

### If Migration 1-4 Fails
1. Error in SQL? Review the migration file
2. Check database logs for details
3. Verify credentials and permissions
4. Retry the migration

### If Migration 3-5 Fails
1. Data type mismatch? Check existing data
2. Foreign key violation? Orphaned records exist
3. Try reverting migration 3, fixing data, retrying
4. Restore from backup if necessary

### If Migration 6 Fails
1. Tables couldn't be dropped? Check references
2. Views couldn't be dropped? Check dependencies
3. Don't force drop (data is consolidated)
4. Restore from backup

### If Production Issues Arise
1. Stop accepting new submissions
2. Run validation query on all projects
3. If deadlines wrong: Run `recalculate_all_project_evaluations()`
4. If triggers broken: Check trigger status and re-enable
5. If data corrupted: Restore from backup
6. Contact database administrator immediately

---

## Documentation Location

- README.md - Start here
- QUICK_START.md - Step-by-step commands
- MIGRATION_GUIDE.md - Detailed technical guide
- ARCHITECTURE_DIAGRAMS.md - Visual explanations
- VERIFICATION_QUERIES.sql - SQL validation
- FILE_INDEX.md - Guide to all files
- This file - Complete checklist

---

## Timeline Summary

| Phase | Duration | Tasks |
|-------|----------|-------|
| Pre-Implementation | 1 hour | Read docs, backup |
| Phase 1 (Safe) | 3 minutes | Apply migrations 1, 2, 4 |
| Phase 2 (Data) | 30 minutes | Apply migrations 3, 5 |
| Phase 3 (Testing) | 2 hours | Functional testing |
| Phase 4 (Code) | 2 hours | Update backend |
| Phase 5 (Validation) | 2 hours | Full integration tests |
| Phase 6 (Staging) | 4 hours | Staging deployment + soak |
| Phase 7 (Cleanup) | 5 minutes | Apply migration 6 |
| Phase 8 (Production) | 1 hour | Deploy to production |

**Total: 4-8 hours complete implementation**

---

## Questions?

Refer to:
1. **FAQ:** MIGRATION_GUIDE.md Troubleshooting section
2. **Commands:** QUICK_START.md
3. **Architecture:** ARCHITECTURE_DIAGRAMS.md
4. **Validation:** VERIFICATION_QUERIES.sql

---

**You're all set! Start with Phase 1 and work through the checklist.** ✅🚀

