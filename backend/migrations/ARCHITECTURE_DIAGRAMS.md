# Architecture & Flow Diagrams

## 1. Database Structure (After Migrations)

```
┌─────────────────────────────────────────────────────────────────┐
│                         PROJECTS                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ id, title, description, start_date, due_date             │  │
│  │ evaluation_phase_days, breathe_phase_days                │  │
│  │ project_rubric_type, project_evaluation_type             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────┘
                 │ (1:Many)
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                    PROJECT_PHASES                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ id, project_id, phase_number, title                      │  │
│  │ start_date, end_date (KEY DATES)                         │  │
│  │ rubric, evaluation_form_type, max_attempts               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────┬───────────────────┬─────────────────────────────────┬──────┘
     │ (1:1)             │ (1:1)                          │
     │                   │                                │
     │          ┌────────▼──────────────────────────────────────┐
     │          │  PHASE_RUBRICS                               │
     │          │  ┌────────────────────────────────────────┐  │
     │          │  │ id, phase_id, instructions, total_pts │  │
     │          │  └────────────────────────────────────────┘  │
     │          │           │ (1:Many)                         │
     │          │           └──────┐                            │
     │          │                  │                            │
     │          └────────┬────────▼─────────────────────────────┘
     │                   │      PHASE_RUBRIC_CRITERIA
     │                   │      ├─ name, max_points
     │                   │      └─ description
     │
     │  ┌────────────────────────────────────────────────────────┐
     │  │  PHASE_EVALUATION_FORMS ⭐ (CONSOLIDATED)            │
     │  │  ┌──────────────────────────────────────────────────┐ │
     │  │  │ id, phase_id, instructions, total_points        │ │
     │  │  │ available_from ⭐, due_date ⭐ (AUTO-UPDATED)   │ │
     │  │  │ is_custom_evaluation, custom_file_url           │ │
     │  │  │ deadline_updated_at (AUDIT)                     │ │
     │  │  └──────────────────────────────────────────────────┘ │
     │  │           │ (1:Many)                                  │
     │  │           └──────┐                                    │
     │  │                  │                                    │
     │  └────────┬────────▼──────────────────────────────────────┘
     │           │      PHASE_EVALUATION_CRITERIA
     │           │      ├─ name, max_points
     │           │      └─ description
     │
     │  ┌────────────────────────────────────────────────────────┐
     │  │  PHASE_SUBMISSIONS (Stores student submissions)       │
     │  │  ├─ phase_id, group_id, submitted_by                  │
     │  │  └─ submission_date, status, grade                    │
     │  └────────────────────────────────────────────────────────┘
     │
     │  ┌────────────────────────────────────────────────────────┐
     │  │  PHASE_GRADES (Stores grades)                         │
     │  │  ├─ phase_id, student_id, group_id                    │
     │  │  └─ individual_grade, group_grade, final_phase_grade  │
     │  └────────────────────────────────────────────────────────┘
     │
     └────────────────────────────────────────────────────────────┐
                                                                   │
┌──────────────────────────────────────────────────────────────────▼┐
│                  PROJECT_EVALUATION_FORMS ⭐ (CONSOLIDATED)      │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ id, project_id, instructions, total_points                  ││
│  │ available_from ⭐, due_date ⭐ (SYNCED FROM LAST PHASE)     ││
│  │ deadline_synced_from_phase_id ⭐ (TRACK SYNC SOURCE)        ││
│  │ is_custom_evaluation, custom_file_url                       ││
│  │ deadline_updated_at (AUDIT)                                 ││
│  └──────────────────────────────────────────────────────────────┘│
│           │ (1:Many)                                            │
│           └──────┐                                              │
│                  │                                              │
└────────────┬────▼──────────────────────────────────────────────────┘
             │      PROJECT_EVALUATION_CRITERIA
             │      ├─ name, max_points
             │      └─ description

⭐ = Key fields for evaluation deadline logic
```

---

## 2. Evaluation Deadline Flow Diagram

