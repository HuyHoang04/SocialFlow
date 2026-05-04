output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.main.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.main.public_dns
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = try(aws_db_instance.main[0].endpoint, null)
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = try(aws_db_instance.main[0].port, null)
}

output "ssh_command" {
  description = "Example SSH command (replace key path if needed)"
  value       = "ssh -i <path-to-key.pem> ubuntu@${aws_instance.main.public_ip}"
}

output "backend_ecr_url" {
  description = "ECR URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_url" {
  description = "ECR URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ai_service_ecr_url" {
  description = "ECR URL for AI service"
  value       = aws_ecr_repository.ai_service.repository_url
}

output "ecr_registry_url" {
  description = "ECR registry URL"
  value       = split("/", aws_ecr_repository.backend.repository_url)[0]
}

output "ci_cd_access_key" {
  value = aws_iam_access_key.ci_cd_key.id
}

output "ci_cd_secret_key" {
  value     = aws_iam_access_key.ci_cd_key.secret
  sensitive = true
}
