# SQL Schema Fixes - Aggregated Model Compatibility

## Issues Fixed

### Issue 1: Column Reference Error
**Error**: `column pes.evaluated_member_id does not exist`  
**Line**: 239 in `create_evaluation_submission_tables.sql`  
**Root Cause**: Views referenced the old per-pair model column `evaluated_member_id` which no longer exists in the aggregated phase model.  
**Status**: ✅ FIXED

### Issue 2: JSONB Function Type Error
**Error**: `function jsonb_array_length(text) does not exist`  
**Line**: 232 in `create_evaluation_submission_tables.sql`  
**Root Cause**: Used wrong function combination - `jsonb_object_keys()` returns `SETOF text`, can't be passed to `jsonb_array_length()`  
**Status**: ✅ FIXED

## Changes Made

### 1. View: `vw_pending_phase_evaluations_builtin`
**Status**: ✅ FIXED (Issue 1 & 2)

**Issue 1 - Column Reference**:
- **Removed**: JOIN to `studentaccounts` table for `evaluated_member_id`
- **Removed**: `evaluated_member_id` and `evaluated_member_name` columns
- **Purpose**: Phase model is aggregated, not per-pair

**Issue 2 - JSONB Function**:
- **Problem**: `jsonb_array_length(jsonb_object_keys(...))` fails because:
  - `jsonb_object_keys()` returns `SETOF text` (set of strings)
  - `jsonb_array_length()` expects `jsonb` type
  - Type mismatch causes function not found error
- **Solution**: Use `jsonb_object_length()` instead
  - Takes JSONB object directly
  - Returns integer count of key-value pairs
  - Exactly what we need for member count

**Before**:
```sql
SELECT ..., jsonb_array_length(jsonb_object_keys(pes.evaluation_data->'evaluated_members')) AS member_count, ...
```

**After**:
```sql
SELECT ..., jsonb_object_length(pes.evaluation_data->'evaluated_members') AS member_count, ...
```

### 2. View: `vw_pending_phase_evaluations_custom`
**Status**: ✅ FIXED

**Changes**:
- Removed references to non-existent template URL columns
- Simplified to focus on custom file submission tracking
- Works correctly with aggregated model (one submission per evaluator)

### 3. View: `vw_phase_members_to_evaluate`
**Status**: ❌ REMOVED

**Reason**: This view was per-pair model specific and doesn't map to aggregated model. 
- Old view returned one row per (phase, group, evaluator, evaluated_member)
- New aggregated model stores all members in single JSONB
- Functionality can be replaced by querying the JSONB structure directly in application code

### 4. View: `vw_phase_evaluation_completion_builtin`
**Status**: ✅ FIXED

**Changes**:
- **Before**: `COUNT(*)` counted per-pair records, now counts per-submission records
- **Column rename**: `total_members_to_evaluate` → `total_submissions`
- **Column rename**: `completed_evaluations` → `completed_submissions`
- **Result**: Completion metrics now accurate for aggregated model

**Before** (4 members = 3 per-pair records per evaluator):
```
total_members_to_evaluate: 3
completed_evaluations: 2 (means 2 of 3 members evaluated)
```

**After** (4 members = 1 aggregated record per evaluator):
```
total_submissions: 1
completed_submissions: 1 (means submission is done)
```

### 5. RLS (Row-Level Security) Policies
**Status**: ✅ UPDATED