### Phase Evaluation Timeline
```
┌──────────────────────────────────────────────────────────────────┐
│                        PHASE TIMELINE                             │
└──────────────────────────────────────────────────────────────────┘

PHASE PERIOD (Variable Duration)
│
├─ Phase starts: phase.start_date
│  └─ Students submit work to phase
│
└─ Phase ends: phase.end_date (11:59:59 PM)
   
   ↓ (Trigger Fires: trg_recalculate_phase_eval_on_end_date_change)
   ↓ (Function: recalculate_phase_evaluation_deadlines())
   
   EVALUATION PERIOD (Duration = evaluation_phase_days from projects.evaluation_phase_days)
   │
   ├─ Evaluation starts: available_from = phase.end_date + 1 day (12:00:00 AM)
   │  └─ Students rate groupmates
   │
   └─ Evaluation ends: due_date = available_from + evaluation_phase_days (11:59:59 PM)
   
      ↓ (Trigger Fires: trg_sync_project_eval_from_phase)
      ↓ (Function: sync_project_evaluation_from_last_phase())
      ↓ (Only if this is the last phase)
      
      ↓ PROJECT EVALUATION SYNCS HERE (copies dates from last phase eval)
      
   BREATHE PERIOD (Duration = breathe_phase_days from projects.breathe_phase_days)
   │
   ├─ Breathe starts: end_of_evaluation
   │  └─ Break time between phases
   │
   └─ Breathe ends: evaluation.due_date + breathe_phase_days (11:59:59 PM)
   
      ↓
      
   NEXT PHASE STARTS (or project ends if this was last phase)
```

### Example Timeline (3 phases, 2 eval days, 1 breathe day)
```
Oct 1 (12:00)  ──────────────────┐
                 PHASE 1           │
Oct 10 (24:00) ─────────────────┐─┤ 9 days
                ┌─ Eval starts (Oct 11 12:00)
                │  EVALUATION 1
Oct 12 (24:00) ┼─────────────── ┤ 2 days
                │
Oct 13 (24:00) ──── BREATHE ────┘ 1 day
                
Oct 14 (12:00) ──────────────────┐
                 PHASE 2           │
Oct 19 (24:00) ─────────────────┐─┤ 5 days
                ┌─ Eval starts (Oct 20 12:00)
                │  EVALUATION 2 ⭐ PROJECT EVAL SYNCS HERE
Oct 21 (24:00) ┼─────────────── ┤ 2 days
                │
Oct 22 (24:00) ──── BREATHE ────┘ 1 day
                
Oct 23 (12:00) ──────────────────┐
                 PHASE 3           │
Oct 25 (24:00) ─────────────────┐─┤ 2 days
                ┌─ Eval starts (Oct 26 12:00)
                │  EVALUATION 3 ⭐ PROJECT EVAL = EVALUATION 3 DATES
Oct 28 (24:00) ┼─────────────── ┤ 2 days
                │  ⭐ PROJECT EVAL DUE DATE = Oct 28 (24:00)
                │
                └─────────────────

Total days needed: 9 + 5 + 2 = 16 days (phases) + 6 days (eval+breathe) = 22 days
```

---

## 3. Automatic Trigger Cascade

```
SCENARIO: Professor updates phase end_date
─────────────────────────────────────────

Frontend (SimplifiedProjectCreator.js)
      │
      ▼
UPDATE project_phases SET end_date = NEW_DATE WHERE id = PHASE_ID;
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Trigger 1: trg_recalculate_phase_eval_on_end_date_change   │
│                                                              │
│ Function: recalculate_phase_evaluation_deadlines()          │
│                                                              │
│ Action:                                                     │
│   1. Get evaluation_phase_days from projects table          │
│   2. Calculate: available_from = phase.end_date + 1 day    │
│   3. Calculate: due_date = available_from + eval days      │
│   4. UPDATE phase_evaluation_forms with new dates           │
│   5. Set deadline_updated_at = NOW()                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
      UPDATE phase_evaluation_forms
      SET available_from = ..., due_date = ...
      WHERE phase_id = PHASE_ID
             │
             ▼
      ┌──────────────────────────────────────────────────────┐
      │ Trigger 2: trg_sync_project_eval_from_phase          │
      │                                                       │
      │ Function: sync_project_evaluation_from_last_phase()  │
      │                                                       │
      │ Action:                                              │
      │   1. Get last phase of project (ORDER BY DESC)       │
      │   2. Get that phase's evaluation available_from/due  │
      │   3. UPDATE project_evaluation_forms with those      │
      │   4. Set deadline_synced_from_phase_id = last phase  │
      └────────────┬─────────────────────────────────────────┘
                   │
                   ▼
            UPDATE project_evaluation_forms
            SET available_from = ..., due_date = ...
            WHERE project_id = PROJECT_ID
                   │
                   ▼
         ✓ AUTOMATIC SYNC COMPLETE
           (No backend code intervention needed!)
```

