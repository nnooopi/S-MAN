-- ============================================================================
-- DIAGNOSE GROUP MEMBERSHIP ISSUE
-- ============================================================================
-- Student ID: b7c6af2a-1fcb-4b72-ae69-088672884006
-- Group ID from logs: ed82fd19-d1df-4ac7-9813-99aff39b5161
-- Expected course ID: bc074d58-8244-403f-8eb5-b838e189acea
-- Project ID: 228cf330-c7da-4680-9798-55cb9f1ae30b

-- 1. Check if the group exists and what course it belongs to
SELECT 
    'GROUP CHECK' as check_type,
    id as group_id,
    course_id,
    group_number,
    group_name,
    is_active
FROM course_groups
WHERE id = 'ed82fd19-d1df-4ac7-9813-99aff39b5161';

-- 2. Check student's membership in that group
SELECT 
    'MEMBERSHIP CHECK' as check_type,
    id,
    group_id,
    student_id,
    role,
    is_active
FROM course_group_members
WHERE group_id = 'ed82fd19-d1df-4ac7-9813-99aff39b5161'
  AND student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006';

-- 3. Check what course the project belongs to
SELECT 
    'PROJECT COURSE CHECK' as check_type,
    id as project_id,
    title,
    course_id
FROM projects
WHERE id = '228cf330-c7da-4680-9798-55cb9f1ae30b';

-- 4. Check if student is enrolled in the project's course
SELECT 
    'ENROLLMENT CHECK' as check_type,
    cs.id,
    cs.student_id,
    cs.course_id,
    cs.is_active,
    c.course_name
FROM course_students cs
JOIN courses c ON c.id = cs.course_id
WHERE cs.student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006'
  AND cs.course_id = 'bc074d58-8244-403f-8eb5-b838e189acea';

-- 5. Find which groups belong to the correct course
SELECT 
    'CORRECT COURSE GROUPS' as check_type,
    cg.id as group_id,
    cg.group_number,
    cg.course_id,
    COUNT(cgm.student_id) as member_count
FROM course_groups cg
LEFT JOIN course_group_members cgm ON cgm.group_id = cg.id AND cgm.is_active = true
WHERE cg.course_id = 'bc074d58-8244-403f-8eb5-b838e189acea'
GROUP BY cg.id, cg.group_number, cg.course_id;

-- 6. Check if student is in ANY group for the correct course
SELECT 
    'STUDENT IN CORRECT COURSE GROUP?' as check_type,
    cgm.group_id,
    cgm.role,
    cgm.is_active,
    cg.course_id,
    cg.group_number
FROM course_group_members cgm
JOIN course_groups cg ON cg.id = cgm.group_id
WHERE cgm.student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006'
  AND cg.course_id = 'bc074d58-8244-403f-8eb5-b838e189acea'
  AND cgm.is_active = true;

-- 7. Show ALL groups student is in (any course)
SELECT 
    'ALL STUDENT GROUPS' as check_type,
    cgm.group_id,
    cgm.role,
    cgm.is_active,
    cg.course_id,
    cg.group_number,
    c.course_name,
    c.course_code
FROM course_group_members cgm
JOIN course_groups cg ON cg.id = cgm.group_id
JOIN courses c ON c.id = cg.course_id
WHERE cgm.student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006'
ORDER BY cgm.is_active DESC, c.course_name;

-- ============================================================================
-- POTENTIAL FIX (uncomment if diagnosis shows the group is in wrong course)
-- ============================================================================

-- Option A: If the group exists but is in wrong course, update it:
-- UPDATE course_groups
-- SET course_id = 'bc074d58-8244-403f-8eb5-b838e189acea'
-- WHERE id = 'ed82fd19-d1df-4ac7-9813-99aff39b5161';

-- Option B: If student needs to be added to a different group in the correct course:
-- First, find the correct group:
-- SELECT id, group_number FROM course_groups 
-- WHERE course_id = 'bc074d58-8244-403f-8eb5-b838e189acea';

-- Then add student to that group (replace <correct_group_id>):
-- INSERT INTO course_group_members (group_id, student_id, role, assigned_by, is_active)
-- VALUES ('<correct_group_id>', 'b7c6af2a-1fcb-4b72-ae69-088672884006', 'leader', '<professor_id>', true)
-- ON CONFLICT DO NOTHING;

