# Aggregated Evaluation Submissions Model - Migration Guide

## Overview
This document describes the migration from a **per-pair model** (one submission per evaluator-evaluated-member pair) to an **aggregated model** (one submission per evaluator-phase).

## Why Aggregated Model?

### Per-Pair Model Problems
```
Group with 4 members evaluating each other (Phase 1 only):
- Member A evaluates B, C, D (3 records)
- Member B evaluates A, C, D (3 records)
- Member C evaluates A, B, D (3 records)
- Member D evaluates A, B, C (3 records)
TOTAL: 12 records

For multiple phases:
- 2 phases = 24 records
- 3 phases = 36 records
- Per-member and per-pair updates needed when renaming/replacing members
```

### Aggregated Model Benefits
```
Same 4 members in Aggregated Model:
- Member A: 1 record containing scores for B, C, D
- Member B: 1 record containing scores for A, C, D
- Member C: 1 record containing scores for A, B, D
- Member D: 1 record containing scores for A, B, C
TOTAL: 4 records (75% reduction)

For multiple phases:
- 2 phases = 8 records
- 3 phases = 12 records
- Single record update when renaming/replacing members
```

## Database Schema Changes

### Phase Evaluation Submissions Table

#### Removed Columns
- `evaluated_member_id` - No longer needed (all evaluated members in JSONB)
- `total_score` - Calculated from `evaluation_data` instead
- `is_marked_complete` - Navigation state managed in frontend

#### New JSONB Structure for Built-In Evaluations

```json
{
  "evaluated_members": {
    "uuid-of-member-1": {
      "criteria": {
        "criterion-uuid-a": 20,
        "criterion-uuid-b": 25,
        "criterion-uuid-c": 15
      },
      "total": 60,
      "saved_at": "2025-10-26T14:22:00Z"
    },
    "uuid-of-member-2": {
      "criteria": {
        "criterion-uuid-a": 18,
        "criterion-uuid-b": 22,
        "criterion-uuid-c": 20
      },
      "total": 60,
      "saved_at": "2025-10-26T14:23:00Z"
    }
  },
  "progress": {
    "uuid-of-member-1": "saved",
    "uuid-of-member-2": "saved",
    "uuid-of-member-3": "not_started"
  },
  "aggregate_total": 120,
  "last_updated": "2025-10-26T14:23:00Z"
}
```

#### New JSONB Structure for Custom Evaluations

```json
{
  "form_title": "Custom Evaluation Form - Phase 1",
  "submission_date": "2025-10-26T14:30:00Z",
  "notes": "Optional notes about the submission"
}
```
Or NULL if not needed.

### New Unique Constraint

```sql
UNIQUE(phase_id, group_id, evaluator_id, is_custom_evaluation)
```

**Key change:** Instead of per-pair uniqueness, we enforce:
- ONE submission per (phase, group, evaluator) for each evaluation type
- This allows separate tracking of built-in vs custom submissions

### Updated Indexes

Removed:
- `idx_phase_eval_submissions_evaluated_member_id`
- `idx_phase_eval_submissions_marked_complete`

Added:
- `idx_phase_eval_submissions_phase_evaluator`
- `idx_phase_eval_submissions_phase_group_evaluator`

## API Response Changes

### Before (Per-Pair Model)
```json
GET /api/evaluations/phase/:phaseId/group/:groupId

[
  {
    "id": "submit-1",
    "evaluator_id": "member-a",
    "evaluated_member_id": "member-b",
    "criteria": {
      "criterion-1": 20,
      "criterion-2": 25
    },
    "total_score": 45,
    "status": "submitted"
  },
  {
    "id": "submit-2",
    "evaluator_id": "member-a",
    "evaluated_member_id": "member-c",
    "criteria": {
      "criterion-1": 18,
      "criterion-2": 22
    },
    "total_score": 40,
    "status": "submitted"
  },
  {
    "id": "submit-3",
    "evaluator_id": "member-a",
    "evaluated_member_id": "member-d",
    "criteria": {
      "criterion-1": 15,
      "criterion-2": 20
    },
    "total_score": 35,
    "status": "submitted"
  }
]
```

