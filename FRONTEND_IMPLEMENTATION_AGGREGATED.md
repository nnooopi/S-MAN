# Frontend Implementation Guide - Aggregated Evaluation Model

## Overview
The frontend modal component must be updated to work with aggregated submissions where one record contains all evaluated members' scores.

## Key Changes from Per-Pair Model

### Data Structure Change
```typescript
// OLD (Per-Pair Model): Array of submissions
[
  { evaluator: "A", evaluated: "B", criteria: {...} },
  { evaluator: "A", evaluated: "C", criteria: {...} },
  { evaluator: "A", evaluated: "D", criteria: {...} }
]

// NEW (Aggregated Model): Single submission
{
  evaluator: "A",
  evaluation_data: {
    evaluated_members: {
      "B": { criteria: {...} },
      "C": { criteria: {...} },
      "D": { criteria: {...} }
    }
  }
}
```

### Component Responsibilities
1. **Load**: Fetch single aggregated submission
2. **Parse**: Extract member list from JSONB
3. **Navigate**: Display member selector (left column)
4. **Edit**: Update individual member scores
5. **Save**: Auto-save updates individual member in aggregated record
6. **Submit**: Mark entire submission as submitted

---

## Component Structure

### Parent Component: EvaluationModal

```typescript
interface EvaluationModalProps {
  phaseId: string;
  groupId: string;
  evaluatorId: string;
  formId: string;
  isCustom?: boolean;
  groupMembers: GroupMember[];
  onClose: () => void;
  onSubmit?: () => void;
}

export function EvaluationModal({
  phaseId,
  groupId,
  evaluatorId,
  formId,
  isCustom = false,
  groupMembers,
  onClose,
  onSubmit
}: EvaluationModalProps) {
  // State
  const [submission, setSubmission] = useState<AggregatedEvaluationSubmission | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load submission on mount
  useEffect(() => {
    loadSubmission();
  }, [phaseId, groupId, evaluatorId, isCustom]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const existing = await getPhaseEvaluation(phaseId, groupId, evaluatorId, isCustom);
      
      if (!existing) {
        // Create new aggregated submission
        const memberIds = groupMembers
          .filter(m => m.id !== evaluatorId)
          .map(m => m.id);
        
        const newSubmission = await initializePhaseEvaluation(
          phaseId,
          groupId,
          evaluatorId,
          formId,
          memberIds,
          isCustom
        );
        setSubmission(newSubmission);
        setCurrentMemberId(memberIds[0]); // Start with first member
      } else {
        setSubmission(existing);
        // Set first unevaluated or first member
        const evaluatedMembers = Object.keys(existing.evaluation_data.evaluated_members);
        setCurrentMemberId(evaluatedMembers[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMember = async (
    memberId: string,
    criteria: Record<string, number>,
    status: "in_progress" | "submitted" = "in_progress"
  ) => {
    if (!submission) return;
    
    try {
      setIsSaving(true);
      const updated = await savePhaseEvaluationMember(
        submission.id,
        memberId,
        { ...criteria, total: Object.values(criteria).reduce((a, b) => a + b, 0) },
        status
      );
      setSubmission(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save evaluation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!submission) return;
    
    try {
      setIsSaving(true);
      const updated = await submitPhaseEvaluation(submission.id);
      setSubmission(updated);
      onSubmit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit evaluation');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  if (!submission) return <div>No submission found</div>;

  return (
    <div className="evaluation-modal">
      <header className="modal-header">
        <h2>{isCustom ? "Custom Evaluation" : "Peer Evaluation"}</h2>
        <button onClick={onClose}>×</button>
      </header>

      <div className="modal-body">
        <MemberList
          submission={submission}
          currentMemberId={currentMemberId}
          onSelectMember={setCurrentMemberId}
        />

        <EvaluationContent
          submission={submission}
          currentMemberId={currentMemberId}
          isCustom={isCustom}
          isSaving={isSaving}
          onSaveMember={handleSaveMember}
        />
      </div>

      <footer className="modal-footer">
        <div className="progress-summary">
          {submission.status === 'submitted' ? (
            <span className="submitted">✓ Submitted</span>
          ) : (
            <ProgressIndicator
              total={Object.keys(submission.evaluation_data.evaluated_members).length}
              completed={Object.values(submission.evaluation_data.progress)
                .filter(p => p === 'saved').length}
            />
          )}
        </div>

        <div className="actions">
          <button onClick={onClose} disabled={isSaving}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || submission.status === 'submitted'}
            className="primary"
          >
            {submission.status === 'submitted' ? 'Submitted' : 'Submit Evaluation'}
          </button>
        </div>
      </footer>
    </div>
  );
}
```

