# Backup Strategy and Disaster Recovery

This document defines the backup strategy, Recovery Time Objectives (RTO), and Recovery Point Objectives (RPO) for MeJohnC.Org.

---

## Table of Contents

1. [Backup Strategy Overview](#backup-strategy-overview)
2. [RTO and RPO Definitions](#rto-and-rpo-definitions)
3. [Data Categories and Backup Requirements](#data-categories-and-backup-requirements)
4. [Backup Procedures](#backup-procedures)
5. [Recovery Procedures](#recovery-procedures)
6. [Backup Retention Policies](#backup-retention-policies)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Quarterly Backup Testing Schedule](#quarterly-backup-testing-schedule)

---

## Backup Strategy Overview

MeJohnC.Org employs a multi-layered backup strategy that leverages managed service capabilities combined with manual backup procedures for critical data. The strategy is designed to balance cost-effectiveness with reliability requirements appropriate for a personal portfolio and admin platform.

### Architecture Summary

| Component | Provider | Backup Method | Owner |
|-----------|----------|---------------|-------|
| Database | Supabase (PostgreSQL) | PITR + Manual exports | Supabase + Owner |
| Authentication | Clerk | Managed service | Clerk |
| Static Assets | Netlify CDN | Git repository | GitHub + Owner |
| Source Code | GitHub | Distributed Git + GitHub backups | GitHub + Owner |
| Configuration | Netlify/Supabase | Manual documentation | Owner |
| Secrets | Multiple providers | Encrypted exports | Owner |

### Backup Philosophy

1. **Managed Services First**: Leverage built-in backup capabilities of Supabase, Clerk, and Netlify
2. **Defense in Depth**: Multiple backup layers for critical data
3. **Automation Where Possible**: Reduce human error through automated backups
4. **Regular Verification**: Test backups quarterly to ensure recoverability
5. **Documentation**: All recovery procedures documented and tested

---

## RTO and RPO Definitions

### Recovery Time Objective (RTO)

**Definition**: The maximum acceptable time between a service disruption and restoration of service.

| Service | RTO Target | Rationale |
|---------|------------|-----------|
| Public Portfolio Site | 4 hours | Static content cached at CDN; low business impact |
| Admin Dashboard | 8 hours | Internal tool; can tolerate longer outage |
| Database (Read) | 4 hours | Supabase PITR restoration time |
| Database (Write) | 8 hours | May require manual verification |
| Authentication | 2 hours | Clerk SLA; critical for admin access |
| Full Site Recovery | 24 hours | Complete disaster recovery scenario |

### Recovery Point Objective (RPO)

**Definition**: The maximum acceptable amount of data loss measured in time.

| Data Type | RPO Target | Rationale |
|-----------|------------|-----------|
| Portfolio Content | 24 hours | Daily automated backups |
| Blog Posts | 1 hour | Ghost CMS + Supabase PITR |
| CRM Data | 1 hour | Supabase PITR (Pro plan) |
| User Sessions | 0 (no persistence) | Sessions are stateless; no loss |
| Audit Logs | 7 days | Point-in-time recovery window |
| Configuration | 24 hours | Manual backup after changes |

### Service Level Alignment

These RTO/RPO targets align with the availability SLO of 99.9% (43.2 minutes downtime/month). During extended outages that exceed RTO, the error budget policy activates (see `docs/observability/slos-slis.md`).

---

## Data Categories and Backup Requirements

### 1. Database (Supabase PostgreSQL)

**Data Inventory**:

| Schema | Tables | Criticality | Backup Priority |
|--------|--------|-------------|-----------------|
| Portfolio | `apps`, `projects`, `blog_posts`, `work_history`, `skills` | High | P1 |
| Site Content | `site_content`, `contact_links`, `timelines`, `case_studies` | High | P1 |
| CRM | CRM-related tables | Medium | P2 |
| News System | `news_sources`, `news_articles`, `bookmarks` | Low | P3 |
| AI Agent | `agent_commands`, `agent_responses`, `agent_sessions` | Low | P3 |
| System | `admin_users`, `audit_logs` | High | P1 |

**Backup Methods**:

1. **Supabase Point-in-Time Recovery (PITR)** - Primary
   - Available on Pro plan
   - 7-day retention window
   - 1-second granularity recovery
   - Automatic, no configuration required

2. **Daily Automated Backups** - Supabase managed
   - Daily snapshots
   - Retention based on plan tier

3. **Manual SQL Exports** - Secondary
   - Weekly full schema + data exports
   - Stored in secure off-site location
   - 90-day retention

**RLS Considerations**:
- Backup exports must use service role key to capture all data
- RLS policies are included in schema-only backups
- `is_admin()` function must be restored before data

### 2. User Authentication Data (Clerk)

**Data Managed by Clerk**:
- User accounts and profiles
- Authentication credentials (hashed)
- Session tokens
- MFA configurations
- Social login connections

**Backup Responsibility**:
- **Clerk manages**: All authentication data backups
- **Owner manages**: `admin_users` table in Supabase (maps Clerk users to admin access)

**Recovery Approach**:
- Clerk provides 99.99% availability SLA
- User data is replicated across Clerk's infrastructure
- In case of Clerk outage: Site operates in read-only mode (public pages still accessible)
- Recovery action: Wait for Clerk service restoration; no data restoration needed

**Owner Backup Tasks**:
```bash
# Export admin user mappings (monthly)
supabase db dump --table admin_users --project-ref $SUPABASE_PROJECT_REF > admin_users_$(date +%Y%m%d).sql
```

### 3. Static Assets and Code (GitHub, Netlify)

**Source Code (GitHub)**:
- Repository: `mejohnc-ft/MeJohnC.Org`
- Built-in protection: Distributed Git, GitHub's replication
- Additional: Local clones on development machines

**Static Assets (Netlify)**:
- Built assets deployed from Git
- Atomic deploys with instant rollback
- Previous deploys retained indefinitely on free tier

**Backup Strategy**:

1. **Git Repository**
   - All code changes committed to Git
   - Main branch protected with required reviews
   - Tags for release versions

2. **Local Development Backups**
   - Development machines have full repository clones
   - Regular `git fetch --all` to sync

3. **GitHub Export** (Annual)
   ```bash
   # Full repository archive
   git clone --mirror git@github.com:mejohnc-ft/MeJohnC.Org.git
   tar -czvf mejohnc-org-mirror-$(date +%Y%m%d).tar.gz MeJohnC.Org.git
   ```

**Recovery**:
- From GitHub: Clone and redeploy
- From local: Push to GitHub, trigger Netlify deploy
- From Netlify: Rollback to previous deploy via dashboard

### 4. Configuration and Secrets

**Configuration Files**:

| File | Location | Backup Method |
|------|----------|---------------|
| `netlify.toml` | Repository | Git |
| `vite.config.ts` | Repository | Git |
| `tsconfig.json` | Repository | Git |
| Supabase SQL schemas | Repository (`supabase/`) | Git |

**Secrets Management**:

| Secret | Storage | Backup Method |
|--------|---------|---------------|
| Clerk keys | Netlify env vars | Encrypted export |
| Supabase keys | Netlify env vars | Encrypted export |
| Ghost API key | Netlify env vars | Encrypted export |
| Sentry DSN | Netlify env vars | Encrypted export |
| GitHub tokens | GitHub Secrets | Manual documentation |

**Secrets Backup Procedure**:

1. **Do NOT store secrets in Git**
2. **Export encrypted secrets quarterly**:
   ```bash
   # Export Netlify environment variables
   netlify env:list > /tmp/env-export.txt

   # Encrypt with GPG
   gpg --symmetric --cipher-algo AES256 /tmp/env-export.txt

   # Store encrypted file securely (e.g., password manager)
   mv /tmp/env-export.txt.gpg ~/secure-backups/

   # Clean up
   rm /tmp/env-export.txt
   ```

3. **Document secret locations** in password manager:
   - Netlify site ID and project settings URL
   - Supabase project URL and dashboard link
   - Clerk application dashboard link
   - All API key generation sources

---

## Backup Procedures

### Automated Backups (Supabase PITR)

**How It Works**:
- Supabase continuously archives PostgreSQL Write-Ahead Logs (WAL)
- Enables recovery to any point within the retention window
- Automatic, requires no manual intervention

**Verification**:
1. Check Supabase Dashboard > Settings > Database > Backups
2. Verify "Point-in-time Recovery" is enabled
3. Note the oldest recoverable point

**Limitations**:
- Requires Pro plan or higher
- 7-day retention (adjustable on higher plans)
- Recovery creates a new database instance

### Manual Backup Procedures

#### Full Database Backup

**Frequency**: Weekly (Sunday at 2 AM)

**Procedure**:

```bash
#!/bin/bash
# backup-full.sh

# Set variables
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_REF=$SUPABASE_PROJECT_REF

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Full schema + data backup
supabase db dump --project-ref $PROJECT_REF > "$BACKUP_DIR/$DATE/full_backup.sql"

# Schema only (for reference)
supabase db dump --schema-only --project-ref $PROJECT_REF > "$BACKUP_DIR/$DATE/schema_only.sql"

# Compress
gzip "$BACKUP_DIR/$DATE/full_backup.sql"
gzip "$BACKUP_DIR/$DATE/schema_only.sql"

# Calculate checksum
sha256sum "$BACKUP_DIR/$DATE/"*.gz > "$BACKUP_DIR/$DATE/checksums.sha256"

# Upload to secure storage (optional)
# aws s3 cp "$BACKUP_DIR/$DATE/" s3://backup-bucket/mejohnc-org/$DATE/ --recursive

echo "Backup completed: $BACKUP_DIR/$DATE"
```

#### Critical Tables Backup

**Frequency**: Daily

**Procedure**:

```bash
#!/bin/bash
# backup-critical.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/path/to/backups/daily"
PROJECT_REF=$SUPABASE_PROJECT_REF

mkdir -p "$BACKUP_DIR"

# Critical tables only
CRITICAL_TABLES="apps blog_posts projects work_history site_content admin_users"

for table in $CRITICAL_TABLES; do
  supabase db dump --table $table --project-ref $PROJECT_REF > "$BACKUP_DIR/${table}_${DATE}.sql"
done

# Combine and compress
tar -czvf "$BACKUP_DIR/critical_${DATE}.tar.gz" "$BACKUP_DIR"/*_${DATE}.sql
rm "$BACKUP_DIR"/*_${DATE}.sql

echo "Critical backup completed: $BACKUP_DIR/critical_${DATE}.tar.gz"
```

### Backup Verification and Testing

#### Automated Verification

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE=$1
VERIFY_DB="verify_restore_$(date +%s)"

# Verify checksum
sha256sum -c checksums.sha256 || exit 1

# Test restore to temporary database
createdb $VERIFY_DB
gunzip -c $BACKUP_FILE | psql $VERIFY_DB

# Basic validation queries
psql $VERIFY_DB -c "SELECT COUNT(*) FROM apps;"
psql $VERIFY_DB -c "SELECT COUNT(*) FROM blog_posts;"
psql $VERIFY_DB -c "SELECT COUNT(*) FROM admin_users;"

# Check for required functions
psql $VERIFY_DB -c "SELECT is_admin();" 2>/dev/null && echo "is_admin() function present"

# Cleanup
dropdb $VERIFY_DB

echo "Backup verification completed successfully"
```

#### Manual Verification Checklist

- [ ] Backup file exists and is non-empty
- [ ] Checksum matches recorded value
- [ ] File can be decompressed without errors
- [ ] SQL syntax is valid (no parsing errors)
- [ ] Row counts match expected values
- [ ] Critical tables are present
- [ ] RLS policies are included in schema backup

---

## Recovery Procedures

### Database Restore from Backup

#### Scenario 1: Restore to Supabase (Partial Data Loss)

**When to Use**: Accidental deletion, data corruption affecting specific tables

**Procedure**:

1. **Identify the backup to restore**:
   ```bash
   ls -la /path/to/backups/
   ```

2. **Verify backup integrity**:
   ```bash
   sha256sum -c checksums.sha256
   gunzip -t backup_file.sql.gz
   ```

3. **Connect to Supabase**:
   ```bash
   # Get connection string from Supabase Dashboard > Settings > Database
   export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
   ```

4. **Restore specific tables** (safer approach):
   ```bash
   # Backup current state first
   pg_dump $DATABASE_URL -t affected_table > pre_restore_backup.sql

   # Clear affected table
   psql $DATABASE_URL -c "TRUNCATE TABLE affected_table CASCADE;"

   # Restore from backup
   gunzip -c backup.sql.gz | psql $DATABASE_URL
   ```

5. **Verify restoration**:
   ```sql
   SELECT COUNT(*) FROM affected_table;
   SELECT * FROM affected_table LIMIT 10;
   ```

#### Scenario 2: Full Database Restore

**When to Use**: Complete database corruption, disaster recovery testing

**Warning**: This overwrites all existing data. Use with extreme caution.

**Procedure**:

1. **Notify stakeholders** of impending maintenance

2. **Enable maintenance mode** (update site to show maintenance page)

3. **Backup current state** (even if corrupted):
   ```bash
   pg_dump $DATABASE_URL > emergency_backup_$(date +%s).sql
   ```

4. **Restore from backup**:
   ```bash
   # Option A: Via Supabase Dashboard
   # Settings > Database > Backups > Restore

   # Option B: Via psql (for manual backups)
   psql $DATABASE_URL < full_backup.sql
   ```

5. **Verify RLS and functions**:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   SELECT proname FROM pg_proc WHERE proname = 'is_admin';
   ```

6. **Test application**:
   - Verify public pages load
   - Test admin authentication
   - Check CRUD operations

7. **Disable maintenance mode**

### Point-in-Time Recovery (Supabase PITR)

**When to Use**: Need to recover to a specific moment (e.g., just before accidental deletion)

**Procedure**:

1. **Access Supabase Dashboard**:
   - Navigate to: Project > Settings > Database > Backups
   - Select "Point-in-time Recovery"

2. **Choose recovery point**:
   - Select the timestamp just before the incident
   - Note: You need to know approximately when the incident occurred

3. **Initiate recovery**:
   - Supabase creates a NEW database instance with recovered data
   - Original database remains unchanged

4. **Verify recovered instance**:
   - Connect to the new instance
   - Verify data integrity
   - Test critical queries

5. **Switch to recovered database**:
   - Update Supabase project settings to use recovered instance
   - Update connection strings in Netlify environment variables
   - Redeploy application

6. **Post-recovery**:
   - Document the incident
   - Archive or delete old database instance
   - Verify all systems operational

### Full Disaster Recovery

**Scenario**: Complete loss of all services (Supabase, Netlify, or regional outage)

**Recovery Playbook**:

#### Phase 1: Assessment (0-30 minutes)

1. **Identify affected services**:
   - Check status.supabase.com
   - Check netlify.com/status
   - Check status.clerk.com

2. **Notify stakeholders**:
   - Update status page (if available)
   - Post to social media about outage

3. **Gather recovery materials**:
   - Latest backup files
   - Encrypted secrets export
   - Repository access credentials

#### Phase 2: Infrastructure Recovery (30 min - 4 hours)

1. **Database**:
   ```bash
   # If Supabase region affected, create new project in different region
   # Restore from latest manual backup
   supabase db push --project-ref NEW_PROJECT_REF
   psql $NEW_DATABASE_URL < latest_backup.sql
   ```

2. **Hosting**:
   ```bash
   # If Netlify affected, deploy to backup provider (Vercel, Cloudflare Pages)
   # Clone repository
   git clone git@github.com:mejohnc-ft/MeJohnC.Org.git

   # Deploy to backup provider
   vercel deploy --prod  # or cloudflare pages deploy
   ```

3. **DNS**:
   - Update DNS to point to backup infrastructure
   - Allow propagation time (TTL dependent)

#### Phase 3: Application Recovery (4-8 hours)

1. **Update environment variables** on backup infrastructure
2. **Update Clerk configuration** for new domains
3. **Test all critical paths**:
   - Public portfolio pages
   - Admin authentication
   - Database read/write operations
4. **Monitor for errors** in Sentry

#### Phase 4: Verification and Communication (8-24 hours)

1. **Full application testing**
2. **Stakeholder communication** that service is restored
3. **Incident documentation**
4. **Post-incident review** scheduled

---

## Backup Retention Policies

### Retention Schedule

| Backup Type | Frequency | Retention Period | Storage Location |
|-------------|-----------|------------------|------------------|
| Supabase PITR | Continuous | 7 days | Supabase (managed) |
| Supabase Daily | Daily | Per plan tier | Supabase (managed) |
| Manual Full | Weekly | 90 days | Secure off-site storage |
| Manual Critical | Daily | 30 days | Secure off-site storage |
| Schema Only | Weekly | 1 year | Git repository + off-site |
| Secrets Export | Quarterly | 1 year | Encrypted in password manager |
| Git Repository | Continuous | Indefinite | GitHub + local clones |

### Retention Automation

```bash
#!/bin/bash
# cleanup-old-backups.sh

BACKUP_DIR="/path/to/backups"

# Remove daily backups older than 30 days
find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +30 -delete

# Remove weekly backups older than 90 days
find "$BACKUP_DIR/weekly" -name "*.tar.gz" -mtime +90 -delete

# Log cleanup
echo "$(date): Cleanup completed" >> "$BACKUP_DIR/cleanup.log"
```

### Compliance Notes

- No PII retention requirements for personal portfolio site
- Audit logs retained for 90 days per security policy
- Backups containing user data should follow privacy policy guidelines

---

## Monitoring and Alerting

### Backup Health Monitoring

#### Supabase Dashboard Checks

**Daily**:
- Verify database is operational
- Check for any automated backup failures in notifications

**Weekly**:
- Review Supabase Dashboard > Settings > Database > Backups
- Verify PITR is enabled and functioning
- Check oldest available recovery point

#### Automated Monitoring Script

```bash
#!/bin/bash
# monitor-backups.sh

# Check for recent backup
BACKUP_DIR="/path/to/backups/daily"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "ALERT: No backup files found!"
  # Send alert (email, Slack, etc.)
  exit 1
fi

# Check backup age
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))

if [ $BACKUP_AGE -gt 48 ]; then
  echo "ALERT: Latest backup is $BACKUP_AGE hours old!"
  # Send alert
  exit 1
fi

# Check backup size (should not be empty)
BACKUP_SIZE=$(stat -c %s "$LATEST_BACKUP")

if [ $BACKUP_SIZE -lt 1000 ]; then
  echo "ALERT: Backup file suspiciously small: $BACKUP_SIZE bytes"
  # Send alert
  exit 1
fi

echo "OK: Backup health check passed"
```

### Alert Configuration

| Alert | Condition | Severity | Notification |
|-------|-----------|----------|--------------|
| No recent backup | No backup in 48 hours | P2 | Email + Slack |
| Backup size anomaly | Size < 1KB or > 2x normal | P3 | Email |
| PITR disabled | PITR not available | P2 | Email |
| Storage quota warning | > 80% of backup storage | P4 | Weekly digest |
| Backup verification failed | Checksum mismatch | P1 | Immediate page |

### Integration with Existing Alerting

Add backup monitoring to existing alert configuration (see `docs/observability/alerting.md`):

```yaml
# Add to alerting configuration
backup_alerts:
  - name: backup_age
    condition: backup_age_hours > 48
    severity: P2
    action: slack-urgent
    message: "Database backup is overdue"

  - name: backup_verification
    condition: backup_verification_failed == true
    severity: P1
    action: page-oncall
    message: "Backup verification failed - potential data integrity issue"
```

---

## Quarterly Backup Testing Schedule

### Testing Calendar Template

| Quarter | Month | Week | Test Activity |
|---------|-------|------|---------------|
| Q1 | January | 3rd | Full restore test to staging |
| Q1 | February | 2nd | PITR recovery drill |
| Q1 | March | 4th | Secrets recovery test |
| Q2 | April | 3rd | Full restore test to staging |
| Q2 | May | 2nd | Cross-region recovery drill |
| Q2 | June | 4th | Retention policy audit |
| Q3 | July | 3rd | Full restore test to staging |
| Q3 | August | 2nd | PITR recovery drill |
| Q3 | September | 4th | Disaster recovery tabletop |
| Q4 | October | 3rd | Full restore test to staging |
| Q4 | November | 2nd | Annual backup strategy review |
| Q4 | December | 1st | Secrets rotation + backup |

### Quarterly Test Procedures

#### Full Restore Test

**Objective**: Verify backups can be restored to a functional state

**Duration**: 2-4 hours

**Checklist**:

```markdown
## Full Restore Test - Q[X] [YEAR]

Date: ___________
Performed by: ___________

### Pre-Test
- [ ] Identify backup to test (date: _________)
- [ ] Verify backup file integrity (checksum: _________)
- [ ] Prepare staging environment
- [ ] Notify team of test

### Restore Process
- [ ] Create staging database
- [ ] Restore schema (time: _____ minutes)
- [ ] Restore data (time: _____ minutes)
- [ ] Verify RLS policies restored
- [ ] Verify functions restored (is_admin, etc.)

### Validation
- [ ] Row counts match expected (apps: ___, blog_posts: ___, etc.)
- [ ] Sample data spot check passed
- [ ] Application connects successfully
- [ ] Admin authentication works
- [ ] Public pages render correctly
- [ ] CRUD operations functional

### Post-Test
- [ ] Clean up staging environment
- [ ] Document any issues found
- [ ] Update procedures if needed
- [ ] File test report

### Results
Restore successful: YES / NO
Total time: _____ minutes
Issues found: _____________________________
Actions required: _________________________
```

#### PITR Recovery Drill

**Objective**: Practice point-in-time recovery process

**Duration**: 1-2 hours

**Checklist**:

```markdown
## PITR Recovery Drill - Q[X] [YEAR]

Date: ___________
Performed by: ___________

### Scenario
Simulated incident: ___________
Target recovery point: ___________

### Process
- [ ] Access Supabase Dashboard
- [ ] Locate PITR option
- [ ] Select recovery timestamp
- [ ] Initiate recovery
- [ ] Record recovery duration: _____ minutes

### Validation
- [ ] Data present at expected state
- [ ] No data loss beyond RPO
- [ ] Application functional with recovered database

### Cleanup
- [ ] Delete test recovery instance
- [ ] Document lessons learned
```

#### Disaster Recovery Tabletop

**Objective**: Walk through full DR scenario without executing

**Duration**: 1 hour

**Discussion Points**:

1. Scenario presentation (10 min)
2. Phase 1: Assessment decisions (15 min)
3. Phase 2: Recovery steps review (15 min)
4. Phase 3: Communication planning (10 min)
5. Gaps and improvements identified (10 min)

---

## Appendix A: Quick Reference Commands

### Backup Commands

```bash
# Full backup
supabase db dump --project-ref $PROJECT_REF > backup.sql

# Schema only
supabase db dump --schema-only --project-ref $PROJECT_REF > schema.sql

# Specific table
supabase db dump --table table_name --project-ref $PROJECT_REF > table.sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Commands

```bash
# Restore from SQL file
psql $DATABASE_URL < backup.sql

# Restore from compressed file
gunzip -c backup.sql.gz | psql $DATABASE_URL

# Restore specific table (after truncating)
psql $DATABASE_URL -c "TRUNCATE TABLE table_name CASCADE;"
psql $DATABASE_URL < table_backup.sql
```

### Verification Commands

```bash
# Check row counts
psql $DATABASE_URL -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# Verify RLS policies
psql $DATABASE_URL -c "SELECT * FROM pg_policies WHERE schemaname = 'public';"

# Test is_admin function
psql $DATABASE_URL -c "SELECT proname FROM pg_proc WHERE proname = 'is_admin';"
```

---

## Appendix B: Related Documentation

- [Database Runbook](../runbooks/database-runbook.md) - Day-to-day database operations
- [Secrets Management](../SECRETS_MANAGEMENT.md) - Secret storage and rotation
- [Incident Response](../runbooks/incident-response.md) - Incident handling procedures
- [SLOs and SLIs](../observability/slos-slis.md) - Service level objectives
- [ADR-0004: Supabase Architecture](../adr/0004-supabase-database-architecture.md) - Database design decisions

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-20 | 1.0 | Claude Code | Initial document (Issue #75) |