### After (Aggregated Model)
```json
GET /api/evaluations/phase/:phaseId/group/:groupId

[
  {
    "id": "submit-a",
    "evaluator_id": "member-a",
    "is_custom_evaluation": false,
    "evaluation_data": {
      "evaluated_members": {
        "member-b": {
          "criteria": {
            "criterion-1": 20,
            "criterion-2": 25
          },
          "total": 45,
          "saved_at": "2025-10-26T14:22:00Z"
        },
        "member-c": {
          "criteria": {
            "criterion-1": 18,
            "criterion-2": 22
          },
          "total": 40,
          "saved_at": "2025-10-26T14:22:30Z"
        },
        "member-d": {
          "criteria": {
            "criterion-1": 15,
            "criterion-2": 20
          },
          "total": 35,
          "saved_at": "2025-10-26T14:23:00Z"
        }
      },
      "progress": {
        "member-b": "saved",
        "member-c": "saved",
        "member-d": "saved"
      },
      "aggregate_total": 120,
      "last_updated": "2025-10-26T14:23:00Z"
    },
    "status": "submitted",
    "submission_date": "2025-10-26T14:25:00Z"
  }
]
```

## Data Migration Strategy

### Step 1: Backup Current Data
```sql
CREATE TABLE IF NOT EXISTS public.phase_evaluation_submissions_backup AS
SELECT * FROM public.phase_evaluation_submissions;
```

### Step 2: Aggregation Logic
For each (phase_id, group_id, evaluator_id, is_custom_evaluation):
1. **Built-in evaluations**: Group all per-pair records into single JSONB
2. **Custom evaluations**: Keep as-is (already one per evaluator per phase)

```sql
-- Example aggregation for built-in evaluations
SELECT
  phase_id,
  group_id,
  evaluator_id,
  false as is_custom_evaluation,
  jsonb_object_agg(
    evaluated_member_id,
    jsonb_build_object(
      'criteria', evaluation_data,
      'total', total_score,
      'saved_at', last_modified
    )
  ) as evaluated_members,
  CURRENT_TIMESTAMP as created_at
FROM phase_evaluation_submissions
WHERE is_custom_evaluation = false
GROUP BY phase_id, group_id, evaluator_id;
```

### Step 3: Transform Custom Evaluations
Custom evaluations remain mostly the same:
- Keep `file_submission_url`
- Create minimal JSONB metadata
- Set `evaluation_data` to metadata or NULL

### Step 4: Recreate Table
1. Drop old table with cascade
2. Create new table with aggregated schema
3. Populate with aggregated data

### Step 5: Verify Data Integrity
```sql
-- Count checks
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT phase_id) as phases,
  COUNT(DISTINCT group_id) as groups,
  COUNT(DISTINCT evaluator_id) as evaluators
FROM phase_evaluation_submissions;

-- Uniqueness check
SELECT 
  phase_id, group_id, evaluator_id, is_custom_evaluation,
  COUNT(*) as count
FROM phase_evaluation_submissions
GROUP BY phase_id, group_id, evaluator_id, is_custom_evaluation
HAVING COUNT(*) > 1;
```

## Frontend Changes Required

### Modal Component Updates
1. **Data Loading**: Expect single aggregated submission
   ```typescript
   const submission = await getPhaseEvaluation(phaseId, groupId);
   // Now returns ONE submission object, not array
   ```

2. **Member List Navigation**: Extract from `evaluated_members` in JSONB
   ```typescript
   const memberList = Object.keys(submission.evaluation_data.evaluated_members);
   ```

3. **Progress Tracking**: Use `progress` in JSONB
   ```typescript
   const progress = submission.evaluation_data.progress;
   ```

4. **Auto-Save**: Update entire aggregated submission
   ```typescript
   // Save individual member scores, update aggregated record
   const updatedData = {
     ...evaluation_data,
     evaluated_members: {
       ...evaluation_data.evaluated_members,
       [memberId]: { criteria, total, saved_at }
     },
     aggregate_total: calculateTotal(evaluation_data.evaluated_members),
     progress: updateProgress(evaluation_data.progress, memberId)
   };
   ```

### API Endpoint Changes

#### Get Current Submission
```typescript
GET /api/evaluations/phase/:phaseId/group/:groupId
// Now returns aggregated object
Response: {
  id: string,
  evaluator_id: string,
  evaluation_data: AggregatedEvaluationData,
  status: "not_started" | "in_progress" | "submitted",
  submission_date: string | null
}
```

