# Backend API Updates for Aggregated Evaluation Model

## Overview
API endpoints must be updated to handle the new aggregated submission structure where one record contains all evaluated members' scores instead of per-pair records.

## Endpoint Changes

### 1. Get Current Evaluation Submission

**Endpoint**: `GET /api/evaluations/phase/:phaseId/group/:groupId/evaluator/:evaluatorId?type=built-in|custom`

#### Before (Per-Pair Model)
```typescript
// Response: Array of submissions (one per evaluated member)
{
  "data": [
    {
      "id": "sub-1",
      "evaluator_id": "eval-uuid",
      "evaluated_member_id": "member-b-uuid",
      "criteria": {
        "criterion-1": 20,
        "criterion-2": 25
      },
      "total_score": 45,
      "status": "submitted"
    },
    {
      "id": "sub-2",
      "evaluator_id": "eval-uuid",
      "evaluated_member_id": "member-c-uuid",
      "criteria": {
        "criterion-1": 18,
        "criterion-2": 22
      },
      "total_score": 40,
      "status": "submitted"
    }
  ]
}
```

#### After (Aggregated Model)
```typescript
// Response: Single aggregated submission
{
  "data": {
    "id": "sub-agg-1",
    "evaluator_id": "eval-uuid",
    "is_custom_evaluation": false,
    "evaluation_data": {
      "evaluated_members": {
        "member-b-uuid": {
          "criteria": {
            "criterion-1": 20,
            "criterion-2": 25
          },
          "total": 45,
          "saved_at": "2025-10-26T14:22:00Z"
        },
        "member-c-uuid": {
          "criteria": {
            "criterion-1": 18,
            "criterion-2": 22
          },
          "total": 40,
          "saved_at": "2025-10-26T14:22:30Z"
        }
      },
      "progress": {
        "member-b-uuid": "saved",
        "member-c-uuid": "saved"
      },
      "aggregate_total": 85,
      "last_updated": "2025-10-26T14:22:30Z"
    },
    "status": "submitted",
    "submission_date": "2025-10-26T14:25:00Z"
  },
  "meta": {
    "evaluated_members": ["member-b-uuid", "member-c-uuid"]
  }
}
```

#### Implementation
```typescript
export async function getPhaseEvaluation(
  phaseId: string,
  groupId: string,
  evaluatorId: string,
  isCustom: boolean = false
): Promise<AggregatedEvaluationSubmission | null> {
  const response = await fetch(
    `/api/evaluations/phase/${phaseId}/group/${groupId}/evaluator/${evaluatorId}?custom=${isCustom}`
  );
  
  if (response.status === 404) {
    return null; // No submission yet
  }
  
  const json = await response.json();
  return json.data;
}
```

---

### 2. Create or Initialize Submission

**Endpoint**: `POST /api/evaluations/phase/:phaseId/group/:groupId`

#### Request
```typescript
{
  "evaluator_id": "string (uuid)",
  "is_custom_evaluation": "boolean",
  "evaluated_member_ids": "string[] (uuids of members being evaluated)",
  "phase_evaluation_form_id": "string (uuid)"
}
```

#### Response
```typescript
{
  "id": "string (uuid)",
  "evaluator_id": "string",
  "is_custom_evaluation": false,
  "evaluation_data": {
    "evaluated_members": {
      "member-1": {
        "criteria": {},
        "total": 0,
        "saved_at": null
      },
      "member-2": {
        "criteria": {},
        "total": 0,
        "saved_at": null
      }
    },
    "progress": {
      "member-1": "not_started",
      "member-2": "not_started"
    },
    "aggregate_total": 0,
    "last_updated": "2025-10-26T14:00:00Z"
  },
  "status": "not_started",
  "submission_date": null
}
```

