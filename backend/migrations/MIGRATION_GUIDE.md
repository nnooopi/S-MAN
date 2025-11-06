# Database Migration Guide: Phase & Project Evaluation Deadlines

## Overview
This guide walks you through implementing the evaluation deadline fix. These migrations consolidate and properly link evaluation deadlines to their phases.

## Migration Execution Order

Run these migrations **in strict order** to ensure data consistency:

### 1. **001_phase_evaluation_schema_updates.sql**
**Purpose:** Add constraints and structure to phase evaluation forms

**What it does:**
- Adds foreign key constraints linking `phase_evaluation_forms` → `project_phases`
- Adds `phase_evaluation_criteria` foreign key constraints
- Creates indexes for performance
- Adds audit columns (`deadline_updated_at`)
- Adds documentation/comments

**Duration:** < 1 minute
**Risk:** Low (only adds constraints and indexes)

**Apply:**
```bash
psql -U [user] -d [database] -f 001_phase_evaluation_schema_updates.sql
```

---

### 2. **002_project_evaluation_forms_updates.sql**
**Purpose:** Set up project evaluation form structure and links

**What it does:**
- Adds foreign key constraints for `project_evaluation_forms` → `projects`
- Adds `project_evaluation_criteria` foreign key constraints
- Adds tracking columns for syncing from last phase
- Creates indexes for lookups

**Duration:** < 1 minute
**Risk:** Low (only adds constraints and indexes)

**Apply:**
```bash
psql -U [user] -d [database] -f 002_project_evaluation_forms_updates.sql
```

---

### 3. **003_consolidate_evaluation_tables.sql**
**Purpose:** Consolidate custom evaluations into main evaluation tables

**What it does:**
- Adds `custom_file_url`, `custom_file_name`, `is_custom_evaluation` columns to both evaluation form tables
- Migrates data from `phase_custom_evaluations` → `phase_evaluation_forms`
- Migrates data from `project_custom_evaluations` → `project_evaluation_forms`
- Creates views for backward compatibility
- Does NOT drop old tables yet (safe rollback possible)

**Duration:** 1-5 minutes (depending on data volume)
**Risk:** Medium (data migration, but views provide fallback)

**Apply:**
```bash
psql -U [user] -d [database] -f 003_consolidate_evaluation_tables.sql
```

**Verify:**
```sql
-- Check data migration
SELECT COUNT(*) FROM phase_evaluation_forms WHERE is_custom_evaluation = TRUE;
SELECT COUNT(*) FROM project_evaluation_forms WHERE is_custom_evaluation = TRUE;
```

---

### 4. **004_create_evaluation_recalculation_functions.sql**
**Purpose:** Create triggers and functions for automatic deadline recalculation

**What it does:**
- Creates `recalculate_phase_evaluation_deadlines()` function
- Creates trigger to auto-recalculate when phase `end_date` changes
- Creates `sync_project_evaluation_from_last_phase()` function
- Creates trigger to sync project evaluation when phase evaluation changes
- Creates `recalculate_all_project_evaluations(project_id)` utility function
- Creates `validate_evaluation_deadlines(project_id)` diagnostic function

