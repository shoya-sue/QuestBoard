provider "aws" {
  region = var.region
  
  default_tags {
    tags = var.tags
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# データソース
data "aws_caller_identity" "current" {}

# VPCモジュール
module "vpc" {
  source = "./modules/vpc"
  
  project_name          = var.project_name
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
}

# EKSモジュール
module "eks" {
  source = "./modules/eks"
  
  project_name             = var.project_name
  environment              = var.environment
  cluster_version          = var.eks_cluster_version
  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_subnet_ids
  node_instance_types      = var.eks_node_instance_types
  node_group_min_size      = var.eks_node_group_min_size
  node_group_max_size      = var.eks_node_group_max_size
  node_group_desired_size  = var.eks_node_group_desired_size
}

# RDSモジュール
module "rds" {
  source = "./modules/rds"
  
  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  database_subnet_ids        = module.vpc.database_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]
  instance_class             = var.rds_instance_class
  allocated_storage          = var.rds_allocated_storage
  engine_version             = var.rds_engine_version
  multi_az                   = var.multi_az
  backup_retention_period    = var.backup_retention_period
  deletion_protection        = var.enable_deletion_protection
}

# ElastiCacheモジュール
module "elasticache" {
  source = "./modules/elasticache"
  
  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]
  node_type                  = var.elasticache_node_type
  num_cache_nodes            = var.elasticache_num_cache_nodes
}

# S3モジュール
module "s3" {
  source = "./modules/s3"
  
  project_name = var.project_name
  environment  = var.environment
}

# ALBモジュール
module "alb" {
  source = "./modules/alb"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  certificate_arn    = module.acm.certificate_arn
  target_group_port  = 80
}

# ACMモジュール
module "acm" {
  source = "./modules/acm"
  
  domain_name = var.domain_name
  zone_id     = var.cloudflare_zone_id
}

# CloudFrontモジュール
module "cloudfront" {
  source = "./modules/cloudfront"
  
  project_name    = var.project_name
  environment     = var.environment
  domain_name     = var.domain_name
  certificate_arn = module.acm.certificate_arn
  alb_domain_name = module.alb.alb_dns_name
  s3_bucket_name  = module.s3.static_bucket_name
}

# Monitoring モジュール
module "monitoring" {
  source = "./modules/monitoring"
  
  project_name         = var.project_name
  environment          = var.environment
  eks_cluster_name     = module.eks.cluster_name
  rds_instance_id      = module.rds.instance_id
  elasticache_cluster_id = module.elasticache.cluster_id
  alb_arn_suffix       = module.alb.alb_arn_suffix
}

# Backupモジュール
module "backup" {
  source = "./modules/backup"
  
  project_name    = var.project_name
  environment     = var.environment
  rds_instance_arn = module.rds.instance_arn
  backup_vault_name = "${var.project_name}-${var.environment}-vault"
  retention_days   = var.backup_retention_period
}

# IAMモジュール
module "iam" {
  source = "./modules/iam"
  
  project_name          = var.project_name
  environment           = var.environment
  eks_cluster_name      = module.eks.cluster_name
  oidc_provider_arn     = module.eks.oidc_provider_arn
  backup_bucket_arn     = module.s3.backup_bucket_arn
  static_bucket_arn     = module.s3.static_bucket_arn
}

# Secretsモジュール
module "secrets" {
  source = "./modules/secrets"
  
  project_name = var.project_name
  environment  = var.environment
  
  secrets = {
    db_password           = random_password.db_password.result
    redis_auth_token      = random_password.redis_auth_token.result
    jwt_secret            = random_password.jwt_secret.result
    session_secret        = random_password.session_secret.result
  }
}

# ランダムパスワード生成
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "session_secret" {
  length  = 64
  special = true
}