#### Implementation
```typescript
export async function initializePhaseEvaluation(
  phaseId: string,
  groupId: string,
  evaluatorId: string,
  formId: string,
  memberIds: string[],
  isCustom: boolean = false
): Promise<AggregatedEvaluationSubmission> {
  const response = await fetch(`/api/evaluations/phase/${phaseId}/group/${groupId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evaluator_id: evaluatorId,
      phase_evaluation_form_id: formId,
      evaluated_member_ids: memberIds,
      is_custom_evaluation: isCustom
    })
  });
  
  const json = await response.json();
  return json.data;
}
```

---

### 3. Auto-Save (Update Member Score)

**Endpoint**: `PATCH /api/evaluations/submission/:submissionId`

#### Request
```typescript
{
  "member_id": "string (uuid)",
  "criteria": {
    "criterion-1-uuid": 20,
    "criterion-2-uuid": 25
  },
  "status": "in_progress" | "submitted",
  "comments": "string (optional)"
}
```

#### Response
```typescript
{
  "id": "string",
  "evaluation_data": {
    "evaluated_members": {
      "member-1": {
        "criteria": {
          "criterion-1-uuid": 20,
          "criterion-2-uuid": 25
        },
        "total": 45,
        "saved_at": "2025-10-26T14:22:00Z"
      },
      // ... other members
    },
    "progress": {
      "member-1": "saved",
      // ... other members
    },
    "aggregate_total": 150,
    "last_updated": "2025-10-26T14:22:00Z"
  },
  "status": "in_progress",
  "last_modified": "2025-10-26T14:22:00Z"
}
```

#### Implementation
```typescript
export async function savePhaseEvaluationMember(
  submissionId: string,
  memberId: string,
  criteria: Record<string, number>,
  status: "in_progress" | "submitted" = "in_progress",
  comments?: string
): Promise<AggregatedEvaluationSubmission> {
  const response = await fetch(`/api/evaluations/submission/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      member_id: memberId,
      criteria,
      status,
      comments
    })
  });
  
  const json = await response.json();
  return json.data;
}
```

#### Key Changes from Per-Pair Model
1. **Member-specific update**: Only one member's criteria updated per request
2. **Aggregation**: Backend must recalculate totals and aggregate_total
3. **Progress tracking**: Update member's progress to "saved"
4. **Last updated**: Set to current timestamp

---

### 4. Submit Evaluation

**Endpoint**: `POST /api/evaluations/submission/:submissionId/submit`

#### Request
```typescript
{
  "comments": "string (optional)"
}
```

#### Response
```typescript
{
  "id": "string",
  "status": "submitted",
  "submission_date": "2025-10-26T14:25:00Z",
  "evaluation_data": { /* full aggregated data */ }
}
```

#### Implementation
```typescript
export async function submitPhaseEvaluation(
  submissionId: string,
  comments?: string
): Promise<AggregatedEvaluationSubmission> {
  const response = await fetch(`/api/evaluations/submission/${submissionId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comments })
  });
  
  const json = await response.json();
  return json.data;
}
```

---

### 5. Upload Custom Evaluation File

**Endpoint**: `POST /api/evaluations/submission/:submissionId/upload`

#### Request (multipart/form-data)
```
file: File
```

#### Response
```typescript
{
  "id": "string",
  "is_custom_evaluation": true,
  "file_submission_url": "https://...",
  "file_name": "custom-eval.pdf",
  "evaluation_data": {
    "form_title": "Custom Peer Evaluation",
    "submission_date": "2025-10-26T14:30:00Z"
  },
  "status": "submitted",
  "submission_date": "2025-10-26T14:30:00Z"
}
```

#### Implementation
```typescript
export async function uploadCustomEvaluation(
  submissionId: string,
  file: File
): Promise<AggregatedEvaluationSubmission> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/evaluations/submission/${submissionId}/upload`, {
    method: 'POST',
    body: formData
  });
  
  const json = await response.json();
  return json.data;
}
```

---

### 6. Get All Phase Submissions (for instructor dashboard)

**Endpoint**: `GET /api/evaluations/phase/:phaseId?groupId=:groupId&status=:status`

#### Response
```typescript
{
  "data": [
    {
      "id": "sub-1",
      "evaluator_id": "eval-1-uuid",
      "group_id": "group-uuid",
      "is_custom_evaluation": false,
      "status": "submitted",
      "submission_date": "2025-10-26T14:25:00Z",
      "aggregate_total": 180,
      "evaluated_member_count": 3
    },
    {
      "id": "sub-2",
      "evaluator_id": "eval-2-uuid",
      "group_id": "group-uuid",
      "is_custom_evaluation": false,
      "status": "in_progress",
      "submission_date": null,
      "aggregate_total": 120,
      "evaluated_member_count": 3
    }
  ],
  "meta": {
    "total": 2,
    "submitted": 1,
    "in_progress": 1,
    "not_started": 0
  }
}
```

#### Implementation
```typescript
export async function getPhaseSubmissions(
  phaseId: string,
  groupId?: string,
  status?: string
): Promise<EvaluationSubmissionSummary[]> {
  const params = new URLSearchParams();
  if (groupId) params.append('groupId', groupId);
  if (status) params.append('status', status);
  
  const response = await fetch(
    `/api/evaluations/phase/${phaseId}?${params.toString()}`
  );
  
  const json = await response.json();
  return json.data;
}
```

---

## Backend Implementation Details

### Database Query Examples

#### Create Aggregated Submission
```sql
INSERT INTO public.phase_evaluation_submissions (
  project_id,
  phase_id,
  group_id,
  phase_evaluation_form_id,
  evaluator_id,
  is_custom_evaluation,
  evaluation_data,
  status,
  created_at,
  updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6,
  jsonb_build_object(
    'evaluated_members', jsonb_object_agg(
      member_id::text,
      jsonb_build_object(
        'criteria', '{}'::jsonb,
        'total', 0,
        'saved_at', null
      )
    ),
    'progress', jsonb_object_agg(
      member_id::text,
      'not_started'
    ),
    'aggregate_total', 0,
    'last_updated', now()
  ),
  'not_started',
  now(),
  now()
)
RETURNING *;
```

