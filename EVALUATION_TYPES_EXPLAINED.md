# Phase Evaluation Types - Complete Explanation

## 🎯 Overview

The system supports **TWO types** of phase evaluations. Both are fully captured in the phase deliverable submission.

---

## 📊 Type 1: Built-in Evaluations (Criteria-Based Scoring)

### What It Is
Members rate each other using **predefined criteria** with specific point values.

### Example Criteria (Total: 100 points)
| Criterion | Description | Max Points |
|-----------|-------------|------------|
| **Contribution** | Contributes meaningfully to group discussions and project development | 20 |
| **Compliance** | Completes group assignments and tasks on time | 15 |
| **Quality Work** | Prepares work in a quality manner with attention to detail | 25 |
| **Cooperation** | Demonstrates a cooperative and supportive attitude | 15 |
| **Overall Performance** | Overall performance and leadership in the project | 25 |

### What Gets Stored

```json
{
  "evaluation_submission_id": "68da0409-57c7-44eb-991b-2946441d5d8e",
  "evaluator_id": "1236a30d-544c-451f-8a05-0ad41fc27822",
  "evaluator_name": "Ivy Bumagat",
  "evaluator_role": "member",
  "submission_date": "2025-10-27T06:57:56.156+00",
  "status": "submitted",
  
  "is_custom_evaluation": false,
  
  "evaluation_form": {
    "form_id": "85542132-feca-469c-897b-306999e26d9c",
    "instructions": "Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.",
    "total_points": 100,
    
    "criteria": [
      {
        "id": "6a240d1d-e116-4d72-a8da-895f5fce9a29",
        "name": "Contribution",
        "description": "Contributes meaningfully to group discussions and project development",
        "max_points": 20,
        "score_received": 18
      },
      {
        "id": "b1eb9ee6-106f-4b59-89b8-21cc78fb96f9",
        "name": "Compliance",
        "description": "Completes group assignments and tasks on time",
        "max_points": 15,
        "score_received": 14
      },
      {
        "id": "8977cdb5-9d27-400e-9b73-14db724ae909",
        "name": "Quality Work",
        "description": "Prepares work in a quality manner with attention to detail",
        "max_points": 25,
        "score_received": 23
      },
      {
        "id": "c7bea433-34d3-466a-9b28-28d277280e18",
        "name": "Cooperation",
        "description": "Demonstrates a cooperative and supportive attitude",
        "max_points": 15,
        "score_received": 15
      },
      {
        "id": "78f96740-b457-456d-958c-0b3106ba2d98",
        "name": "Overall Performance",
        "description": "Overall performance and leadership in the project",
        "max_points": 25,
        "score_received": 24
      }
    ]
  },
  
  "total_score": 94,
  "percentage": 94.0,
  "comments": null
}
```

### ✅ What This Captures
- **Who evaluated whom**: Ivy evaluated Marshalle
- **Exact scores**: Each criterion's score (18/20, 14/15, 23/25, 15/15, 24/25)
- **Criterion details**: Full name, description, and max points for each
- **Total performance**: 94 out of 100 (94%)
- **Form metadata**: Which form was used, instructions given

### 📈 Use Cases
- **Instructor sees**: Detailed breakdown of how each member was rated
- **Analytics**: Can calculate averages per criterion across all evaluations
- **Transparency**: Students know exactly why they got their score
- **Comparison**: Easy to compare performance across different criteria

---

## 📄 Type 2: Custom File Evaluations

### What It Is
Instructor provides a **custom evaluation form** (PDF/Word), students download it, fill it out, and upload the completed form.

### Example Flow
1. **Instructor uploads**: `phase_1_evaluation_template.pdf`
2. **Student downloads**: The template
3. **Student fills out**: The PDF manually
4. **Student uploads**: `STUDENT_PHASE_CUSTOM_UPLOAD.pdf`

### What Gets Stored

```json
{
  "evaluation_submission_id": "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
  "evaluator_id": "another-member-uuid",
  "evaluator_name": "John Doe",
  "evaluator_role": "member",
  "submission_date": "2025-10-27T07:15:00.000+00",
  "status": "submitted",
  
  "is_custom_evaluation": true,
  
  "evaluation_form": {
    "form_id": "7e95d831-fd8a-4154-b7bb-0d84faa6a112",
    "instructions": "Download and complete the custom evaluation form",
    "total_points": 100,
    "custom_file_url": "https://qorkowgfjjuwxelumuut.supabase.co/.../phase_evaluation_template.pdf",
    "custom_file_name": "phase_1_evaluation_template.pdf"
  },
  
  "file_submission_url": "https://qorkowgfjjuwxelumuut.supabase.co/.../STUDENT_PHASE_CUSTOM_UPLOAD.pdf",
  "file_name": "STUDENT PHASE CUSTOM UPLOAD.pdf",
  "comments": null
}
```

