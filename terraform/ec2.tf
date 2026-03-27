data "aws_ami" "ubuntu" {
	most_recent = true
	owners      = ["099720109477"]

	filter {
		name   = "name"
		values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
	}

	filter {
		name   = "virtualization-type"
		values = ["hvm"]
	}
}

resource "aws_instance" "main" {
	ami                         = data.aws_ami.ubuntu.id
	instance_type               = var.ec2_instance_type
	subnet_id                   = aws_subnet.public_a.id
	vpc_security_group_ids      = [aws_security_group.ec2.id]
	key_name                    = var.ec2_key_name
	associate_public_ip_address = true

	user_data = <<-EOF
		#!/bin/bash
		set -eux

		apt-get update -y
		apt-get install -y curl ca-certificates

		# Install K3s (lightweight Kubernetes)
		curl -sfL https://get.k3s.io | sh -

		# Make kubectl available for ubuntu user
		mkdir -p /home/ubuntu/.kube
		cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
		chown -R ubuntu:ubuntu /home/ubuntu/.kube
	EOF

	root_block_device {
		volume_size = 20
		volume_type = "gp3"
		encrypted   = true
	}

	tags = {
		Name = "socialflow-ec2"
	}
}
