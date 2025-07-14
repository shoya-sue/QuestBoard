resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-redis-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-${var.environment}-redis-"
  vpc_id      = var.vpc_id
  description = "Security group for ElastiCache Redis"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "Redis from EKS nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }
}

resource "aws_elasticache_parameter_group" "redis" {
  name   = "${var.project_name}-${var.environment}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-params"
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  description                = "Redis cluster for ${var.project_name} ${var.environment}"
  node_type                  = var.node_type
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  
  engine_version             = "7.0"
  num_cache_clusters         = var.num_cache_nodes
  automatic_failover_enabled = var.num_cache_nodes > 1
  multi_az_enabled          = var.num_cache_nodes > 1
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth_token.result
  
  snapshot_retention_limit   = 5
  snapshot_window           = "03:00-05:00"
  maintenance_window        = "sun:05:00-sun:06:00"
  
  notification_topic_arn    = var.alarm_sns_topic_arn != "" ? var.alarm_sns_topic_arn : null
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/redis/slow-log"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }
}

resource "aws_ssm_parameter" "redis_endpoint" {
  name  = "/${var.project_name}/${var.environment}/redis/endpoint"
  type  = "String"
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}

resource "aws_ssm_parameter" "redis_auth_token" {
  name  = "/${var.project_name}/${var.environment}/redis/auth_token"
  type  = "SecureString"
  value = random_password.redis_auth_token.result
}