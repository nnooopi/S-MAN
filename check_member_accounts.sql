-- ============================================================================
-- SINGLE QUERY - Find why studentaccounts is null in group members
-- ============================================================================

WITH group_members_with_accounts AS (
  SELECT 
    cgm.id as membership_id,
    cgm.group_id,
    cgm.student_id,
    cgm.role,
    cgm.is_active,
    sa.id as account_exists,
    sa.first_name,
    sa.last_name,
    sa.email,
    CASE 
      WHEN sa.id IS NULL THEN '❌ ORPHANED - No matching account'
      ELSE '✅ Account exists'
    END as status
  FROM course_group_members cgm
  LEFT JOIN studentaccounts sa ON sa.id = cgm.student_id
  WHERE cgm.group_id = 'ed82fd19-d1df-4ac7-9813-99aff39b516b'
    AND cgm.is_active = true
)
SELECT 
  '🔍 GROUP MEMBERS ANALYSIS' as section,
  membership_id,
  group_id,
  student_id,
  role,
  status,
  COALESCE(first_name || ' ' || last_name, 'NULL') as member_name,
  COALESCE(email, 'NULL') as email
FROM group_members_with_accounts
ORDER BY status DESC, role DESC;

