# 🚀 ERP Database Migration Guide: Cloud to Self-Hosted Supabase

Based on the [Supabase documentation](https://supabase.com/docs/guides/troubleshooting/transferring-from-cloud-to-self-host-in-supabase-2oWNvW), this guide will help you migrate your complete ERP database from cloud Supabase to your self-hosted instance.

## 📋 Prerequisites

- Access to your cloud Supabase dashboard
- PostgreSQL client (psql) installed
- Your self-hosted Supabase instance running at `https://supabase.letsdine.net`
- Database credentials for both cloud and self-hosted instances

## 🎯 Migration Options

### Option 1: Complete Database Dump (Recommended for Full Migration)

#### Step 1: Get Your Cloud Database Credentials
1. Go to your Supabase dashboard
2. Navigate to Settings → Database
3. Copy the connection string

#### Step 2: Export Complete Database
```bash
# Replace YOUR_PROJECT_REF and YOUR_PASSWORD with actual values
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  --clean --no-owner --no-privileges \
  --exclude-schema=_realtime --exclude-schema=realtime \
  --exclude-schema=supabase_functions \
  -f erp_complete_backup.sql
```

#### Step 3: Import to Self-Hosted
```bash
# Import to your self-hosted instance
psql -h supabase.letsdine.net -p 5432 -d postgres -U postgres -f erp_complete_backup.sql
```

### Option 2: Schema + Data Migration (Recommended for Your Setup)

This approach uses your existing migration files for better control.

#### Step 1: Create Schema on Self-Hosted
```bash
# Upload and run the complete schema migration
psql -h supabase.letsdine.net -p 5432 -d postgres -U postgres -f complete_erp_migration.sql
```

#### Step 2: Export Data from Cloud
1. Run the `export_data_from_cloud.sql` script on your **CLOUD** Supabase:
   - Copy the script content
   - Run it in your cloud Supabase SQL editor
   - Save the output as `exported_data.sql`

#### Step 3: Import Data to Self-Hosted
```bash
# Import the exported data
psql -h supabase.letsdine.net -p 5432 -d postgres -U postgres -f exported_data.sql
```

## 🗂️ What Gets Migrated

### ✅ Core Business Data
- **Suppliers**: All supplier information and statistics
- **Warehouses**: Warehouse locations and configurations  
- **Products**: Complete product catalog with categories and attributes
- **Packaging**: Packaging items and attributes
- **Customers**: Customer database with purchase history
- **Sales**: All sales transactions and line items
- **Purchases**: Purchase orders and received items
- **Stock**: Multi-warehouse inventory levels

### ✅ Accounting System
- **Chart of Accounts**: Complete account structure
- **Journal Entries**: Double-entry bookkeeping records
- **Payment Methods**: Payment processing configuration
- **Transactions**: All financial transactions

### ✅ System Data
- **User Profiles**: User accounts and roles
- **Activity Logs**: Audit trail (last 1000 entries)
- **Indexes**: Database performance optimizations
- **Triggers**: Automated business logic

### ✅ Configuration
- **Default Accounts**: Cash, Bkash, Nagad, Rocket, Bank accounts
- **Payment Methods**: Pre-configured payment options
- **Business Rules**: Validation and constraints

## 🔧 Post-Migration Steps

### 1. Verify Migration
```sql
-- Check table counts
SELECT schemaname, tablename, n_tup_ins as row_count 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
ORDER BY n_tup_ins DESC;

-- Verify key business data
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as sales_count FROM sales;
SELECT COUNT(*) as customer_count FROM customers;
SELECT COUNT(*) as supplier_count FROM suppliers;
```

### 2. Update Application Configuration
Update your `.env` file to point to the self-hosted instance:
```env
NEXT_PUBLIC_SUPABASE_URL=https://supabase.letsdine.net
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_SELF_HOSTED_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SELF_HOSTED_SERVICE_KEY]
```

### 3. Test Critical Functions
- [ ] User authentication and profiles
- [ ] Product and inventory management
- [ ] Sales processing
- [ ] Purchase order creation
- [ ] Financial reporting
- [ ] Multi-warehouse stock tracking

### 4. Enable Row Level Security (RLS)
```sql
-- Enable RLS on critical tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies as needed for your security requirements
```

## 🚨 Important Notes

### Data Integrity
- Foreign key relationships are preserved
- All indexes and constraints are maintained
- Triggers and functions are included

### Authentication
- User authentication will need to be reconfigured
- Auth providers need to be set up on self-hosted instance
- User sessions will be reset (users need to log in again)

### Supabase Features
- Realtime subscriptions need reconfiguration
- Storage buckets need separate migration if used
- Edge functions need redeployment

## 🔍 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Verify self-hosted instance is running
   curl https://supabase.letsdine.net/rest/v1/
   ```

2. **Permission Denied**
   ```sql
   -- Check user permissions
   SELECT * FROM pg_roles WHERE rolname = 'postgres';
   ```

3. **Foreign Key Violations**
   ```sql
   -- Temporarily disable foreign key checks during import
   SET session_replication_role = replica;
   -- Run import
   SET session_replication_role = DEFAULT;
   ```

4. **Large Data Sets**
   ```bash
   # For large databases, use compression
   pg_dump ... | gzip > backup.sql.gz
   gunzip -c backup.sql.gz | psql ...
   ```

## 📊 Migration Verification Checklist

- [ ] All tables created with correct structure
- [ ] Data counts match between cloud and self-hosted
- [ ] User authentication works
- [ ] Application connects successfully
- [ ] Critical business processes function
- [ ] Reports generate correctly
- [ ] Performance is acceptable

## 🎉 Success!

Once migration is complete, you'll have:
- Full control over your database infrastructure
- Reduced dependency on cloud providers
- Better data sovereignty and compliance
- Potential cost savings for large deployments

Your ERP system is now running on your self-hosted Supabase instance at `https://supabase.letsdine.net`! 