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