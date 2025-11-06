# Aggregated Model SQL - Ready for Deployment

## Status: ✅ All Syntax Errors Fixed

This document contains the corrected SQL schema ready for deployment to your PostgreSQL database.

## Key Fixes Applied

1. **Removed non-existent column references**: `evaluated_member_id` from phase tables
2. **Fixed JSONB functions**: Use `jsonb_object_length()` instead of `jsonb_array_length(jsonb_object_keys())`
3. **Updated RLS policies**: Removed references to removed columns
4. **Simplified views**: Removed per-pair logic, added aggregated logic

## SQL Statements to Execute

### 1. Create Phase Evaluation Submissions Table

```sql
CREATE TABLE IF NOT EXISTS public.phase_evaluation_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
    phase_evaluation_form_id UUID NOT NULL REFERENCES public.phase_evaluation_forms(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES public.studentaccounts(id) ON DELETE CASCADE,
    is_custom_evaluation BOOLEAN DEFAULT FALSE,
    evaluation_data JSONB,
    file_submission_url TEXT,
    file_name VARCHAR,
    comments TEXT,
    status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded')),
    submission_date TIMESTAMP WITH TIME ZONE,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_custom_has_file CHECK (
        is_custom_evaluation = FALSE OR file_submission_url IS NOT NULL
    ),
    CONSTRAINT check_builtin_has_eval_data CHECK (
        is_custom_evaluation = TRUE OR evaluation_data IS NOT NULL
    ),
    UNIQUE(phase_id, group_id, evaluator_id, is_custom_evaluation)
);
```

### 2. Create Indexes for Phase Submissions

```sql
CREATE INDEX idx_phase_eval_submissions_project_id ON public.phase_evaluation_submissions(project_id);
CREATE INDEX idx_phase_eval_submissions_phase_id ON public.phase_evaluation_submissions(phase_id);
CREATE INDEX idx_phase_eval_submissions_group_id ON public.phase_evaluation_submissions(group_id);
CREATE INDEX idx_phase_eval_submissions_evaluator_id ON public.phase_evaluation_submissions(evaluator_id);
CREATE INDEX idx_phase_eval_submissions_status ON public.phase_evaluation_submissions(status);
CREATE INDEX idx_phase_eval_submissions_form_id ON public.phase_evaluation_submissions(phase_evaluation_form_id);
CREATE INDEX idx_phase_eval_submissions_is_custom ON public.phase_evaluation_submissions(is_custom_evaluation);
CREATE INDEX idx_phase_eval_submissions_phase_evaluator ON public.phase_evaluation_submissions(phase_id, evaluator_id);
CREATE INDEX idx_phase_eval_submissions_phase_group_evaluator ON public.phase_evaluation_submissions(phase_id, group_id, evaluator_id);
```

### 3. Create Views for Phase Evaluations

#### View: Pending Built-In Phase Evaluations
```sql
CREATE OR REPLACE VIEW public.vw_pending_phase_evaluations_builtin AS
SELECT 
    pes.id,
    pes.project_id,
    pes.phase_id,
    pes.group_id,
    pes.evaluator_id,
    p.title AS project_title,
    pp.phase_number,
    pp.title AS phase_title,
    pef.due_date,
    pes.status,
    jsonb_object_length(pes.evaluation_data->'evaluated_members') AS member_count,
    pes.evaluation_data,
    pes.created_at
FROM public.phase_evaluation_submissions pes
JOIN public.projects p ON pes.project_id = p.id
JOIN public.project_phases pp ON pes.phase_id = pp.id
JOIN public.phase_evaluation_forms pef ON pes.phase_evaluation_form_id = pef.id
WHERE pes.is_custom_evaluation = FALSE
  AND pes.status != 'submitted'
ORDER BY pef.due_date, pes.created_at;
```

#### View: Pending Custom Phase Evaluations
```sql
CREATE OR REPLACE VIEW public.vw_pending_phase_evaluations_custom AS
SELECT 
    pes.id,
    pes.project_id,
    pes.phase_id,
    pes.group_id,
    pes.evaluator_id,
    p.title AS project_title,
    pp.phase_number,
    pp.title AS phase_title,
    pef.due_date,
    pes.status,
    pes.file_submission_url,
    pes.file_name,
    pes.created_at
FROM public.phase_evaluation_submissions pes
JOIN public.projects p ON pes.project_id = p.id
JOIN public.project_phases pp ON pes.phase_id = pp.id
JOIN public.phase_evaluation_forms pef ON pes.phase_evaluation_form_id = pef.id
WHERE pes.is_custom_evaluation = TRUE
  AND pes.status != 'submitted'
ORDER BY pef.due_date;
```

#### View: Built-In Phase Evaluation Completion Stats
```sql
CREATE OR REPLACE VIEW public.vw_phase_evaluation_completion_builtin AS
SELECT 
    pes.project_id,
    pes.phase_id,
    pes.group_id,
    pes.evaluator_id,
    COUNT(*) AS total_submissions,
    COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) AS completed_submissions,
    ROUND(100.0 * COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) / COUNT(*), 2) AS completion_percentage
FROM public.phase_evaluation_submissions pes
WHERE pes.is_custom_evaluation = FALSE
GROUP BY pes.project_id, pes.phase_id, pes.group_id, pes.evaluator_id;
```