---

## 4. Data Flow: Phase Creation

```
SCENARIO: Professor creates new project with phases
────────────────────────────────────────────────────

SimplifiedProjectCreator.js (Frontend)
      │
      ├─ Validates: title, description, dates, phases
      │
      ├─ Calculates (for each phase):
      │  ├─ Phase number
      │  ├─ Phase dates (based on auto-spacing logic)
      │  └─ Evaluation dates (available_from, due_date)
      │
      └─ Sends JSON to backend:
         {
            title, description,
            evaluation_phase_days, breathe_phase_days,
            phases: [
              {
                name, description,
                startDate, endDate,
                evaluation_available_from, evaluation_due_date,
                rubricType, evaluationType
              },
              ...
            ]
         }
         │
         ▼
Backend API (POST /api/professor/course/{courseId}/projects)
      │
      ├─ Validate data
      │
      ├─ START TRANSACTION
      │
      ├─ INSERT INTO projects (...)
      │  └─ Returns: project_id
      │
      ├─ FOR EACH phase:
      │  │
      │  ├─ INSERT INTO project_phases (...)
      │  │  └─ Returns: phase_id
      │  │
      │  ├─ INSERT INTO phase_rubrics (...)
      │  │  └─ Returns: rubric_id
      │  │
      │  ├─ INSERT INTO phase_rubric_criteria (...)
      │  │
      │  ├─ INSERT INTO phase_evaluation_forms (
      │  │       phase_id, instructions,
      │  │       available_from, due_date,  ← From frontend calculation
      │  │       is_custom_evaluation, ...
      │  │   )
      │  │
      │  ├─ INSERT INTO phase_evaluation_criteria (...)
      │  │
      │  └─ [Optional] INSERT INTO phase_custom_evaluations (...)
      │
      ├─ INSERT INTO project_evaluation_forms (
      │       project_id, instructions,
      │       available_from, due_date,  ← From last phase's dates
      │       deadline_synced_from_phase_id, ...
      │   )
      │
      ├─ INSERT INTO project_evaluation_criteria (...)
      │
      ├─ INSERT INTO project_rubrics (...)
      │
      ├─ INSERT INTO project_rubric_criteria (...)
      │
      ├─ COMMIT TRANSACTION
      │
      └─ Return: success + project_id
         │
         ▼
Database Triggers (NOW RUNNING)
      │
      ├─ No triggers fire (no UPDATEs happened)
      │
      └─ ✓ Project fully created with correct deadlines
```

---

## 5. Data Flow: Phase Modification

```
SCENARIO: Professor modifies an existing phase
──────────────────────────────────────────────

Frontend (Phase Editor)
      │
      ├─ Allow user to change: end_date, title, description
      │
      └─ Send to backend:
         PATCH /api/professor/projects/{projectId}/phases/{phaseId}
         {
            title: "New title",
            end_date: "2025-11-01T23:59:59Z"
         }
         │
         ▼
Backend API
      │
      ├─ Validate data
      │
      ├─ UPDATE project_phases
      │  SET title = ..., end_date = ...
      │  WHERE id = phaseId
      │
      └─ Return: success
         │
         ▼
AUTOMATIC (Database Trigger)
      │
      ├─ Trigger: trg_recalculate_phase_eval_on_end_date_change fires
      │
      ├─ Function: recalculate_phase_evaluation_deadlines() runs
      │  │
      │  ├─ NEW.end_date = 2025-11-01 23:59:59
      │  │
      │  ├─ Get evaluation_phase_days from projects (e.g., 2 days)
      │  │
      │  ├─ Calculate new_available_from = 2025-11-02 00:00:00
      │  │
      │  ├─ Calculate new_due_date = 2025-11-04 23:59:59
      │  │
      │  └─ UPDATE phase_evaluation_forms
      │     SET available_from = 2025-11-02 00:00:00,
      │         due_date = 2025-11-04 23:59:59,
      │         deadline_updated_at = NOW()
      │     WHERE phase_id = phaseId
      │
      ├─ Trigger: trg_sync_project_eval_from_phase fires
      │
      ├─ Function: sync_project_evaluation_from_last_phase() runs
      │  │
      │  ├─ Get last phase of project (phase_number DESC)
      │  │
      │  ├─ If this IS the last phase:
      │  │  │
      │  │  └─ UPDATE project_evaluation_forms
      │  │     SET available_from = 2025-11-02 00:00:00,
      │  │         due_date = 2025-11-04 23:59:59,
      │  │         deadline_synced_from_phase_id = phaseId,
      │  │         deadline_updated_at = NOW()
      │  │
      │  └─ Else: do nothing
      │
      └─ ✓ COMPLETE - All deadlines automatically updated!
```