---

### Left Column: Member List Component

```typescript
interface MemberListProps {
  submission: AggregatedEvaluationSubmission;
  currentMemberId: string | null;
  onSelectMember: (memberId: string) => void;
}

export function MemberList({
  submission,
  currentMemberId,
  onSelectMember
}: MemberListProps) {
  const evaluatedMembers = Object.entries(submission.evaluation_data.evaluated_members || {});
  const progress = submission.evaluation_data.progress || {};

  return (
    <div className="member-list">
      <h3>Evaluate Members</h3>
      
      <ul className="members">
        {evaluatedMembers.map(([memberId, memberData]) => (
          <li
            key={memberId}
            className={`member-item ${currentMemberId === memberId ? 'active' : ''}`}
            onClick={() => onSelectMember(memberId)}
          >
            {/* Checkmark if saved */}
            {progress[memberId] === 'saved' && (
              <span className="checkmark">✓</span>
            )}
            
            {/* Member display */}
            <span className="member-name">
              {getMemberName(memberId)} {/* lookup from group members */}
            </span>

            {/* Score preview */}
            {memberData.total > 0 && (
              <span className="score-preview">{memberData.total}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Summary */}
      <div className="summary">
        <div className="aggregate">
          <strong>Total:</strong> {submission.evaluation_data.aggregate_total}
        </div>
        <div className="progress-stats">
          <small>
            {Object.values(progress).filter(p => p === 'saved').length} 
            / 
            {Object.keys(progress).length} completed
          </small>
        </div>
      </div>
    </div>
  );
}
```

---

### Right Column: Evaluation Content Component

#### Built-In Evaluation
```typescript
interface BuiltInEvaluationContentProps {
  submission: AggregatedEvaluationSubmission;
  currentMemberId: string;
  isSaving: boolean;
  form: PhaseEvaluationForm;
  onSaveMember: (memberId: string, criteria: Record<string, number>, status: string) => Promise<void>;
}

export function BuiltInEvaluationContent({
  submission,
  currentMemberId,
  isSaving,
  form,
  onSaveMember
}: BuiltInEvaluationContentProps) {
  const [criteria, setCriteria] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Load member's current criteria
  useEffect(() => {
    const memberData = submission.evaluation_data.evaluated_members[currentMemberId];
    if (memberData) {
      setCriteria(memberData.criteria || {});
      setIsDirty(false);
    }
  }, [currentMemberId, submission]);

  const handleCriterionChange = (criterionId: string, value: number) => {
    setCriteria(prev => ({
      ...prev,
      [criterionId]: value
    }));
    setIsDirty(true);
  };

  const handleAutoSave = async () => {
    if (!isDirty) return;
    
    try {
      await onSaveMember(currentMemberId, criteria, 'in_progress');
      setIsDirty(false);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  return (
    <div className="evaluation-content built-in">
      <h3>{getMemberName(currentMemberId)}</h3>

      <div className="criteria-grid">
        {form.criteria.map(criterion => (
          <div key={criterion.id} className="criterion-input">
            <label>{criterion.name}</label>
            <div className="input-group">
              <input
                type="number"
                min={0}
                max={criterion.max_points}
                value={criteria[criterion.id] || ''}
                onChange={e => handleCriterionChange(criterion.id, parseInt(e.target.value, 10))}
                onBlur={handleAutoSave}
                disabled={isSaving}
              />
              <span className="max">{criterion.max_points}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="total-section">
        <strong>Total:</strong>
        <span className="total-value">
          {Object.values(criteria).reduce((a, b) => a + b, 0)}
        </span>
      </div>

      {isDirty && (
        <div className="unsaved-indicator">
          <small>unsaved changes</small>
        </div>
      )}
    </div>
  );
}
```