#### View: Custom Phase Evaluation Completion Stats
```sql
CREATE OR REPLACE VIEW public.vw_phase_evaluation_completion_custom AS
SELECT 
    pes.project_id,
    pes.phase_id,
    pes.group_id,
    COUNT(*) AS total_required_submissions,
    COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) AS completed_submissions,
    ROUND(100.0 * COUNT(CASE WHEN pes.status = 'submitted' THEN 1 END) / COUNT(*), 2) AS completion_percentage
FROM public.phase_evaluation_submissions pes
WHERE pes.is_custom_evaluation = TRUE
GROUP BY pes.project_id, pes.phase_id, pes.group_id;
```

## Common JSONB Queries

### Get Member Count
```sql
SELECT 
  jsonb_object_length(evaluation_data->'evaluated_members') as member_count
FROM phase_evaluation_submissions
WHERE phase_id = $1 AND group_id = $2 AND evaluator_id = $3;
```

### Get Specific Member's Score
```sql
SELECT 
  (evaluation_data->'evaluated_members'->'member-uuid'->>'total')::numeric as score
FROM phase_evaluation_submissions
WHERE phase_id = $1 AND group_id = $2 AND evaluator_id = $3;
```

### Get Member Progress Status
```sql
SELECT 
  (evaluation_data->'progress'->>'member-uuid') as member_status
FROM phase_evaluation_submissions
WHERE phase_id = $1;
```

### Check if Member in Submission
```sql
SELECT *
FROM phase_evaluation_submissions
WHERE phase_id = $1 AND evaluation_data->'evaluated_members' ? 'member-uuid';
```

## Deployment Steps

1. **Backup Current Database**
   ```sql
   -- Create backup schema
   CREATE SCHEMA IF NOT EXISTS schema_backup;
   -- Copy existing tables if they exist
   ```

2. **Execute Schema Creation** (from create_evaluation_submission_tables.sql)
   ```bash
   psql -U your_user -d your_database -f backend/create_evaluation_submission_tables.sql
   ```

3. **Verify Tables Exist**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name LIKE 'phase_evaluation%';
   ```

4. **Verify Views Exist**
   ```sql
   SELECT viewname FROM pg_views 
   WHERE schemaname = 'public' AND viewname LIKE 'vw_phase%';
   ```

5. **Test Views Return Data** (will be empty initially)
   ```sql
   SELECT * FROM public.vw_pending_phase_evaluations_builtin LIMIT 1;
   SELECT * FROM public.vw_pending_phase_evaluations_custom LIMIT 1;
   ```

## Verification Commands

### Check Table Schema
```sql
\d+ public.phase_evaluation_submissions
```

### Check All Indexes
```sql
SELECT * FROM pg_indexes 
WHERE tablename = 'phase_evaluation_submissions';
```

### Check All Views
```sql
\d+ public.vw_pending_phase_evaluations_builtin
\d+ public.vw_pending_phase_evaluations_custom
```

### Verify Unique Constraint
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'phase_evaluation_submissions' 
AND constraint_type = 'UNIQUE';
```

## Error Prevention

✅ **All Fixed Issues**:
- Column references: All use aggregated model columns only
- JSONB functions: Use correct type-safe functions
- Type casting: Proper ->> operators for text conversion
- Constraints: Properly defined check constraints

❌ **DO NOT**:
- Reference `evaluated_member_id` in phase submissions (column doesn't exist)
- Use `jsonb_array_length(jsonb_object_keys(...))` (type mismatch)
- Try to JOIN on evaluated_member_id (won't work)
- Create per-pair records (violates unique constraint)

## Performance Notes

### Index Strategy
- **phase_id, evaluator_id**: Quick lookup by evaluator
- **phase_id, group_id, evaluator_id**: Most specific query pattern
- **evaluator_id**: Find all submissions by evaluator
- **status**: Filter by submission status

### JSONB Performance
- JSONB operations are indexed via GIN indexes
- `jsonb_object_length()` is fast (no iteration)
- Use operator `?` for key existence checks
- Prefer ->/'>> operators over casting to text

## Monitoring

### Check Table Size
```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('phase_evaluation_submissions')) as size,
  COUNT(*) as record_count
FROM phase_evaluation_submissions;
```

### Monitor Index Usage
```sql
SELECT 
  schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'phase_evaluation_submissions'
ORDER BY idx_scan DESC;
```

## Support & Documentation

- **Schema Reference**: `EVALUATION_SUBMISSION_SCHEMA_AGGREGATED.md`
- **JSONB Functions**: `JSONB_FUNCTIONS_REFERENCE.md`
- **Migration Guide**: `AGGREGATED_EVALUATION_MODEL_MIGRATION.md`
- **API Changes**: `BACKEND_API_UPDATES_AGGREGATED.md`
- **Frontend Guide**: `FRONTEND_IMPLEMENTATION_AGGREGATED.md`

