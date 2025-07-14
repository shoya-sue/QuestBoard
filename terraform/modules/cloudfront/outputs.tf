output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.main.arn
}

output "domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "waf_acl_arn" {
  description = "WAF v2 WebACL ARN"
  value       = aws_wafv2_web_acl.main.arn
}

output "logs_bucket_name" {
  description = "CloudFront logs bucket name"
  value       = aws_s3_bucket.logs.bucket
}