#### Update Member Score in Aggregated Submission
```sql
UPDATE public.phase_evaluation_submissions
SET
  evaluation_data = jsonb_set(
    jsonb_set(
      evaluation_data,
      '{evaluated_members,' || $2 || ',criteria}',
      $3::jsonb
    ),
    '{evaluated_members,' || $2 || ',total}',
    to_jsonb(($3::jsonb -> 'total')::numeric)
  ) || jsonb_build_object(
    'last_updated', to_jsonb(now())
  ),
  status = $4,
  updated_at = now()
WHERE id = $1
RETURNING *;
```

#### Get Specific Member's Scores
```sql
SELECT
  ps.id,
  ps.evaluator_id,
  (ps.evaluation_data->'evaluated_members'->$2::text->'criteria') as criteria,
  (ps.evaluation_data->'evaluated_members'->$2::text->>'total')::numeric as total,
  (ps.evaluation_data->'evaluated_members'->$2::text->>'saved_at') as saved_at
FROM public.phase_evaluation_submissions ps
WHERE ps.phase_id = $1
  AND ps.is_custom_evaluation = false;
```

### Type Definitions (TypeScript)

```typescript
interface AggregatedEvaluationSubmission {
  id: string;
  project_id: string;
  phase_id: string;
  group_id: string;
  phase_evaluation_form_id: string;
  evaluator_id: string;
  is_custom_evaluation: boolean;
  evaluation_data: AggregatedEvaluationData | null;
  file_submission_url: string | null;
  file_name: string | null;
  comments: string | null;
  status: "not_started" | "in_progress" | "submitted" | "graded";
  submission_date: string | null;
  last_modified: string;
  created_at: string;
  updated_at: string;
}

interface AggregatedEvaluationData {
  evaluated_members: {
    [memberId: string]: {
      criteria: { [criterionId: string]: number };
      total: number;
      saved_at: string | null;
    };
  };
  progress: { [memberId: string]: "not_started" | "in_progress" | "saved" | "submitted" };
  aggregate_total: number;
  last_updated: string;
}

interface EvaluationSubmissionSummary {
  id: string;
  evaluator_id: string;
  group_id: string;
  is_custom_evaluation: boolean;
  status: string;
  submission_date: string | null;
  aggregate_total?: number;
  evaluated_member_count?: number;
}
```

---

## Error Handling

### Common Error Cases

#### 1. Submission Not Found
```json
{
  "error": "Submission not found",
  "code": "SUBMISSION_NOT_FOUND",
  "status": 404
}
```

#### 2. Invalid Member in Group
```json
{
  "error": "Member not in group",
  "code": "INVALID_MEMBER",
  "status": 400,
  "details": {
    "member_id": "uuid",
    "group_id": "uuid"
  }
}
```

#### 3. Evaluation Already Submitted
```json
{
  "error": "Evaluation already submitted",
  "code": "ALREADY_SUBMITTED",
  "status": 409,
  "data": {
    "submission_date": "2025-10-26T14:25:00Z"
  }
}
```

#### 4. Invalid Criterion Score
```json
{
  "error": "Criterion score out of range",
  "code": "INVALID_SCORE",
  "status": 400,
  "details": {
    "criterion_id": "uuid",
    "value": 150,
    "max": 100
  }
}
```

---

## Migration Strategy

### Phase 1: Dual API Support
- Keep per-pair endpoints available
- Add new aggregated endpoints
- Frontend can call either model

### Phase 2: Gradual Frontend Migration
- Update modal component to use aggregated model
- Keep fallback to per-pair if needed
- Test with sample groups

### Phase 3: Database Migration
- Run aggregation script on existing data
- Verify data integrity
- Switch to aggregated model only

### Phase 4: Cleanup
- Remove per-pair endpoints
- Archive legacy code
- Monitor for issues

---

## Performance Optimization

### Caching Strategy
```typescript
// Cache aggregated submission for 30 seconds
const cache = new Map<string, CacheEntry>();

function getCached(submissionId: string): AggregatedEvaluationSubmission | null {
  const entry = cache.get(submissionId);
  if (entry && Date.now() - entry.time < 30000) {
    return entry.data;
  }
  return null;
}

function setCached(submissionId: string, data: AggregatedEvaluationSubmission) {
  cache.set(submissionId, { data, time: Date.now() });
}
```

### Batch Operations
```typescript
// Update multiple members at once
export async function saveBatchEvaluations(
  submissionId: string,
  updates: Array<{ memberId: string; criteria: Record<string, number> }>
): Promise<AggregatedEvaluationSubmission> {
  // Single database update instead of N updates
}
```

---

## Testing Checklist

- [ ] GET submission returns single aggregated object
- [ ] POST to create submission initializes all members
- [ ] PATCH updates only specified member, recalculates totals
- [ ] POST submit changes status and sets submission_date
- [ ] File upload works for custom evaluations
- [ ] Aggregate totals calculate correctly
- [ ] Progress tracking updates correctly
- [ ] Timestamps formatted correctly (ISO 8601)
- [ ] Error cases handled properly
- [ ] Performance acceptable with large groups