#### Save Submission (Auto-save)
```typescript
PATCH /api/evaluations/submission/:submissionId
Request: {
  evaluation_data: AggregatedEvaluationData,
  status: "in_progress" | "submitted"
}
Response: {
  id: string,
  evaluation_data: AggregatedEvaluationData,
  status: string,
  last_modified: string
}
```

#### Get All Submissions for Phase
```typescript
GET /api/evaluations/phase/:phaseId
// Filter by group as needed
Response: {
  submissions: Array<{
    id: string,
    evaluator_id: string,
    group_id: string,
    is_custom_evaluation: boolean,
    status: string
  }>
}
```

## Constraints & Validations

### Built-In Evaluations
1. `evaluation_data` must be present and valid JSONB
2. Each member in `evaluated_members` must exist in group
3. Criteria IDs must match phase form criteria
4. Scores must be within max_points range
5. No `file_submission_url`

### Custom Evaluations
1. `file_submission_url` must be present
2. `evaluation_data` can be NULL or minimal metadata
3. No `evaluated_members` in JSONB

### Database Constraints
```sql
-- One submission per evaluator per phase
UNIQUE(phase_id, group_id, evaluator_id, is_custom_evaluation)

-- Consistency checks
CHECK (is_custom_evaluation = FALSE OR file_submission_url IS NOT NULL)
CHECK (is_custom_evaluation = TRUE OR evaluation_data IS NOT NULL)
```

## Rollback Plan

If needed to revert:

1. Restore from backup table
2. Extract data from JSONB back to per-pair format
3. Recreate old table schema
4. Reverse application changes

```sql
-- Example rollback for built-in evaluations
SELECT
  id,
  phase_id,
  group_id,
  evaluator_id,
  (evaluated_member.key)::uuid as evaluated_member_id,
  (evaluated_member.value->'criteria') as evaluation_data,
  (evaluated_member.value->>'total')::numeric as total_score,
  status,
  created_at
FROM phase_evaluation_submissions,
  jsonb_each(evaluation_data->'evaluated_members') as evaluated_member
WHERE is_custom_evaluation = false;
```

## Performance Impact

### Positive
- **Read performance**: Single query instead of N queries
- **Storage**: ~75% reduction in records
- **Updates**: Single record update instead of multiple
- **Concurrency**: Fewer locks needed

### Considerations
- JSONB querying requires JSONB operators
- Larger individual records (JSONB can be several KB)
- Query complexity slightly increases for filtering

### Query Examples

```sql
-- Get all evaluations for phase
SELECT * FROM phase_evaluation_submissions
WHERE phase_id = $1;

-- Get specific evaluator's submission
SELECT * FROM phase_evaluation_submissions
WHERE phase_id = $1 AND group_id = $2 AND evaluator_id = $3;

-- Get scores for specific member (requires JSONB path)
SELECT 
  evaluator_id,
  (evaluation_data->'evaluated_members'->'member-uuid'->'total')::numeric as score
FROM phase_evaluation_submissions
WHERE phase_id = $1 
  AND evaluation_data->'evaluated_members' ? 'member-uuid';

-- Get all submissions with progress info
SELECT
  id,
  evaluator_id,
  evaluation_data->'progress' as member_progress,
  (evaluation_data->>'aggregate_total')::numeric as total
FROM phase_evaluation_submissions
WHERE phase_id = $1 AND status = 'submitted';
```

## Testing Checklist

- [ ] Backup successful
- [ ] Aggregation query correct
- [ ] Table recreation successful
- [ ] Data integrity checks pass
- [ ] Frontend loads aggregated data correctly
- [ ] Auto-save works with aggregated model
- [ ] Submit works correctly
- [ ] Grading/calculation works with aggregated scores
- [ ] Reports/analytics work with new structure
- [ ] Performance tests pass
- [ ] Custom evaluations work correctly
- [ ] Rollback procedure tested in development

## Related Files

- `create_evaluation_submission_tables.sql` - Schema definition
- `evaluation_submissions_table.sql` - Legacy per-pair schema (archive)
- `/backend/api/evaluations/` - API endpoints
- `/frontend/modals/EvaluationModal.tsx` - Frontend component
- `EVALUATION_SUBMISSION_SCHEMA.md` - Data structure documentation

