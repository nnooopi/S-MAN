# Task Assignment - Quick Testing Guide

## 🚀 Quick Start Test

### Prerequisites
- ✅ Backend running (`node backend/server.js`)
- ✅ Frontend running (`npm start`)
- ✅ Logged in as a group leader
- ✅ Group has multiple members
- ✅ At least one active project

---

## 🧪 Test Scenario 1: Basic Task Assignment

### Steps
1. **Navigate** → Sidebar → "Task Assignment" (under Leader Tools)
2. **Verify** → Page loads with project dropdown centered at top
3. **Select Project** → Click dropdown, choose active project
4. **Verify** → Group members appear on left, phases on right form
5. **Select Member** → Click any member card (should highlight)
6. **Fill Form:**
   - Title: "Design System Components"
   - Description: "Create reusable UI components following our design guidelines"
   - Phase: Select any phase from dropdown
   - Max Attempts: 2
   - Due Date: Select date 1 week from now
7. **Verify Form:**
   - All fields have values
   - "Assigning to: [MemberName]" shows selected member
8. **Submit** → Click "Assign Task" button
9. **Expected Result** → 
   - ✅ Success alert: "Task assigned successfully to [Name]!"
   - ✅ Form resets
   - ✅ Member still selected (can assign more tasks)

---

## 🧪 Test Scenario 2: Form Validation

### Test 2.1: Missing Title
1. **Select** Member and Phase
2. **Leave** Title empty
3. **Click** "Assign Task"
4. **Expected** → Alert: "Please enter a task title"

### Test 2.2: Missing Description
1. **Fill** Title only
2. **Leave** Description empty
3. **Click** "Assign Task"
4. **Expected** → Alert: "Please enter a task description"

### Test 2.3: Missing Phase
1. **Fill** Title and Description
2. **Leave** Phase as "Select Phase"
3. **Click** "Assign Task"
4. **Expected** → Alert: "Please select a project phase"

### Test 2.4: Missing Due Date
1. **Fill** Title, Description, Phase
2. **Leave** Due Date empty
3. **Click** "Assign Task"
4. **Expected** → Alert: "Please select a due date"

---

## 🧪 Test Scenario 3: Date & Time Handling

### Steps
1. **Select** Member with all required fields
2. **Set:**
   - Due Date: 2025-12-25
   - Due Time: 14:30 (2:30 PM)
   - Available Until: 2025-12-27
   - Available Time: 23:59
3. **Submit** Task
4. **Expected** → 
   - ✅ Task created with correct datetime
   - ✅ Combined as ISO format in backend

---

## 🧪 Test Scenario 4: File Types Selection

### Steps
1. **Select** Member with all required fields
2. **Click** File Type pills:
   - Click "Documents" → becomes dark
   - Click "Images" → becomes dark
   - Click "Code" → becomes dark
3. **Verify** → Pills show selected state
4. **Submit** Task
5. **Expected** →
   - ✅ Task created with allowed file types
   - ✅ Backend receives array: ["Documents", "Images", "Code"]

---

## 🧪 Test Scenario 5: Project Switching

### Steps
1. **Select** Project A (loads members M1, M2, M3)
2. **Select** Member M1
3. **Click** Project Dropdown again
4. **Select** Project B (different group of members)
5. **Verify** →
   - ✅ Member list updates
   - ✅ Previously selected member M1 is cleared
   - ✅ Previous form data cleared

---

## 🧪 Test Scenario 6: Multiple Task Assignments

### Steps
1. **Select** Project
2. **Select** Member 1 → Assign Task 1 → Success
3. **Verify** → Form resets but member stays selected
4. **Modify** form (new title, description, etc.)
5. **Select** Member 2 → Assign Task 2 → Success
6. **Expected** → Both tasks created successfully

---

## 🧪 Test Scenario 7: Error Handling

### Test 7.1: Network Error
1. **Turn off** backend server
2. **Try** to assign task
3. **Expected** → Alert with error message

### Test 7.2: Invalid Member
1. **In browser console** → Manually change member ID
2. **Try** to assign task
3. **Expected** → Backend error: "Cannot assign task to student not in your group"

---

## 📊 Expected Data in Database

After successful task assignment, `tasks` table should contain:
```
{
  id: UUID,
  project_id: UUID,
  assigned_to: UUID (member's student_id),
  assigned_by: UUID (leader's student_id),
  title: "Design System Components",
  description: "Create reusable UI components...",
  due_date: "2025-12-25T14:30:00",
  available_until: "2025-12-27T23:59:00",
  max_attempts: 2,
  file_types_allowed: ["Documents", "Images", "Code"],
  status: "pending",
  is_active: true,
  created_at: current_timestamp,
  phase_id: NULL (current implementation)
}
```

---

## 🔍 Debug Checks

### Browser Console
- Look for API call logs: "✅ Task assigned successfully:"
- Check network tab for POST request to `/api/student-leader/assign-task`
- Verify response status: 200 OK

### Backend Server Output
- Look for: "📋 Assigning task:"
- Look for: "✅ Task created successfully:"
- Check for any error logs starting with "❌"

### Database Check (Supabase)
1. Go to Table Editor → "tasks"
2. Filter by recent timestamps
3. Verify all fields saved correctly

---

## ✅ Success Criteria

All of the following must pass:

- [ ] Task Assignment navigation item visible in sidebar
- [ ] Project dropdown loads and displays projects
- [ ] Member list loads and displays with avatars
- [ ] Member selection works and highlights
- [ ] Form fields accept input
- [ ] Form validation prevents invalid submissions
- [ ] Date/time combine correctly to ISO format
- [ ] File type multi-select works
- [ ] Task assignment POST request succeeds
- [ ] Success message displays with member name
- [ ] Task created in database with all fields
- [ ] Form resets after submission
- [ ] Error messages display for failures
- [ ] Multiple consecutive assignments work

---

## 📝 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Members not loading | Check backend `/api/student-leader/projects/{id}/members` endpoint |
| "Access denied" error | Verify user is group leader, check `course_group_members` table |
| Task not saved | Check network tab for 500 errors, review backend logs |
| Dropdown not closing | Ensure click-outside handler is working |
| Form doesn't reset | Check if API call succeeded before reset |
| Time not combining | Verify time format is HH:MM (24-hour) |

---

## 🎯 Performance Expectations

- Project selection loads: < 2 seconds
- Member selection: < 1 second
- Task assignment POST: < 2 seconds
- Form reset: < 500ms

---

## 📞 Need Help?

1. **Check browser console** for error messages
2. **Check network tab** for failed requests
3. **Check backend logs** for server-side errors
4. **Verify database** for data creation
5. **Check file:** `TASK_ASSIGNMENT_IMPLEMENTATION.md` for detailed docs

