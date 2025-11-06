# Evaluation Submissions Schema - Aggregated Model

## Table: `phase_evaluation_submissions`

**Purpose**: Store ONE aggregated evaluation submission per evaluator per phase for a group

**Key Principle**: Instead of N rows per evaluator (one per evaluated member), store ONE row containing nested scores for all evaluated members.

### Columns

| Column Name | Type | Constraints | Description |
|-------------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique submission ID |
| `project_id` | UUID | NOT NULL, FK(projects) | Project this phase belongs to |
| `phase_id` | UUID | NOT NULL, FK(project_phases) | The evaluation phase |
| `group_id` | UUID | NOT NULL, FK(course_groups) | The group being evaluated |
| `phase_evaluation_form_id` | UUID | NOT NULL, FK(phase_evaluation_forms) | Form template used |
| `evaluator_id` | UUID | NOT NULL, FK(studentaccounts) | Member performing evaluation |
| `is_custom_evaluation` | BOOLEAN | DEFAULT FALSE | Type: FALSE=built-in criteria grid, TRUE=file upload |
| `evaluation_data` | JSONB | NULL if custom | **Aggregated scores** for all evaluated members (see below) |
| `file_submission_url` | TEXT | NULL if built-in | URL to uploaded evaluation file (custom only) |
| `file_name` | VARCHAR | NULL | Name of uploaded file (custom only) |
| `comments` | TEXT | NULL | Optional overall evaluation comments |
| `status` | VARCHAR | DEFAULT 'not_started' | One of: not_started, in_progress, submitted, graded |
| `submission_date` | TIMESTAMP TZ | NULL | When evaluation was submitted |
| `last_modified` | TIMESTAMP TZ | DEFAULT NOW() | Last update time |
| `created_at` | TIMESTAMP TZ | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMP TZ | DEFAULT NOW() | Auto-updated on record change |

### Unique Constraint

```sql
UNIQUE(phase_id, group_id, evaluator_id, is_custom_evaluation)
```

**Means**: One submission per evaluator per phase, per evaluation type (built-in XOR custom)

### Check Constraints

```sql
-- Custom evaluations must have file URL
CHECK (is_custom_evaluation = FALSE OR file_submission_url IS NOT NULL)

-- Built-in evaluations must have evaluation data
CHECK (is_custom_evaluation = TRUE OR evaluation_data IS NOT NULL)
```

### Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_phase_eval_submissions_project_id` | project_id | Query by project |
| `idx_phase_eval_submissions_phase_id` | phase_id | Query by phase |
| `idx_phase_eval_submissions_group_id` | group_id | Query by group |
| `idx_phase_eval_submissions_evaluator_id` | evaluator_id | Query by evaluator |
| `idx_phase_eval_submissions_status` | status | Filter by submission status |
| `idx_phase_eval_submissions_form_id` | phase_evaluation_form_id | Query by form |
| `idx_phase_eval_submissions_is_custom` | is_custom_evaluation | Filter by type |
| `idx_phase_eval_submissions_phase_evaluator` | phase_id, evaluator_id | Common query pattern |
| `idx_phase_eval_submissions_phase_group_evaluator` | phase_id, group_id, evaluator_id | Find specific submission |

---

## JSONB Data Structures

### Built-In Evaluation Data (is_custom_evaluation = FALSE)

**Purpose**: Store aggregated criterion scores for all group members evaluated by one evaluator

