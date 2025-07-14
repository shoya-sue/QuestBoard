# Production Environment Configuration

project_name = "questboard"
environment  = "production"
region       = "us-east-1"

# Network Configuration
vpc_cidr              = "10.0.0.0/16"
availability_zones    = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs   = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs  = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
database_subnet_cidrs = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]

# EKS Configuration
eks_cluster_version         = "1.28"
eks_node_instance_types     = ["t3.large", "t3.xlarge"]
eks_node_group_min_size     = 3
eks_node_group_max_size     = 20
eks_node_group_desired_size = 6

# RDS Configuration
rds_instance_class       = "db.t3.large"
rds_allocated_storage    = 200
rds_engine_version      = "15.4"
multi_az                = true
backup_retention_period = 30

# ElastiCache Configuration
elasticache_node_type       = "cache.t3.medium"
elasticache_num_cache_nodes = 3

# Domain Configuration
domain_name = "questboard.example.com"

# Cloudflare Configuration
# cloudflare_zone_id は実際の値に置き換えてください
cloudflare_zone_id = "your-cloudflare-zone-id"

# Security Configuration
enable_deletion_protection = true

# Tags
tags = {
  Project     = "QuestBoard"
  Environment = "production"
  ManagedBy   = "Terraform"
  Owner       = "Platform Team"
  CostCenter  = "Engineering"
}