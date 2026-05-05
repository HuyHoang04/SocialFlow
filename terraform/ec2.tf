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
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  user_data = <<-EOF
		#!/bin/bash
		set -ex

		# Ham doi cho den khi giai phong apt lock (Ubuntu 24.04 thuong tu dong update luc moi mo)
		wait_apt_lock() {
			while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 ; do
				echo "Waiting for other software managers to finish..."
				sleep 5
			done
		}

		echo "Starting initialization script..."
		wait_apt_lock
		apt-get update -y
		wait_apt_lock
		apt-get install -y curl ca-certificates unzip docker.io

		# Config Docker
		systemctl start docker
		systemctl enable docker
		usermod -aG docker ubuntu

		# Install AWS CLI v2
		echo "Installing AWS CLI v2..."
		curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
		unzip awscliv2.zip
		./aws/install
		rm -rf awscliv2.zip aws

		# Install K3s (Chay truc tiep de dam bao xong xuoi moi ket thuc script)
		echo "Installing K3s..."
		export K3S_KUBECONFIG_MODE="644"
		curl -sfL https://get.k3s.io | sh -s - --disable traefik --disable servicelb

		# Doi K3s khoi dong va tao file config
		timeout 60s bash -c 'until [ -f /etc/rancher/k3s/k3s.yaml ]; do sleep 2; done'

		# Copy config cho user ubuntu de co the dung kubectl ma khong can sudo
		mkdir -p /home/ubuntu/.kube
		cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
		chown -R ubuntu:ubuntu /home/ubuntu/.kube

		# Cai dat Cert Manager (Can thiet cho ClusterIssuer va SSL)
		echo "Installing Cert Manager..."
		/usr/local/bin/k3s kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml
		
		echo "Setup complete!"
	EOF

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "socialflow-ec2"
  }
}