```json
{
  "evaluated_members": {
    "member-uuid-1": {
      "criteria": {
        "criterion-uuid-a": 20,
        "criterion-uuid-b": 25,
        "criterion-uuid-c": 15
      },
      "total": 60,
      "saved_at": "2025-10-26T14:22:00.000Z"
    },
    "member-uuid-2": {
      "criteria": {
        "criterion-uuid-a": 18,
        "criterion-uuid-b": 22,
        "criterion-uuid-c": 20
      },
      "total": 60,
      "saved_at": "2025-10-26T14:22:30.000Z"
    },
    "member-uuid-3": {
      "criteria": {
        "criterion-uuid-a": 19,
        "criterion-uuid-b": 24,
        "criterion-uuid-c": 18
      },
      "total": 61,
      "saved_at": "2025-10-26T14:23:00.000Z"
    }
  },
  "progress": {
    "member-uuid-1": "saved",
    "member-uuid-2": "saved",
    "member-uuid-3": "not_started"
  },
  "aggregate_total": 181,
  "last_updated": "2025-10-26T14:23:00.000Z"
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `evaluated_members` | Object | Keys are member UUIDs, values are evaluation objects |
| `evaluated_members[uuid]` | Object | Individual member's evaluation |
| `.criteria` | Object | Criterion ID → points mapping (e.g., 0-100) |
| `.total` | Number | Sum of all criteria scores for this member |
| `.saved_at` | ISO 8601 String | When this member's evaluation was last saved |
| `progress` | Object | Member UUID → status: "not_started", "in_progress", "saved", "submitted" |
| `aggregate_total` | Number | Sum of all members' totals |
| `last_updated` | ISO 8601 String | When the entire submission was last modified |

#### Validation Rules

1. **Criteria Scores**: Must be numeric, within [0, max_points] for each criterion
2. **Member Totals**: Must be sum of criteria scores
3. **Aggregate Total**: Must be sum of all member totals
4. **Saved Timestamps**: Must be ISO 8601 format, <= current time
5. **Progress Values**: Must be one of "not_started", "in_progress", "saved", "submitted"
6. **Member UUIDs**: Must match actual group member IDs

### Custom Evaluation Data (is_custom_evaluation = TRUE)

**Purpose**: Optional metadata about file-based evaluation

```json
{
  "form_title": "Custom Peer Evaluation - Phase 1 Assessment",
  "submission_date": "2025-10-26T14:30:00.000Z",
  "notes": "Used the PDF form from course materials"
}
```

Or NULL if no metadata needed.

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `form_title` | String | Display name of the evaluation form |
| `submission_date` | ISO 8601 String | When file was submitted |
| `notes` | String | Any additional notes |

---

## Table: `project_evaluation_submissions`

**Purpose**: Store evaluation submissions for PROJECT-level evaluations (mirrors Phase table structure)

### Important Differences from Phase Submissions

1. **Project-Level Scope**: No phase differentiation
2. **Per-Pair vs Aggregated**: Currently uses per-pair model (can be migrated separately)
3. **Same Two Types**: Built-in criteria grid OR custom file upload

### Columns (Current Per-Pair Model)

| Column Name | Type | Description |
|-------------|------|-------------|
| `id` | UUID | Unique submission ID |
| `project_id` | UUID | Project being evaluated |
| `group_id` | UUID | Group being evaluated |
| `project_evaluation_form_id` | UUID | Form template |
| `evaluator_id` | UUID | Evaluating member |
| `evaluated_member_id` | UUID | Evaluated member (NULL for custom) |
| `is_custom_evaluation` | BOOLEAN | Evaluation type |
| `evaluation_data` | JSONB | Criterion scores or metadata |
| `file_submission_url` | TEXT | File URL for custom |
| `file_name` | VARCHAR | Uploaded file name |
| `comments` | TEXT | Comments |
| `total_score` | NUMERIC | Sum of criteria (built-in only) |
| `status` | VARCHAR | Submission status |
| `is_marked_complete` | BOOLEAN | UI completion flag |
| `submission_date` | TIMESTAMP TZ | Submission time |
| `created_at`, `updated_at` | TIMESTAMP TZ | Timestamps |

**Note**: Project submissions currently use per-pair model (one row per evaluated member). Can be aggregated separately if needed.

---

## Query Examples

### Get Current Submission for Evaluator

```sql
SELECT *
FROM phase_evaluation_submissions
WHERE phase_id = $1
  AND group_id = $2
  AND evaluator_id = $3
  AND is_custom_evaluation = $4;
