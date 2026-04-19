#!/usr/bin/env bash
# ============================================
# RunReady SG — AWS RDS PostgreSQL Provisioning
# Creates db.t3.micro with PostGIS in ap-southeast-1
# ============================================
set -euo pipefail

REGION="ap-southeast-1"
DB_INSTANCE_ID="runready-db"
DB_NAME="runready"
DB_USER="runready_user"
DB_PASSWORD="RunReady2026Sg"
SG_NAME="runready-rds-sg"
SUBNET_GROUP="runready-db-subnet"

echo "=== RunReady SG — RDS Provisioning ==="

# 1. Get default VPC
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text --region "$REGION")
echo "Default VPC: $VPC_ID"

VPC_CIDR=$(aws ec2 describe-vpcs --vpc-ids "$VPC_ID" \
  --query "Vpcs[0].CidrBlock" --output text --region "$REGION")
echo "VPC CIDR: $VPC_CIDR"

# 2. Create security group
echo "Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name "$SG_NAME" \
  --description "RunReady SG - RDS PostgreSQL access" \
  --vpc-id "$VPC_ID" \
  --query "GroupId" --output text --region "$REGION" 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SG_NAME" \
    --query "SecurityGroups[0].GroupId" --output text --region "$REGION")
echo "Security Group: $SG_ID"

# Allow PostgreSQL from within VPC (EC2 access)
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" --protocol tcp --port 5432 \
  --cidr "$VPC_CIDR" --region "$REGION" 2>/dev/null || true

# Allow PostgreSQL from anywhere (for team development — password-protected)
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" --protocol tcp --port 5432 \
  --cidr "0.0.0.0/0" --region "$REGION" 2>/dev/null || true

# 3. Create DB subnet group
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=defaultForAz,Values=true" "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" --output text --region "$REGION")
echo "Subnets: $SUBNET_IDS"

aws rds create-db-subnet-group \
  --db-subnet-group-name "$SUBNET_GROUP" \
  --db-subnet-group-description "RunReady SG RDS subnet group" \
  --subnet-ids $SUBNET_IDS \
  --region "$REGION" 2>/dev/null || true

# 4. Create RDS instance
echo "Creating RDS instance (db.t3.micro, PostgreSQL 15)..."
aws rds create-db-instance \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.13 \
  --master-username "$DB_USER" \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-name "$DB_NAME" \
  --vpc-security-group-ids "$SG_ID" \
  --db-subnet-group-name "$SUBNET_GROUP" \
  --publicly-accessible \
  --backup-retention-period 7 \
  --no-multi-az \
  --no-auto-minor-version-upgrade \
  --tags Key=Project,Value=RunReadySG Key=Course,Value=CloudComputing \
  --region "$REGION"

echo ""
echo "Waiting for RDS to become available (this takes ~5-10 minutes)..."
aws rds wait db-instance-available \
  --db-instance-identifier "$DB_INSTANCE_ID" --region "$REGION"

# 5. Get endpoint
ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --query "DBInstances[0].Endpoint.Address" --output text --region "$REGION")

echo ""
echo "========================================="
echo "RDS Provisioned Successfully!"
echo "========================================="
echo "Endpoint: $ENDPOINT"
echo "Port:     5432"
echo "Database: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME"
echo ""
echo "Next steps:"
echo "  1. Copy DATABASE_URL to .env"
echo "  2. Run schema:  psql \$DATABASE_URL -f database/migrations/001_init_schema.sql"
echo "  3. Seed data:   python database/seeds/load_shelters.py"
