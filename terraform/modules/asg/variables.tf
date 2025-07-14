variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the ASG will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the ASG"
  type        = list(string)
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "cluster_endpoint" {
  description = "EKS cluster endpoint"
  type        = string
}

variable "cluster_ca_data" {
  description = "EKS cluster certificate authority data"
  type        = string
}

variable "cluster_security_group_id" {
  description = "EKS cluster security group ID"
  type        = string
}

variable "alb_security_group_id" {
  description = "ALB security group ID"
  type        = string
}

variable "target_group_arns" {
  description = "List of target group ARNs for the ASG"
  type        = list(string)
  default     = []
}

variable "ami_id" {
  description = "AMI ID for worker nodes"
  type        = string
}

variable "instance_type" {
  description = "Instance type for worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "EC2 Key Pair name for SSH access"
  type        = string
  default     = ""
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 50
}

variable "min_size" {
  description = "Minimum number of instances in ASG"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of instances in ASG"
  type        = number
  default     = 10
}

variable "desired_capacity" {
  description = "Desired number of instances in ASG"
  type        = number
  default     = 3
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed SSH access"
  type        = list(string)
  default     = []
}

variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling for predictable load patterns"
  type        = bool
  default     = false
}

variable "business_hours_capacity" {
  description = "Desired capacity during business hours"
  type        = number
  default     = 5
}

variable "off_hours_capacity" {
  description = "Desired capacity during off hours"
  type        = number
  default     = 2
}

variable "timezone" {
  description = "Timezone for scheduled scaling"
  type        = string
  default     = "Asia/Tokyo"
}

variable "tags" {
  description = "Additional tags for ASG resources"
  type        = map(string)
  default     = {}
}