```

### Get All Submissions for Phase

```sql
SELECT
  id,
  evaluator_id,
  is_custom_evaluation,
  status,
  submission_date,
  evaluation_data->'aggregate_total' as total_score
FROM phase_evaluation_submissions
WHERE phase_id = $1
ORDER BY evaluator_id;
```

### Get Specific Member's Scores from Aggregated Submission

```sql
SELECT
  evaluator_id,
  (evaluation_data->'evaluated_members'->'$2'->'total')::numeric as score,
  (evaluation_data->'evaluated_members'->'$2'->'criteria') as criteria,
  (evaluation_data->'evaluated_members'->'$2'->>'saved_at')::timestamp as saved_at
FROM phase_evaluation_submissions
WHERE phase_id = $1
  AND group_id = $3
  AND evaluation_data->'evaluated_members' ? '$2'
  AND is_custom_evaluation = false;
```

### Get Submissions by Status

```sql
SELECT
  id,
  evaluator_id,
  status,
  submission_date,
  CASE 
    WHEN is_custom_evaluation THEN 'Custom File'
    ELSE 'Built-in Criteria'
  END as type
FROM phase_evaluation_submissions
WHERE phase_id = $1
  AND status = 'submitted'
ORDER BY submission_date DESC;
```

### Extract Member Scores for Grading

```sql
SELECT
  p.id,
  p.first_name,
  p.last_name,
  ps.evaluator_id,
  (ps.evaluation_data->'evaluated_members'->p.id::text->'total')::numeric as score,
  COUNT(*) FILTER (WHERE (ps.evaluation_data->'evaluated_members'->p.id::text) IS NOT NULL) OVER (PARTITION BY p.id) as evaluator_count
FROM phase_evaluation_submissions ps
JOIN course_groups cg ON ps.group_id = cg.id
JOIN group_members gm ON cg.id = gm.group_id
JOIN studentaccounts p ON gm.student_id = p.id
WHERE ps.phase_id = $1
  AND ps.is_custom_evaluation = false
  AND ps.status = 'submitted'
ORDER BY p.id;
```

---

## Performance Considerations

### Advantages of Aggregated Model
- **Fewer records**: 75% reduction for typical 4-person groups
- **Single write**: One UPDATE instead of N updates
- **Atomic operations**: All member scores updated together
- **Reduced locks**: Fewer concurrent access issues

### Query Performance
- **JSONB indexing**: Can create GIN or GiST indexes if needed
  ```sql
  CREATE INDEX idx_eval_data_gin ON phase_evaluation_submissions USING GIN(evaluation_data);
  ```
- **Member score lookups**: Use JSONB path operators efficiently
- **Aggregation**: Sum calculated in JSONB (not separate column)

### Backup Considerations
- Single record backup represents entire evaluation
- JSONB can grow large (several KB) for large groups
- Monitor table size with:
  ```sql
  SELECT 
    pg_size_pretty(pg_total_relation_size('phase_evaluation_submissions')) as table_size;
  ```

---

## Constraints & Validation

### Business Rules
1. One and only one submission per (phase, group, evaluator, type)
2. Evaluator cannot be same as evaluated member
3. All evaluated members must exist in group
4. Criterion scores must be non-negative
5. Criterion scores must not exceed max_points
6. Custom evaluations must have file_submission_url
7. Built-in evaluations must have evaluation_data

### Application-Level Validation
- Validate member UUIDs before saving
- Validate criterion scores against form definition
- Validate file URLs (if applicable)
- Validate JSONB structure before insert/update

---

## Migration Notes

When migrating from per-pair to aggregated model:

1. **Aggregation**: GROUP BY (phase_id, group_id, evaluator_id, is_custom_evaluation)
2. **JSONB Construction**: Use jsonb_object_agg() for evaluated_members
3. **Progress Tracking**: Initialize all members as "not_started" or from existing status
4. **Validation**: Verify all data converts correctly
5. **Testing**: Test with various group sizes (2-5 members)

