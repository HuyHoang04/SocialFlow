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
		set -eux

		apt-get update -y
		apt-get install -y curl ca-certificates

		apt-get install -y docker.io
		systemctl start docker
		systemctl enable docker
		usermod -aG docker ubuntu

		# Install AWS CLI v2
		apt-get install -y unzip
		curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
		unzip awscliv2.zip
		./aws/install
		rm -rf awscliv2.zip aws

		# Install K3s in background
		# Run as nohup to detach from SSH session
		nohup sh -c '
			export K3S_KUBECONFIG_MODE="644"
			export INSTALL_K3S_SKIP_ENABLE="true"
			curl -sfL https://get.k3s.io | sh -
			# Enable K3s service
			systemctl start k3s
		' > /var/log/k3s-install.log 2>&1 &

		# Make kubectl available for ubuntu user (will work once K3s comes up)
		mkdir -p /home/ubuntu/.kube
		cat > /etc/systemd/system/k3s-copy-config.service <<SYSTEMD
		[Unit]
		Description=Copy K3s config to ubuntu user
		After=k3s.service
		Requires=k3s.service

		[Service]
		Type=oneshot
		ExecStart=/bin/bash -c 'sleep 5 && cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config 2>/dev/null || true && chown -R ubuntu:ubuntu /home/ubuntu/.kube 2>/dev/null || true'
		RemainAfterExit=true

		[Install]
		WantedBy=multi-user.target
		SYSTEMD

		systemctl daemon-reload
		systemctl enable k3s-copy-config.service
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
