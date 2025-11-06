# PostgreSQL JSONB Functions Quick Reference

## Problem: Working with Aggregated Evaluation Data

When storing aggregated evaluation data in JSONB, you need to query nested structures efficiently. Here are the correct functions to use:

## Data Structure Example

```json
{
  "evaluated_members": {
    "member-uuid-1": {
      "criteria": { "crit-1": 20, "crit-2": 25 },
      "total": 45,
      "saved_at": "2025-10-26T14:22:00Z"
    },
    "member-uuid-2": {
      "criteria": { "crit-1": 18, "crit-2": 22 },
      "total": 40,
      "saved_at": "2025-10-26T14:22:30Z"
    }
  },
  "progress": {
    "member-uuid-1": "saved",
    "member-uuid-2": "saved"
  },
  "aggregate_total": 85,
  "last_updated": "2025-10-26T14:22:30Z"
}
```

## Common Queries

### 1. Count Number of Members Evaluated
```sql
-- ✅ CORRECT
SELECT 
  evaluator_id,
  jsonb_object_length(evaluation_data->'evaluated_members') as member_count
FROM phase_evaluation_submissions
WHERE phase_id = $1;

-- Returns: INTEGER (e.g., 2, 3, 4, etc.)
```

### 2. Get Specific Member's Score
```sql
-- Extract score for member-uuid-1
SELECT 
  evaluator_id,
  (evaluation_data->'evaluated_members'->'member-uuid-1'->>'total')::numeric as score
FROM phase_evaluation_submissions
WHERE phase_id = $1;

-- Returns: NUMERIC (e.g., 45.00)
-- ->> converts JSONB to text, then cast to numeric
```

### 3. Get Aggregate Total
```sql
SELECT 
  evaluator_id,
  (evaluation_data->>'aggregate_total')::numeric as total_score
FROM phase_evaluation_submissions
WHERE phase_id = $1;

-- Returns: NUMERIC (e.g., 85.00)
```

### 4. Check if Member Exists in Submission
```sql
SELECT 
  evaluator_id,
  evaluation_data->'evaluated_members' ? 'member-uuid-1' as member_exists
FROM phase_evaluation_submissions
WHERE phase_id = $1;

-- ? operator checks key existence
-- Returns: BOOLEAN (true/false)
```

### 5. List All Member UUIDs
```sql
SELECT 
  evaluator_id,
  jsonb_object_keys(evaluation_data->'evaluated_members') as member_uuid
FROM phase_evaluation_submissions
WHERE phase_id = $1;

-- Returns: Set of text (one row per member)
```

### 6. Extract All Member Criteria for One Member
```sql
SELECT 
  evaluator_id,
  (evaluation_data->'evaluated_members'->'member-uuid-1'->'criteria') as criteria_scores
FROM phase_evaluation_submissions
WHERE phase_id = $1;

-- Returns: JSONB object like { "crit-1": 20, "crit-2": 25 }
```

### 7. Get Member Progress Status
```sql
SELECT 
  evaluator_id,
  (evaluation_data->'progress'->>'member-uuid-1') as member_status
FROM phase_evaluation_submissions
WHERE phase_id = $1;

-- Returns: TEXT (one of: "not_started", "in_progress", "saved", "submitted")
```

### 8. Get All Completed Members (Progress = "saved")
```sql
SELECT 
  evaluator_id,
  jsonb_object_keys(evaluation_data->'progress') as member_uuid
FROM phase_evaluation_submissions,
  jsonb_each_text(evaluation_data->'progress') as progress
WHERE phase_id = $1
  AND progress.value = 'saved';

-- Returns: Set of member UUIDs that have been saved
```

### 9. Calculate Average Score Across All Members
```sql
SELECT 
  evaluator_id,
  AVG((item.value->>'total')::numeric) as average_member_score,
  (evaluation_data->>'aggregate_total')::numeric as total_score
FROM phase_evaluation_submissions,
  jsonb_each(evaluation_data->'evaluated_members') as item
WHERE phase_id = $1
GROUP BY evaluator_id, evaluation_data->>'aggregate_total';

-- Returns: Average score per member, and the aggregate total
```

