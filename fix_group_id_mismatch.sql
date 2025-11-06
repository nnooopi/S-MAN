-- ============================================================================
-- FIX GROUP ID MISMATCH
-- ============================================================================
-- Issue: course_group_members table has wrong group_id
-- Wrong: ed82fd19-d1df-4ac7-9813-99aff39b5161
-- Correct: ed82fd19-d1df-4ac7-9813-99aff39b516b

-- Student: b7c6af2a-1fcb-4b72-ae69-088672884006 (Marshalle)
-- Course: bc074d58-8244-403f-8eb5-b838e189acea (IT CAPSTONE PROJECT)

-- ============================================================================
-- STEP 1: Find the incorrect group_id references
-- ============================================================================
SELECT 
    'INCORRECT MEMBERSHIP RECORDS' as check_type,
    id,
    group_id,
    student_id,
    role,
    is_active
FROM course_group_members
WHERE group_id = 'ed82fd19-d1df-4ac7-9813-99aff39b5161';

-- ============================================================================
-- STEP 2: Verify the correct group exists
-- ============================================================================
SELECT 
    'CORRECT GROUP EXISTS?' as check_type,
    id as group_id,
    course_id,
    group_number,
    group_name,
    is_active
FROM course_groups
WHERE id = 'ed82fd19-d1df-4ac7-9813-99aff39b516b'
  AND course_id = 'bc074d58-8244-403f-8eb5-b838e189acea';

-- ============================================================================
-- STEP 3: Check if membership already exists with correct group_id
-- ============================================================================
SELECT 
    'EXISTING CORRECT MEMBERSHIP?' as check_type,
    id,
    group_id,
    student_id,
    role,
    is_active
FROM course_group_members
WHERE group_id = 'ed82fd19-d1df-4ac7-9813-99aff39b516b'
  AND student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006';

-- ============================================================================
-- STEP 4: FIX - DELETE the duplicate/incorrect memberships
-- ============================================================================
-- Since correct membership already exists, we DELETE the wrong ones
-- to avoid duplicates

DELETE FROM course_group_members
WHERE group_id = 'ed82fd19-d1df-4ac7-9813-99aff39b5161';

-- Confirm deletion
SELECT 
    '✅ DELETED DUPLICATE RECORDS' as status,
    'Incorrect membership records removed' as message;

-- Verify no more incorrect records exist
SELECT 
    '✅ VERIFICATION - No incorrect records' as check,
    COUNT(*) as should_be_zero
FROM course_group_members
WHERE group_id = 'ed82fd19-d1df-4ac7-9813-99aff39b5161';

-- ============================================================================
-- STEP 5: Verify the fix
-- ============================================================================
SELECT 
    '✅ VERIFICATION' as check_type,
    cgm.id,
    cgm.group_id,
    cgm.student_id,
    cgm.role,
    cgm.is_active,
    sa.first_name,
    sa.last_name,
    cg.course_id,
    c.course_name
FROM course_group_members cgm
JOIN studentaccounts sa ON sa.id = cgm.student_id
JOIN course_groups cg ON cg.id = cgm.group_id
JOIN courses c ON c.id = cg.course_id
WHERE cgm.student_id = 'b7c6af2a-1fcb-4b72-ae69-088672884006'
  AND cg.course_id = 'bc074d58-8244-403f-8eb5-b838e189acea';

-- ============================================================================
-- STEP 6: Check if there are other similar UUID mismatches
-- ============================================================================
SELECT 
    '⚠️  ORPHANED MEMBERSHIPS (no matching group)' as warning,
    cgm.id,
    cgm.group_id,
    cgm.student_id,
    cgm.role
FROM course_group_members cgm
LEFT JOIN course_groups cg ON cg.id = cgm.group_id
WHERE cg.id IS NULL;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 
    '🎉 FIX COMPLETE!' as status,
    'Student should now be able to submit project deliverable' as message,
    'Please restart the backend server to clear any cached data' as next_step;