**Duration:** < 1 minute
**Risk:** Very Low (just creates functions, doesn't modify data)

**Apply:**
```bash
psql -U [user] -d [database] -f 004_create_evaluation_recalculation_functions.sql
```

**Test the function:**
```sql
-- Test validation on a specific project
SELECT * FROM validate_evaluation_deadlines('YOUR_PROJECT_ID_HERE');

-- This shows you:
-- - Phase end dates
-- - Evaluation available dates
-- - Evaluation due dates
-- - Whether they're valid
-- - Any issues found
```

---

### 5. **005_fix_existing_evaluation_deadlines.sql**
**Purpose:** Fix any incorrect deadlines in existing data

**What it does:**
- Identifies all phases with evaluation forms
- Recalculates correct deadlines based on phase `end_date` + `evaluation_phase_days`
- Updates `phase_evaluation_forms` with correct deadlines
- Updates `project_evaluation_forms` to sync from last phase
- Shows summary of what was fixed

**Duration:** 5-30 minutes (depending on project count)
**Risk:** Medium (modifies existing data, but you can verify first)

**Apply:**
```bash
psql -U [user] -d [database] -f 005_fix_existing_evaluation_deadlines.sql
```

**Review output** carefully to see:
- How many evaluation deadlines were fixed
- What changed for each phase

---

### 6. **006_cleanup_redundant_tables.sql**
**Purpose:** Clean up old redundant tables (FINAL CLEANUP)

**What it does:**
- Verifies migration was successful
- Drops views created for backward compatibility
- Drops old `phase_custom_evaluations` table
- Drops old `project_custom_evaluations` table
- Verifies final structure

**Duration:** < 1 minute
**Risk:** HIGH - This is destructive! Only run after verifying all previous migrations

**⚠️ IMPORTANT:** Only run this after:
1. All 5 previous migrations complete successfully
2. You've verified the data is correct (run migration 005 output checks)
3. Your application code has been updated (see next section)

**Apply:**
```bash
psql -U [user] -d [database] -f 006_cleanup_redundant_tables.sql
```

---

## How the System Now Works

### Phase Evaluation Deadlines
**Flow:** `project_phases.end_date` → `phase_evaluation_forms.available_from` & `due_date`

When a professor changes a phase's end date:
1. Trigger fires on `project_phases` UPDATE
2. `recalculate_phase_evaluation_deadlines()` function executes
3. New dates are calculated:
   - `available_from` = day after phase ends (12:00 AM UTC)
   - `due_date` = available_from + evaluation_phase_days (11:59:59 PM UTC)
4. `phase_evaluation_forms` row is automatically updated
5. Trigger fires on `phase_evaluation_forms` UPDATE
6. `sync_project_evaluation_from_last_phase()` executes
7. `project_evaluation_forms` is synced with last phase's dates

### Custom vs Built-in Evaluations
**Built-in:** 
- Uses default criteria (stored in `phase_evaluation_criteria`)
- `is_custom_evaluation = FALSE`
- Uses form structure from `phase_evaluation_forms`

**Custom:**
- Upload custom file (PDF, Word, etc.)
- `is_custom_evaluation = TRUE`
- `custom_file_url` and `custom_file_name` populated
- Same deadline structure as built-in

---

## Verification Queries

### Check Phase Evaluation Structure
```sql
SELECT 
    pp.phase_number,
    pp.title,
    pp.end_date,
    pef.available_from,
    pef.due_date,
    pef.is_custom_evaluation,
    pef.custom_file_name
FROM project_phases pp
JOIN phase_evaluation_forms pef ON pp.id = pef.phase_id
WHERE pp.project_id = 'YOUR_PROJECT_ID'
ORDER BY pp.phase_number;
```

### Check Project Evaluation Sync
```sql
SELECT 
    pef.project_id,
    pef.available_from,
    pef.due_date,
    pef.deadline_synced_from_phase_id,
    pp.phase_number AS synced_from_phase_number
FROM project_evaluation_forms pef
LEFT JOIN project_phases pp ON pef.deadline_synced_from_phase_id = pp.id
WHERE pef.project_id = 'YOUR_PROJECT_ID';
```

### Validate Deadline Logic
```sql
SELECT * FROM validate_evaluation_deadlines('YOUR_PROJECT_ID');
```

---

## Backend Code Updates Required

### 1. Update Project Creation Code
When creating evaluations for phases, ensure they use the new structure:

```javascript
// BEFORE (manual calculation)
const evaluationStartDate = calculateEvaluationStartDate(phase.endDate);
const evaluationDueDate = calculateEvaluationDueDate(
  evaluationStartDate,
  formData.evaluationPhaseDays
);

// NOW (database handles this via trigger)
// Just insert the phase, the evaluation form is created automatically
// OR update existing evaluations via the recalculation functions
```

### 2. Update Phase Modification Code
When a professor updates a phase end date, the evaluation deadlines will **automatically** update via trigger:

```javascript
// BEFORE (manual recalculation)
UPDATE phase SET end_date = new_date;
UPDATE phase_evaluation_forms SET available_from = ..., due_date = ...;

// NOW (trigger handles it)
UPDATE project_phases SET end_date = new_date;
// Trigger automatically updates phase_evaluation_forms!
```

### 3. Update Queries to Use New Structure
```javascript
// Get phase evaluation details
const query = `
  SELECT 
    pef.id,
    pef.available_from,
    pef.due_date,
    pef.is_custom_evaluation,
    pef.custom_file_url,
    pec.name,
    pec.max_points
  FROM phase_evaluation_forms pef
  LEFT JOIN phase_evaluation_criteria pec ON pef.id = pec.phase_evaluation_form_id
  WHERE pef.phase_id = $1
  ORDER BY pec.order_index
`;
```

### 4. Remove References to Deleted Tables
```javascript
// REMOVE these queries:
SELECT * FROM phase_custom_evaluations;
SELECT * FROM project_custom_evaluations;

// REPLACE with:
SELECT * FROM phase_evaluation_forms WHERE is_custom_evaluation = TRUE;
SELECT * FROM project_evaluation_forms WHERE is_custom_evaluation = TRUE;
```

---

## Rollback Procedure

If something goes wrong:

### Rollback 005 (Fix Existing):
Data was modified. You'll need to restore from backup or manually revert the updates.

### Rollback 004 (Functions):
```sql
DROP TRIGGER IF EXISTS trg_recalculate_phase_eval_on_end_date_change ON project_phases;
DROP TRIGGER IF EXISTS trg_sync_project_eval_from_phase ON phase_evaluation_forms;
DROP FUNCTION IF EXISTS recalculate_phase_evaluation_deadlines();
DROP FUNCTION IF EXISTS sync_project_evaluation_from_last_phase();
DROP FUNCTION IF EXISTS recalculate_all_project_evaluations(UUID);
DROP FUNCTION IF EXISTS validate_evaluation_deadlines(UUID);
```

### Rollback 003 (Consolidation):
```sql
-- The views and old tables still exist, so queries will still work
-- Just skip migration 006 (cleanup)
```

### Rollback 002, 001:
```sql
-- Remove foreign key constraints (if needed)
ALTER TABLE phase_evaluation_forms DROP CONSTRAINT fk_phase_eval_forms_phase_id;
ALTER TABLE project_evaluation_forms DROP CONSTRAINT fk_project_eval_forms_project_id;
-- etc...
```

---

## Testing Checklist

- [ ] All 6 migrations applied successfully
- [ ] `validate_evaluation_deadlines()` shows all evaluations as valid
- [ ] Phase end date changes → evaluation deadlines auto-update (test with one project)
- [ ] Project evaluation syncs from last phase when phase evaluations change
- [ ] Custom evaluations (`is_custom_evaluation = TRUE`) work correctly
- [ ] Backend code updated to use new schema
- [ ] No queries reference deleted tables (check application logs)
- [ ] Student portal shows correct evaluation deadlines
- [ ] Professor can view and modify evaluation deadlines

---

## Monitoring & Maintenance

### Check Trigger Performance
```sql
-- Query recently updated evaluations
SELECT * FROM phase_evaluation_forms 
WHERE deadline_updated_at > NOW() - INTERVAL '1 hour'
ORDER BY deadline_updated_at DESC;
```

### Validate All Projects
```sql
-- Run periodic validation
SELECT project_id, COUNT(*) as issue_count
FROM (
  SELECT pp.project_id, validate_evaluation_deadlines(pp.project_id).*
  FROM (SELECT DISTINCT project_id FROM project_phases) pp
) subquery
WHERE is_valid = FALSE
GROUP BY project_id;
```

### Monitor Trigger Execution
If performance issues arise, check trigger logs:
```sql
-- Enable statement logging (requires superuser)
ALTER SYSTEM SET log_min_duration_statement = 5000;
SELECT pg_reload_conf();

-- Then check logs for slow trigger execution
```

---

## Support & Questions

If migrations fail:

1. **Check error message** - provides details on what constraint failed
2. **Review migration output** - scroll up to see data issues
3. **Run validation query** - see what's wrong with existing data
4. **Restore from backup** - if critical issue, restore and troubleshoot
5. **Check application logs** - verify no code is accessing deleted tables

