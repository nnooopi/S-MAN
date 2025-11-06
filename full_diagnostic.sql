-- ============================================================================
-- COMPREHENSIVE DIAGNOSTIC - DON'T CHANGE ANYTHING, JUST LOOK
-- ============================================================================
-- Student: Marshalle (b7c6af2a-1fcb-4b72-ae69-088672884006)
-- Expected Course: IT CAPSTONE PROJECT (bc074d58-8244-403f-8eb5-b838e189acea)
-- Project: PROJECT SUBMMISSION TESTING (228cf330-c7da-4680-9798-55cb9f1ae30b)

-- ============================================================================
-- 1. SHOW ALL GROUP MEMBERSHIP RECORDS FOR THIS STUDENT
-- ============================================================================
SELECT 
    '1. ALL MEMBERSHIPS FOR STUDENT' as info,
    cgm.id as membership_id,
    cgm.group_id,
    cgm.student_id,
    cgm.role,
    cgm.is_active,
    cgm.created_at,
    -- Try to join with course_groups (will be NULL if group doesn't exist)
    cg.id as actual_group_id,
    cg.course_id,
    cg.group_number,
    c.course_name
FROM course_group_members cgm
LEFT JOIN course_groups cg ON cg.id = cgm.group_id
LEFT JOIN courses c ON c.id = cg.course_id
WHERE cgm.student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006'
ORDER BY cgm.is_active DESC, cgm.created_at DESC;

-- ============================================================================
-- 2. SHOW ALL GROUPS THAT EXIST FOR THIS COURSE
-- ============================================================================
SELECT 
    '2. ALL GROUPS IN COURSE' as info,
    cg.id as group_id,
    cg.group_number,
    cg.group_name,
    cg.is_active,
    cg.current_member_count,
    cg.created_at
FROM course_groups cg
WHERE cg.course_id = 'bc074d58-8244-403f-8eb5-b838e189acea'
ORDER BY cg.group_number;

-- ============================================================================
-- 3. SHOW WHO IS IN EACH GROUP FOR THIS COURSE
-- ============================================================================
SELECT 
    '3. MEMBERS IN COURSE GROUPS' as info,
    cg.group_number,
    cg.id as group_id,
    cgm.id as membership_id,
    sa.first_name || ' ' || sa.last_name as member_name,
    cgm.role,
    cgm.is_active,
    cgm.created_at as joined_at
FROM course_groups cg
LEFT JOIN course_group_members cgm ON cgm.group_id = cg.id
LEFT JOIN studentaccounts sa ON sa.id = cgm.student_id
WHERE cg.course_id = 'bc074d58-8244-403f-8eb5-b838e189acea'
ORDER BY cg.group_number, cgm.role DESC, sa.last_name;

-- ============================================================================
-- 4. CHECK IF THERE ARE ORPHANED MEMBERSHIPS (pointing to non-existent groups)
-- ============================================================================
SELECT 
    '4. ORPHANED MEMBERSHIPS' as info,
    cgm.id as membership_id,
    cgm.group_id as points_to_group_id,
    sa.first_name || ' ' || sa.last_name as student_name,
    cgm.role,
    cgm.is_active,
    'GROUP DOES NOT EXIST' as issue
FROM course_group_members cgm
LEFT JOIN course_groups cg ON cg.id = cgm.group_id
LEFT JOIN studentaccounts sa ON sa.id = cgm.student_id
WHERE cg.id IS NULL
  AND cgm.student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006';

-- ============================================================================
-- 5. CHECK IF STUDENT HAS DUPLICATE MEMBERSHIPS
-- ============================================================================
SELECT 
    '5. DUPLICATE CHECK' as info,
    cgm.student_id,
    sa.first_name || ' ' || sa.last_name as student_name,
    COUNT(*) as total_memberships,
    COUNT(CASE WHEN cgm.is_active = true THEN 1 END) as active_memberships,
    STRING_AGG(cgm.group_id::text || ' (' || cgm.role || ')', ', ') as all_groups
FROM course_group_members cgm
LEFT JOIN studentaccounts sa ON sa.id = cgm.student_id
WHERE cgm.student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006'
GROUP BY cgm.student_id, sa.first_name, sa.last_name
HAVING COUNT(*) > 1;

-- ============================================================================
-- 6. SHOW THE PROJECT AND ITS COURSE
-- ============================================================================
SELECT 
    '6. PROJECT INFO' as info,
    p.id as project_id,
    p.title as project_title,
    p.course_id,
    c.course_name,
    c.course_code,
    c.professor_id
FROM projects p
JOIN courses c ON c.id = p.course_id
WHERE p.id = '228cf330-c7da-4680-9798-55cb9f1ae30b';

-- ============================================================================
-- 7. SHOW ALL GROUP IDs THAT LOOK SIMILAR (possible UUID typo)
-- ============================================================================
SELECT 
    '7. SIMILAR GROUP UUIDs' as info,
    id as group_id,
    course_id,
    group_number,
    'REAL GROUP IN course_groups TABLE' as source
FROM course_groups
WHERE id::text LIKE 'ed82fd19-d1df-4ac7-9813-99aff39b5%'

UNION ALL

SELECT 
    '7. SIMILAR GROUP UUIDs' as info,
    group_id,
    'N/A - from memberships' as course_id,
    0 as group_number,
    'REFERENCED IN course_group_members TABLE' as source
FROM course_group_members
WHERE group_id::text LIKE 'ed82fd19-d1df-4ac7-9813-99aff39b5%'
GROUP BY group_id;

-- ============================================================================
-- 8. COUNT SUMMARY
-- ============================================================================
SELECT 
    '8. SUMMARY' as info,
    (SELECT COUNT(*) FROM course_group_members WHERE student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006') as total_memberships,
    (SELECT COUNT(*) FROM course_group_members WHERE student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006' AND is_active = true) as active_memberships,
    (SELECT COUNT(*) FROM course_groups WHERE course_id = 'bc074d58-8244-403f-8eb5-b838e189acea') as groups_in_course,
    (SELECT COUNT(*) FROM course_group_members cgm 
     LEFT JOIN course_groups cg ON cg.id = cgm.group_id 
     WHERE cgm.student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006' AND cg.id IS NULL) as orphaned_memberships;

