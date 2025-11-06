# Evaluation System Tables Analysis

## Overview
The S-MAN system has two types of evaluations:
1. **Phase Evaluations** - Per-phase evaluations (peer evaluation)
2. **Project Evaluations** - Final project evaluation

## Current Evaluation-Related Tables

### 1. **Phase Evaluation Forms** (`phase_evaluation_forms`)
- Links to: `project_phases` (id)
- Stores evaluation form structure for each phase
- Can be built-in or custom (field: `is_custom_evaluation`)
- Fields:
  - `id` (UUID)
  - `phase_id` (FK → project_phases)
  - `instructions` (text)
  - `total_points` (int, default: 100)
  - `available_from` (timestamp)
  - `due_date` (timestamp)
  - `custom_file_url`, `custom_file_name` (for custom evaluations)
  - `is_custom_evaluation` (boolean)

### 2. **Phase Evaluation Criteria** (`phase_evaluation_criteria`)
- Links to: `phase_evaluation_forms` (id)
- Defines evaluation criteria for phase evaluations
- Fields:
  - `id` (UUID)
  - `phase_evaluation_form_id` (FK)
  - `name` (varchar)
  - `description` (text)
  - `max_points` (int)
  - `order_index` (int)

### 3. **Project Evaluation Forms** (`project_evaluation_forms`)
- Links to: `projects` (id)
- Stores evaluation form structure for final project evaluation
- Can be built-in or custom (field: `is_custom_evaluation`)
- Fields:
  - `id` (UUID)
  - `project_id` (FK → projects)
  - `instructions` (text)
  - `total_points` (int, default: 100)
  - `available_from` (timestamp)
  - `due_date` (timestamp)
  - `custom_file_url`, `custom_file_name` (for custom evaluations)
  - `is_custom_evaluation` (boolean)
  - `deadline_synced_from_phase_id` (FK → project_phases, nullable)

### 4. **Project Evaluation Criteria** (`project_evaluation_criteria`)
- Links to: `project_evaluation_forms` (id)
- Defines evaluation criteria for project evaluations
- Fields:
  - `id` (UUID)
  - `project_evaluation_form_id` (FK)
  - `name` (varchar)
  - `description` (text)
  - `max_points` (int)
  - `order_index` (int)

### 5. **Evaluation Submissions** (`evaluation_submissions`) - EXISTING
- Currently used for storing phase & project evaluation submissions
- Fields:
  - `id` (UUID)
  - `project_id` (FK → projects)
  - `phase_id` (FK → project_phases, nullable - for phase evals only)
  - `group_id` (FK → course_groups)
  - `evaluator_id` (FK → studentaccounts) - who is evaluating
  - `evaluated_student_id` (FK → studentaccounts, nullable) - who is being evaluated
  - `evaluation_form_id` (FK → project_evaluation_forms)
  - `submission_date` (timestamp)
  - `evaluation_data` (jsonb)
  - `comments` (text)
  - `grade` (numeric)
  - `status` (text, default: 'pending_review')

## Problem Identified
The current `evaluation_submissions` table is ambiguous because:
- It uses `evaluation_form_id` which only references `project_evaluation_forms`
- There's no clear distinction between phase and project evaluations
- For phase evaluations, we need to reference `phase_evaluation_forms`, not `project_evaluation_forms`
- The `evaluated_student_id` field makes it unclear if this is peer-to-peer or group evaluation

## Requirements for New Submission Tables

### For Phase Evaluations:
- Each member must submit an evaluation for every other member in their group
- Each member can also evaluate themselves
- Submissions are per-phase during the evaluation phase window

### For Project Evaluations:
- Each member must submit an evaluation for every other member in their group
- Each member can also evaluate themselves
- Submission happens once at the end of the project

## Solution: Create Separate Submission Tables

We will create two dedicated submission tables:
1. **`phase_evaluation_submissions`** - For peer evaluations during phase evaluation windows
2. **`project_evaluation_submissions`** - For peer evaluations during project evaluation window

This provides clarity, prevents mistakes, and improves query performance.
