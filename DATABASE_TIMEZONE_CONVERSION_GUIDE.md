# 🌏 Convert Entire Database to Philippine Time

This guide explains how to convert **ALL timestamp columns** in your Supabase database from UTC to Philippine time (+8 hours).

---

## 📋 What Will Be Converted

### Tables & Columns Affected:
- ✅ `phase_deliverable_submissions` (submitted_at, graded_at, created_at, updated_at)
- ✅ `tasks` (due_date, available_until, created_at, updated_at, completed_at)
- ✅ `task_submissions` (submission_date, created_at, updated_at)
- ✅ `revision_submissions` (submitted_at, reviewed_at, created_at, updated_at)
- ✅ `phase_evaluation_submissions` (submission_date, last_modified, created_at, updated_at)
- ✅ `project_phases` (start_date, end_date, created_at, updated_at)
- ✅ `projects` (start_date, end_date, created_at, updated_at)
- ✅ `courses` (start_date, end_date, created_at, updated_at)
- ✅ **ALL other tables with timestamp columns**

### What Changes:
1. **Existing Data**: All timestamps shifted +8 hours (UTC → Philippine time)
2. **Column Types**: `timestamp with time zone` → `timestamp without time zone`
3. **Defaults**: `NOW()` or `CURRENT_TIMESTAMP` → `LOCALTIMESTAMP`
4. **Triggers**: All `updated_at` triggers use `LOCALTIMESTAMP`

---

## 🚀 Two Options

### **Option 1: Automatic Conversion (Recommended)**

**File**: `convert_entire_database_to_philippine_time.sql`

✅ **Pros**:
- Fully automatic
- Converts everything in one go
- Updates triggers automatically
- Shows progress messages

❌ **Cons**:
- Less control (but safer)
- Can't preview changes first

**How to Use**:
1. Open Supabase SQL Editor
2. Copy **ALL content** from `convert_entire_database_to_philippine_time.sql`
3. Paste and click **RUN**
4. Wait for completion messages
5. Review verification queries at the bottom

---

### **Option 2: Manual Review (For Control)**

**File**: `generate_conversion_sql.sql`

✅ **Pros**:
- See exactly what will change
- Can modify/exclude specific tables
- More control

❌ **Cons**:
- Requires manual review
- More steps

**How to Use**:
1. Open Supabase SQL Editor
2. Run `generate_conversion_sql.sql`
3. **Review the generated SQL** in the output
4. Copy the generated statements
5. Run them in a new query

---

## 📊 Example Conversion

### Before (UTC):
```sql
-- tasks table
due_date: 2025-10-27 16:55:00  (4:55 PM UTC)
created_at: 2025-10-27 08:35:19  (8:35 AM UTC)

-- phase_deliverable_submissions table
submitted_at: 2025-10-27 11:46:52  (11:46 AM UTC)
```

### After (Philippine Time +8):
```sql
-- tasks table
due_date: 2025-10-28 00:55:00  (12:55 AM next day)
created_at: 2025-10-27 16:35:19  (4:35 PM same day)

-- phase_deliverable_submissions table
submitted_at: 2025-10-27 19:46:52  (7:46 PM = your time!)
```

---

## ✅ Verification Queries

After running the conversion, use these queries to verify:

### 1. Check Column Types
```sql
SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'timestamp without time zone' THEN '✅ Converted'
        WHEN data_type = 'timestamp with time zone' THEN '❌ Still UTC'
        ELSE '⚠️ Other'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;
```

### 2. Check Sample Data
```sql
-- Check your recent submission
SELECT 
    id,
    submitted_at,
    created_at,
    updated_at
FROM phase_deliverable_submissions
ORDER BY submitted_at DESC
LIMIT 5;
```

### 3. Count Converted Columns
```sql
SELECT 
    data_type,
    COUNT(*) as total,
    CASE 
        WHEN data_type = 'timestamp without time zone' THEN '✅ Success'
        WHEN data_type = 'timestamp with time zone' THEN '❌ Not converted'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
GROUP BY data_type;
```

---

## ⚠️ Important Notes

### 1. **Backup First** (Optional but Recommended)
```sql
-- Create backup of important tables
CREATE TABLE tasks_backup AS SELECT * FROM tasks;
CREATE TABLE phase_deliverable_submissions_backup AS SELECT * FROM phase_deliverable_submissions;
```

### 2. **RLS Policies**
- The script **does NOT drop policies** for most tables
- Only `phase_deliverable_submissions` policies are temporarily dropped (if using that specific script)
- All other policies remain intact

### 3. **Auth Tables Excluded**
The script automatically excludes:
- `auth.users`
- `storage.objects`
- `storage.buckets`

These are system tables and should remain in UTC.

### 4. **Restart Backend**
After conversion:
```bash
# Stop backend
Ctrl+C (in backend terminal)

# Restart backend
cd backend
npm start
```

---

## 🔧 Rollback (If Needed)

If something goes wrong:

```sql
-- Restore from backup
DROP TABLE tasks;
ALTER TABLE tasks_backup RENAME TO tasks;

-- Or convert back to UTC (-8 hours)
UPDATE phase_deliverable_submissions
SET submitted_at = submitted_at - INTERVAL '8 hours'
WHERE submitted_at IS NOT NULL;
```

---

## 📝 Time Format Display

### Database Stores (24-hour):
```
19:46:52  (7:46 PM)
23:59:59  (11:59 PM)
00:00:00  (12:00 AM midnight)
```

### Frontend Display (Can be 12-hour):
```javascript
// In your React component
new Date(submitted_at).toLocaleString('en-US', {
  hour: 'numeric',
  minute: 'numeric',
  hour12: true  // Shows "7:46 PM"
});
```

---

## 🎯 Quick Start

**For most users**, just run:

1. Open Supabase SQL Editor
2. Copy all from `convert_entire_database_to_philippine_time.sql`
3. Paste and RUN
4. Check verification queries
5. Restart backend server

**Done!** 🎉

---

## 📞 Troubleshooting

### Issue: "cannot alter type of a column used in a policy"
**Solution**: The automatic script handles this by dropping/recreating policies.

### Issue: "Some columns still show UTC"
**Solution**: Check if those tables are excluded (auth.*, storage.*). That's normal.

### Issue: "Times are 8 hours ahead now"
**Solution**: That's correct! 7:46 PM shows as `19:46` in 24-hour format.

### Issue: "New submissions still use UTC"
**Solution**: 
1. Restart backend server
2. Check if `LOCALTIMESTAMP` is set as default
3. Verify triggers are updated

---

## ✨ After Conversion

### What Changes:
- ✅ All times display in Philippine time
- ✅ New records automatically use Philippine time
- ✅ No more manual timezone conversion needed
- ✅ `created_at`, `updated_at` triggers work correctly

### What Stays Same:
- ✅ All your data relationships
- ✅ All RLS policies (security)
- ✅ All foreign keys
- ✅ Application logic

**Just the timezone changes - everything else is preserved!** 🎉