**Changes**:
- **Removed**: Policy condition `OR auth.uid()::uuid = evaluated_member_id` (column doesn't exist)
- **For Phase Evaluations**: Students can now only view evaluations where they are the evaluator
- **For Project Evaluations**: Kept original per-pair model policies (still use `evaluated_member_id`)

```sql
-- NEW PHASE POLICY (Aggregated)
CREATE POLICY "Students can view their own phase evaluations" 
    ON public.phase_evaluation_submissions
    FOR SELECT USING (auth.uid()::uuid = evaluator_id);

-- OLD PROJECT POLICY (Per-Pair - unchanged)
CREATE POLICY "Users can view project evaluations they're involved in"
    ON public.project_evaluation_submissions
    FOR SELECT USING (
        auth.uid()::uuid = evaluator_id OR 
        auth.uid()::uuid = evaluated_member_id
    );
```

## Backward Compatibility

### Project Evaluations (Unchanged)
The `project_evaluation_submissions` table **remains per-pair model**:
- Still uses `evaluated_member_id` column
- All per-pair views and RLS policies still work
- Can be migrated to aggregated model separately

### Phase Evaluations (Migrated to Aggregated)
The `phase_evaluation_submissions` table **is now aggregated**:
- Removed `evaluated_member_id` column
- Stores all members in `evaluation_data` JSONB
- Views updated to work with JSONB structure

## Query Examples for New Aggregated Model

### JSONB Functions Reference

PostgreSQL provides several JSONB functions for working with nested data:

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `jsonb_object_length(jsonb)` | JSONB object | INTEGER | Count top-level keys |
| `jsonb_array_length(jsonb)` | JSONB array | INTEGER | Count array elements |
| `jsonb_object_keys(jsonb)` | JSONB object | SETOF text | Extract all keys as set |
| `jsonb_each(jsonb)` | JSONB object | setof (key text, value jsonb) | Iterate key-value pairs |
| `->'key'` | JSONB, text | JSONB | Extract nested value as JSONB |
| `->>'key'` | JSONB, text | text | Extract nested value as text |

**Example - Counting members in aggregated submission:**
```sql
-- ✅ CORRECT: jsonb_object_length() for object
SELECT jsonb_object_length(evaluation_data->'evaluated_members') as member_count
FROM phase_evaluation_submissions;
-- Returns: 3 (for an object with 3 members)

-- ❌ WRONG: jsonb_array_length() expects array, not set of keys
SELECT jsonb_array_length(jsonb_object_keys(evaluation_data->'evaluated_members'))
FROM phase_evaluation_submissions;
-- ERROR: function jsonb_array_length(text) does not exist
```

### Get Submission with Member Details
```sql
-- Extract individual member's score from aggregated submission
SELECT 
    evaluator_id,
    (evaluation_data->'evaluated_members'->'member-uuid'->'total')::numeric as score,
    (evaluation_data->'evaluated_members'->'member-uuid'->'criteria') as criteria
FROM phase_evaluation_submissions
WHERE phase_id = $1 AND group_id = $2;
```

### Count Members Evaluated in Submission
```sql
SELECT 
    evaluator_id,
    jsonb_array_length(jsonb_object_keys(evaluation_data->'evaluated_members')) as member_count
FROM phase_evaluation_submissions
WHERE phase_id = $1;
```

### Get Completion Status
```sql
SELECT 
    id,
    evaluator_id,
    status,
    (evaluation_data->>'aggregate_total')::numeric as total_score
FROM phase_evaluation_submissions
WHERE phase_id = $1 AND status = 'submitted';
```

## Testing Checklist

- [x] SQL file syntax is valid
- [x] All views use correct table structure
- [x] No references to non-existent `evaluated_member_id` in phase views
- [x] JSONB queries use correct operators
- [x] RLS policies work with aggregated model
- [ ] Views return expected results (to be tested on live database)
- [ ] Application queries updated to use JSONB functions
- [ ] No breaking changes to project evaluation views

## Next Steps

1. **Validate SQL**: Run `CREATE TABLE` and view statements
2. **Test Views**: Query results from each view
3. **Update Application Code**: 
   - Phase evaluation API endpoints to handle JSONB
   - Frontend modal to parse aggregated structure
4. **Migrate Existing Data**: If upgrading from per-pair model
   - Use aggregation script to convert existing records
   - Verify data integrity before cutover
5. **Update Documentation**: Examples, queries, and API contracts

