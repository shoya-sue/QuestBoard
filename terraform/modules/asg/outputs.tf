output "autoscaling_group_id" {
  description = "Auto Scaling Group ID"
  value       = aws_autoscaling_group.eks_workers.id
}

output "autoscaling_group_arn" {
  description = "Auto Scaling Group ARN"
  value       = aws_autoscaling_group.eks_workers.arn
}

output "autoscaling_group_name" {
  description = "Auto Scaling Group name"
  value       = aws_autoscaling_group.eks_workers.name
}

output "launch_template_id" {
  description = "Launch template ID"
  value       = aws_launch_template.eks_workers.id
}

output "launch_template_latest_version" {
  description = "Latest version of the launch template"
  value       = aws_launch_template.eks_workers.latest_version
}

output "security_group_id" {
  description = "Security group ID for worker nodes"
  value       = aws_security_group.eks_workers.id
}

output "scale_up_policy_arn" {
  description = "Scale up policy ARN"
  value       = aws_autoscaling_policy.scale_up.arn
}

output "scale_down_policy_arn" {
  description = "Scale down policy ARN"
  value       = aws_autoscaling_policy.scale_down.arn
}

output "sns_topic_arn" {
  description = "SNS topic ARN for Auto Scaling notifications"
  value       = aws_sns_topic.asg_notifications.arn
}