#### Custom Evaluation
```typescript
interface CustomEvaluationContentProps {
  submission: AggregatedEvaluationSubmission;
  isSaving: boolean;
  onUpload: (file: File) => Promise<void>;
}

export function CustomEvaluationContent({
  submission,
  isSaving,
  onUpload
}: CustomEvaluationContentProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes('pdf') && !file.type.includes('application')) {
      alert('Please upload a PDF or document file');
      return;
    }

    try {
      await onUpload(file);
    } catch (err) {
      alert('Failed to upload file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="evaluation-content custom">
      {submission.file_submission_url ? (
        <div className="file-uploaded">
          <div className="success-checkmark">✓</div>
          <p>File Submitted</p>
          <p className="filename">{submission.file_name}</p>
          <p className="submit-date">
            Submitted: {new Date(submission.submission_date!).toLocaleString()}
          </p>
          
          <a
            href={submission.file_submission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="view-file"
          >
            View File
          </a>
        </div>
      ) : (
        <div
          className={`file-upload ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="upload-icon">📄</div>
          <p>Drag and drop your evaluation file here</p>
          <p className="or">or</p>
          <label className="file-input">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              disabled={isSaving}
            />
            Browse Files
          </label>
          <p className="hint">Accepted formats: PDF, DOC, DOCX</p>
        </div>
      )}
    </div>
  );
}
```

---

## State Management

### Submission State
```typescript
interface EvaluationState {
  submission: AggregatedEvaluationSubmission | null;
  currentMemberId: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: Record<string, boolean>; // Track dirty state per member
}

const initialState: EvaluationState = {
  submission: null,
  currentMemberId: null,
  loading: false,
  saving: false,
  error: null,
  isDirty: {}
};