### 10. Find Incomplete Submissions (Any Member Not Saved)
```sql
SELECT 
  id,
  evaluator_id,
  COUNT(*) as total_members,
  COUNT(CASE WHEN progress.value = 'saved' THEN 1 END) as completed_members,
  COUNT(CASE WHEN progress.value != 'saved' THEN 1 END) as pending_members
FROM phase_evaluation_submissions,
  jsonb_each_text(evaluation_data->'progress') as progress
WHERE phase_id = $1
  AND status != 'submitted'
GROUP BY id, evaluator_id
HAVING COUNT(CASE WHEN progress.value != 'saved' THEN 1 END) > 0;

-- Returns: Submissions with any incomplete members
```

## Function Reference Table

| Task | Function | Input | Output | Syntax |
|------|----------|-------|--------|--------|
| Count object keys | `jsonb_object_length()` | JSONB object | INTEGER | `jsonb_object_length(data->'key')` |
| Count array elements | `jsonb_array_length()` | JSONB array | INTEGER | `jsonb_array_length(data->'key')` |
| Extract all keys | `jsonb_object_keys()` | JSONB object | SETOF text | `jsonb_object_keys(data->'key')` |
| Iterate key-value pairs | `jsonb_each()` | JSONB object | setof (key text, value jsonb) | `jsonb_each(data->'key')` |
| Iterate text key-value pairs | `jsonb_each_text()` | JSONB object | setof (key text, value text) | `jsonb_each_text(data->'key')` |
| Check key exists | `?` operator | JSONB, text | BOOLEAN | `data ? 'key'` |
| Extract as JSONB | `->` operator | JSONB, text/int | JSONB | `data->'key'` |
| Extract as text | `->>` operator | JSONB, text/int | text | `data->>'key'` |
| Extract path as JSONB | `#>` operator | JSONB, text[] | JSONB | `data#>'{key,nested}'` |
| Extract path as text | `#>>` operator | JSONB, text[] | text | `data#>>'{key,nested}'` |

## Common Mistakes

### ❌ WRONG: Mixing array and object functions
```sql
-- ERROR: jsonb_array_length(text) does not exist
SELECT jsonb_array_length(jsonb_object_keys(data->'key'))
FROM table;

-- REASON: jsonb_object_keys() returns SETOF text, not JSONB array
-- FIX: Use jsonb_object_length() for objects
SELECT jsonb_object_length(data->'key')
FROM table;
```

### ❌ WRONG: Missing type cast
```sql
-- RETURNS: text "45" instead of numeric 45
SELECT evaluation_data->'evaluated_members'->'member-1'->>'total'
FROM table;

-- FIX: Cast to numeric
SELECT (evaluation_data->'evaluated_members'->'member-1'->>'total')::numeric
FROM table;
```

### ❌ WRONG: Using wrong arrow operator
```sql
-- ERROR: -> returns JSONB, can't compare to text
SELECT *
FROM table
WHERE evaluation_data->'progress'->'member-1' = 'saved';

-- FIX: Use ->> to convert to text
SELECT *
FROM table
WHERE (evaluation_data->'progress'->>'member-1') = 'saved';
```

## Performance Tips

1. **Index JSONB columns** for faster queries:
   ```sql
   CREATE INDEX idx_eval_data_gin ON phase_evaluation_submissions 
   USING GIN(evaluation_data);
   ```

2. **Use JSONB operators** instead of converting to text:
   ```sql
   -- FAST: Uses index if available
   SELECT * FROM table WHERE data ? 'key';
   
   -- SLOW: Full scan
   SELECT * FROM table WHERE data::text LIKE '%key%';
   ```

3. **Cache computed values** if queried frequently:
   - Store `aggregate_total` directly (not computed)
   - Store `member_count` if queried often
   - Keep JSONB for detailed data

## PostgreSQL Version Support

These functions work in PostgreSQL 9.3+:
- `jsonb_object_length()` - 9.3+
- `jsonb_array_length()` - 9.3+
- `jsonb_object_keys()` - 9.3+
- `jsonb_each()` - 9.3+
- `jsonb_each_text()` - 9.3+

Check your version:
```sql
SELECT version();
```

