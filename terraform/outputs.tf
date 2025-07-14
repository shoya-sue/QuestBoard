output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.elasticache.endpoint
  sensitive   = true
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = module.cloudfront.domain_name
}

output "s3_static_bucket" {
  description = "S3 static assets bucket name"
  value       = module.s3.static_bucket_name
}

output "s3_backup_bucket" {
  description = "S3 backup bucket name"
  value       = module.s3.backup_bucket_name
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value = {
    backend  = module.ecr.backend_repository_url
    frontend = module.ecr.frontend_repository_url
  }
}

output "secret_arns" {
  description = "AWS Secrets Manager secret ARNs"
  value       = module.secrets.secret_arns
  sensitive   = true
}

output "monitoring_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${module.monitoring.dashboard_name}"
}

output "kubectl_config_command" {
  description = "kubectl configuration command"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}