### ✅ What This Captures
- **Who evaluated whom**: John evaluated someone
- **Template used**: Link to the original form the instructor provided
- **Submitted file**: The filled-out evaluation PDF
- **Form metadata**: Instructions, total possible points
- **File names**: Both template and submission names

### 📈 Use Cases
- **Flexibility**: Instructor can use any evaluation format
- **Custom rubrics**: Not limited to predefined criteria
- **External tools**: Can use forms created in Word, Google Forms export, etc.
- **Complex evaluations**: Supports narrative feedback, diagrams, etc.

---

## 🔄 How They Appear in the Submission

### For Each Member

```json
{
  "member_id": "b7c6af2a-1fcb-4b72-ae69-088672884006",
  "member_name": "Marshalle Nopi Soriano",
  "role": "leader",
  
  // All evaluations this member RECEIVED from others
  "evaluations_received": [
    {
      // Built-in evaluation from Ivy
      "is_custom_evaluation": false,
      "total_score": 94,
      "evaluator_name": "Ivy Bumagat"
      // ... full criteria breakdown
    },
    {
      // Custom file evaluation from John
      "is_custom_evaluation": true,
      "file_submission_url": "https://.../john_eval_marshalle.pdf",
      "evaluator_name": "John Doe"
      // ... file details
    }
  ],
  
  // Statistics
  "evaluation_count": 2,
  "average_score": 94.0, // Only counts built-in (numeric) evals
  
  // Did this member evaluate OTHERS?
  "has_submitted_own_evaluations": true,
  "members_evaluated_count": 2
}
```

---

## 🎓 Example Scenario

### Phase 1 Evaluation Setup
- **Evaluation type**: Built-in
- **5 criteria**: As shown above
- **Total points**: 100

### What Happens

1. **Ivy evaluates Marshalle** (Built-in):
   - Contribution: 18/20
   - Compliance: 14/15
   - Quality: 23/25
   - Cooperation: 15/15
   - Overall: 24/25
   - **Total: 94/100**

2. **Marshalle evaluates Ivy** (Built-in):
   - Contribution: 10/20
   - Compliance: 8/15
   - Quality: 15/25
   - Cooperation: 12/15
   - Overall: 15/25
   - **Total: 60/100**

### In the Submission

When the leader submits the phase deliverable, it captures:

```
Marshalle Nopi Soriano:
  - Received 1 evaluation (from Ivy)
  - Average score: 94/100
  - Submitted own evaluations: Yes (evaluated Ivy)

Ivy Bumagat:
  - Received 1 evaluation (from Marshalle)
  - Average score: 60/100
  - Submitted own evaluations: Yes (evaluated Marshalle)
```

All with **complete details** of every score for every criterion!

---

## 💡 Key Benefits

### For Built-in Evaluations:
✅ Structured data - easy to analyze  
✅ Automatic scoring calculation  
✅ Criterion-level feedback  
✅ Consistent across all evaluations  

### For Custom File Evaluations:
✅ Complete flexibility  
✅ Support for complex formats  
✅ Narrative feedback possible  
✅ External tool integration  

### For Both:
✅ **Complete history**: Everything preserved at submission time  
✅ **Instructor visibility**: See all evaluations for grading  
✅ **Student accountability**: Know who evaluated whom  
✅ **Audit trail**: Permanent record of peer feedback  

---

## 🚀 Summary

The phase deliverable submission captures **EVERYTHING** about evaluations:

| What | Built-in | Custom File |
|------|----------|-------------|
| **Scores per criterion** | ✅ Yes | ❌ N/A |
| **Total score** | ✅ Yes | ❌ N/A (unless manually entered) |
| **File upload** | ❌ No | ✅ Yes |
| **Criterion descriptions** | ✅ Yes | ❌ N/A |
| **Template reference** | ✅ Form ID | ✅ File URL |
| **Evaluator info** | ✅ Yes | ✅ Yes |
| **Submission timestamp** | ✅ Yes | ✅ Yes |

Both types are fully supported and preserved in the submission snapshot! 🎯

