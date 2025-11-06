# Quick Start: Applying Migrations

## Prerequisites
- PostgreSQL client installed
- Database credentials ready
- Backup of database taken (CRITICAL!)
- Development environment ready (not production!)

## Step-by-Step Execution

### 1. Take Backup
```bash
pg_dump -U [username] -h [host] [database_name] > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Apply Migrations in Order

```bash
#!/bin/bash

# Set your database credentials
DB_USER="your_username"
DB_NAME="your_database"
DB_HOST="localhost"

echo "Starting migration sequence..."
echo "=================================="

# Migration 1
echo "Applying Migration 1: Phase Evaluation Schema Updates..."
psql -U $DB_USER -h $DB_HOST $DB_NAME < 001_phase_evaluation_schema_updates.sql
if [ $? -eq 0 ]; then echo "✓ Migration 1 complete"; else echo "✗ Migration 1 failed"; exit 1; fi
echo ""

# Migration 2
echo "Applying Migration 2: Project Evaluation Forms Updates..."
psql -U $DB_USER -h $DB_HOST $DB_NAME < 002_project_evaluation_forms_updates.sql
if [ $? -eq 0 ]; then echo "✓ Migration 2 complete"; else echo "✗ Migration 2 failed"; exit 1; fi
echo ""

# Migration 3
echo "Applying Migration 3: Consolidate Evaluation Tables..."
psql -U $DB_USER -h $DB_HOST $DB_NAME < 003_consolidate_evaluation_tables.sql
if [ $? -eq 0 ]; then echo "✓ Migration 3 complete"; else echo "✗ Migration 3 failed"; exit 1; fi
echo ""

# Migration 4
echo "Applying Migration 4: Create Recalculation Functions..."
psql -U $DB_USER -h $DB_HOST $DB_NAME < 004_create_evaluation_recalculation_functions.sql
if [ $? -eq 0 ]; then echo "✓ Migration 4 complete"; else echo "✗ Migration 4 failed"; exit 1; fi
echo ""

# Migration 5
echo "Applying Migration 5: Fix Existing Evaluation Deadlines..."
psql -U $DB_USER -h $DB_HOST $DB_NAME < 005_fix_existing_evaluation_deadlines.sql
if [ $? -eq 0 ]; then echo "✓ Migration 5 complete"; else echo "✗ Migration 5 failed"; exit 1; fi
echo ""

# Migration 6 (Optional - cleanup)
read -p "Apply Migration 6 (cleanup old tables)? This is destructive! (yes/no): " response
if [ "$response" = "yes" ]; then
    echo "Applying Migration 6: Cleanup Redundant Tables..."
    psql -U $DB_USER -h $DB_HOST $DB_NAME < 006_cleanup_redundant_tables.sql
    if [ $? -eq 0 ]; then echo "✓ Migration 6 complete"; else echo "✗ Migration 6 failed"; exit 1; fi
else
    echo "Skipped Migration 6. You can run it manually later when ready."
fi

echo ""
echo "=================================="
echo "All migrations applied successfully!"
echo "Next steps:"
echo "1. Review MIGRATION_GUIDE.md"
echo "2. Update backend code (see guide)"
echo "3. Run validation queries (see guide)"
echo "4. Test in development"
echo "5. Deploy to production"
```

### 3. Verify Each Migration

```bash
# After each migration, verify it worked
psql -U [username] -d [database] << EOF

-- Check foreign keys exist
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'phase_evaluation_forms' 
AND constraint_type = 'FOREIGN KEY';

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'recalculate%';

-- Check triggers exist
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

EOF
```

### 4. Test with Validation Query

```sql
-- Pick any project and validate
SELECT * FROM validate_evaluation_deadlines('SOME_PROJECT_ID_HERE');
```

## Individual Migration Commands

If you need to apply migrations one at a time:

```bash
# Migration 1
psql -U [user] -d [database] -f migrations/001_phase_evaluation_schema_updates.sql

# Migration 2
psql -U [user] -d [database] -f migrations/002_project_evaluation_forms_updates.sql

# Migration 3
psql -U [user] -d [database] -f migrations/003_consolidate_evaluation_tables.sql

# Migration 4
psql -U [user] -d [database] -f migrations/004_create_evaluation_recalculation_functions.sql

# Migration 5
psql -U [user] -d [database] -f migrations/005_fix_existing_evaluation_deadlines.sql

# Migration 6 (Optional)
psql -U [user] -d [database] -f migrations/006_cleanup_redundant_tables.sql
```

## Windows Command Prompt

```cmd
REM Set variables
SET DB_USER=your_username
SET DB_NAME=your_database
SET DB_HOST=localhost

REM Migration 1
psql -U %DB_USER% -h %DB_HOST% -d %DB_NAME% -f 001_phase_evaluation_schema_updates.sql

REM Migration 2
psql -U %DB_USER% -h %DB_HOST% -d %DB_NAME% -f 002_project_evaluation_forms_updates.sql

REM ... and so on
```

## Windows PowerShell

```powershell
$db_user = "your_username"
$db_name = "your_database"
$db_host = "localhost"

# Migration 1
psql -U $db_user -h $db_host -d $db_name -f 001_phase_evaluation_schema_updates.sql
if ($LASTEXITCODE -eq 0) { Write-Host "✓ Migration 1 complete" } else { Write-Host "✗ Failed"; exit }

# Migration 2
psql -U $db_user -h $db_host -d $db_name -f 002_project_evaluation_forms_updates.sql
if ($LASTEXITCODE -eq 0) { Write-Host "✓ Migration 2 complete" } else { Write-Host "✗ Failed"; exit }

# ... and so on
```

## Troubleshooting

### Migration fails due to missing module
```sql
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
```

### Migration fails due to permissions
```bash
psql -U postgres -d your_database -f migration.sql
# Or use superuser
```

### Can't find migration files
```bash
cd /path/to/migrations
psql -U [user] -d [database] -f 001_phase_evaluation_schema_updates.sql
```

### Database connection timeout
```bash
# Increase timeout
PGCONNECT_TIMEOUT=30 psql -U [user] -h [host] -d [database] -f migration.sql
```

## Validation After All Migrations

```bash
psql -U [user] -d [database] << EOF

-- Should show valid evaluations
SELECT * FROM validate_evaluation_deadlines('PROJECT_ID_HERE') WHERE is_valid = FALSE;

-- Should show 0 rows if all is good
-- If rows show up, review the issue column for what's wrong

EOF
```

## Next: Backend Updates Required

After successful migration, update your backend code:

1. Remove manual deadline calculations - the database now handles this
2. Update queries to use new consolidated tables
3. Remove references to deleted tables (phase_custom_evaluations, project_custom_evaluations)
4. Test phase modification to ensure triggers work
5. Verify project evaluation syncs from last phase

See `MIGRATION_GUIDE.md` section "Backend Code Updates Required" for details.

