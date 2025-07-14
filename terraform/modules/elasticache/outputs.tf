output "cluster_id" {
  description = "ElastiCache cluster ID"
  value       = aws_elasticache_replication_group.main.id
}

output "endpoint" {
  description = "ElastiCache primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  description = "ElastiCache port"
  value       = aws_elasticache_replication_group.main.port
}

output "security_group_id" {
  description = "ElastiCache security group ID"
  value       = aws_security_group.redis.id
}

output "auth_token_ssm_parameter" {
  description = "SSM parameter name for Redis auth token"
  value       = aws_ssm_parameter.redis_auth_token.name
}