---

## 6. Custom vs Built-in Evaluations

```
┌─────────────────────────────────────┬─────────────────────────────────────┐
│      BUILT-IN EVALUATIONS           │      CUSTOM EVALUATIONS             │
├─────────────────────────────────────┼─────────────────────────────────────┤
│ is_custom_evaluation = FALSE         │ is_custom_evaluation = TRUE         │
│                                     │                                     │
│ Uses phase_evaluation_criteria:      │ File uploaded by professor:         │
│ ├─ Contribution (20 pts)             │ ├─ file_url = s3://bucket/...pdf   │
│ ├─ Compliance (15 pts)               │ ├─ file_name = "evaluation.pdf"    │
│ ├─ Quality Work (25 pts)             │ └─ Can be Rubric or Eval Form      │
│ ├─ Cooperation (15 pts)              │                                     │
│ └─ Overall Perf (25 pts)             │ Same deadline structure:            │
│                                     │ ├─ available_from                  │
│ Same deadline structure:             │ ├─ due_date                        │
│ ├─ available_from (after phase)      │ └─ Can be synced same as built-in  │
│ └─ due_date (after eval days)        │                                     │
│                                     │                                     │
│ Stored in:                          │ Stored in:                          │
│ ├─ phase_evaluation_forms           │ ├─ phase_evaluation_forms           │
│ └─ phase_evaluation_criteria         │ │  (same table!)                   │
│                                     │ └─ custom_file_url column          │
│ Query:                              │                                     │
│ SELECT * FROM                       │ Query:                              │
│   phase_evaluation_forms pef        │ SELECT * FROM                       │
│ WHERE phase_id = ?                  │   phase_evaluation_forms            │
│   AND is_custom_evaluation = FALSE; │ WHERE phase_id = ?                  │
│                                     │   AND is_custom_evaluation = TRUE;  │
└─────────────────────────────────────┴─────────────────────────────────────┘
```

---

## 7. Validation Diagnostic View

```
validate_evaluation_deadlines(project_id) shows:

Phase# │ Phase End Date │ Eval Start │ Eval End Date │ Valid? │ Issue
──────┼────────────────┼────────────┼───────────────┼────────┼──────────────────
  1   │ Oct 10 24:00   │ Oct 11 00  │ Oct 12 24:00  │  ✓    │ OK
  2   │ Oct 19 24:00   │ Oct 20 00  │ Oct 21 24:00  │  ✓    │ OK
  3   │ Oct 25 24:00   │ Oct 26 00  │ Oct 28 24:00  │  ✓    │ OK

If misaligned:

  1   │ Oct 10 24:00   │ Oct 10 00  │ Oct 10 24:00  │  ✗    │ Eval starts before phase ends
  2   │ Oct 19 24:00   │ NULL       │ NULL          │  ✗    │ Evaluation dates are NULL
```

---

## 8. Table Consolidation Summary

```
BEFORE (Redundant):
├─ phase_evaluation_forms (main)
├─ phase_custom_evaluations (REDUNDANT - holds custom file refs)
├─ project_evaluation_forms (main)
└─ project_custom_evaluations (REDUNDANT - holds custom file refs)

AFTER (Consolidated):
├─ phase_evaluation_forms (unified)
│  ├─ is_custom_evaluation flag
│  ├─ custom_file_url column (stores what was in phase_custom_evaluations)
│  └─ Custom & built-in both use same table
│
└─ project_evaluation_forms (unified)
   ├─ is_custom_evaluation flag
   ├─ custom_file_url column (stores what was in project_custom_evaluations)
   ├─ deadline_synced_from_phase_id (tracks sync)
   └─ Custom & built-in both use same table

Views for backward compatibility (during transition):
├─ phase_custom_evaluations_view (queries phase_evaluation_forms where is_custom = TRUE)
└─ project_custom_evaluations_view (queries project_evaluation_forms where is_custom = TRUE)

After Migration 6:
├─ phase_custom_evaluations (DROPPED)
├─ project_custom_evaluations (DROPPED)
└─ Views removed (code updated to use consolidated tables directly)
```

