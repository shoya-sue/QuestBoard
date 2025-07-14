output "static_bucket_name" {
  description = "Static assets bucket name"
  value       = aws_s3_bucket.static.bucket
}

output "static_bucket_arn" {
  description = "Static assets bucket ARN"
  value       = aws_s3_bucket.static.arn
}

output "backup_bucket_name" {
  description = "Backup bucket name"
  value       = aws_s3_bucket.backup.bucket
}

output "backup_bucket_arn" {
  description = "Backup bucket ARN"
  value       = aws_s3_bucket.backup.arn
}

output "terraform_state_bucket_name" {
  description = "Terraform state bucket name"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "cloudfront_oai_arn" {
  description = "CloudFront Origin Access Identity ARN"
  value       = aws_cloudfront_origin_access_identity.static.iam_arn
}

output "cloudfront_oai_id" {
  description = "CloudFront Origin Access Identity ID"
  value       = aws_cloudfront_origin_access_identity.static.id
}

output "kms_key_arn" {
  description = "KMS key ARN for S3 encryption"
  value       = aws_kms_key.s3.arn
}