// Reducer for complex state management
function evaluationReducer(state: EvaluationState, action: EvaluationAction): EvaluationState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    
    case 'LOAD_SUCCESS':
      return {
        ...state,
        loading: false,
        submission: action.payload,
        currentMemberId: Object.keys(action.payload.evaluation_data.evaluated_members)[0]
      };
    
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.payload };
    
    case 'SELECT_MEMBER':
      return { ...state, currentMemberId: action.payload };
    
    case 'SAVE_START':
      return { ...state, saving: true };
    
    case 'SAVE_SUCCESS':
      return {
        ...state,
        saving: false,
        submission: action.payload,
        isDirty: { ...state.isDirty, [state.currentMemberId || '']: false }
      };
    
    case 'MARK_DIRTY':
      return {
        ...state,
        isDirty: { ...state.isDirty, [action.payload]: true }
      };
    
    default:
      return state;
  }
}
```

---

## Auto-Save Implementation

```typescript
// Debounced auto-save on field changes
const useAutoSave = (submissionId: string, memberId: string, criteria: Record<string, number>) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<Record<string, number>>(criteria);

  useEffect(() => {
    // Only save if criteria actually changed
    if (JSON.stringify(criteria) === JSON.stringify(lastSavedRef.current)) {
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce: wait 1 second of inactivity before saving
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await savePhaseEvaluationMember(
          submissionId,
          memberId,
          {
            ...criteria,
            total: Object.values(criteria).reduce((a, b) => a + b, 0)
          },
          'in_progress'
        );
        lastSavedRef.current = criteria;
        setSaveStatus('saved');
        
        // Clear "saved" indicator after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [submissionId, memberId, criteria]);

  return saveStatus;
};
```

---

## Navigation Between Members

```typescript
export function MemberNavigationControls({
  submission,
  currentMemberId,
  onSelectMember
}: NavigationProps) {
  const memberIds = Object.keys(submission.evaluation_data.evaluated_members || {});
  const currentIndex = memberIds.indexOf(currentMemberId || '');

  const goToNext = () => {
    if (currentIndex < memberIds.length - 1) {
      onSelectMember(memberIds[currentIndex + 1]);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      onSelectMember(memberIds[currentIndex - 1]);
    }
  };

  return (
    <div className="navigation-controls">
      <button onClick={goToPrevious} disabled={currentIndex <= 0}>
        ← Previous
      </button>
      
      <span className="current">
        {currentIndex + 1} / {memberIds.length}
      </span>
      
      <button onClick={goToNext} disabled={currentIndex >= memberIds.length - 1}>
        Next →
      </button>
    </div>
  );
}
```

---

## Validation

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateEvaluationData(
  data: AggregatedEvaluationData,
  form: PhaseEvaluationForm
): ValidationResult {
  const errors: string[] = [];

  // Check all members have been evaluated
  for (const [memberId, memberData] of Object.entries(data.evaluated_members)) {
    // All criteria must be present
    for (const criterion of form.criteria) {
      if (!(criterion.id in memberData.criteria)) {
        errors.push(`${getMemberName(memberId)}: Missing criterion "${criterion.name}"`);
      }

      // Score must be in valid range
      const score = memberData.criteria[criterion.id];
      if (score < 0 || score > criterion.max_points) {
        errors.push(
          `${getMemberName(memberId)}: "${criterion.name}" must be 0-${criterion.max_points}, got ${score}`
        );
      }
    }

    // Total must match sum
    const expectedTotal = Object.values(memberData.criteria).reduce((a, b) => a + b, 0);
    if (memberData.total !== expectedTotal) {
      errors.push(`${getMemberName(memberId)}: Total mismatch (${memberData.total} vs ${expectedTotal})`);
    }
  }

  // Aggregate total must match sum of member totals
  const expectedAggregate = Object.values(data.evaluated_members)
    .reduce((sum, member) => sum + member.total, 0);
  if (data.aggregate_total !== expectedAggregate) {
    errors.push(`Aggregate total mismatch (${data.aggregate_total} vs ${expectedAggregate})`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

## Performance Optimizations

### Memoization
```typescript
const MemberListMemo = React.memo(MemberList, (prev, next) => {
  return (
    prev.currentMemberId === next.currentMemberId &&
    prev.submission.id === next.submission.id &&
    JSON.stringify(prev.submission.evaluation_data) === 
    JSON.stringify(next.submission.evaluation_data)
  );
});
```

### Virtualization for Large Groups
```typescript
import { FixedSizeList as List } from 'react-window';

export function VirtualizedMemberList({
  submission,
  currentMemberId,
  onSelectMember
}: MemberListProps) {
  const memberIds = Object.keys(submission.evaluation_data.evaluated_members || {});

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <MemberListItem
        memberId={memberIds[index]}
        isActive={memberIds[index] === currentMemberId}
        onClick={() => onSelectMember(memberIds[index])}
      />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={memberIds.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

---

## Testing Checklist

- [ ] Modal loads aggregated submission correctly
- [ ] Member list displays all evaluated members
- [ ] Selecting member updates current display
- [ ] Criteria input fields work correctly
- [ ] Auto-save debounces and saves correctly
- [ ] Total score calculates correctly
- [ ] Progress indicator updates on save
- [ ] Submit button works and changes status
- [ ] Custom evaluation file upload works
- [ ] Navigation between members works
- [ ] Error messages display properly
- [ ] Validation prevents invalid submissions
- [ ] Memoization prevents unnecessary re-renders

