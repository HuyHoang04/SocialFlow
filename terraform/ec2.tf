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

  user_data = <<EOF
#!/bin/sh
# CRLF fix: wrap the entire script in a heredoc and execute with bash
exec /bin/bash <<'BASH_SCRIPT'

set -x
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "--- Starting Initialization ---"

# Wait for apt lock
until apt-get update -y; do
    echo "Waiting for apt lock..."
    sleep 5
done

# Install basic packages
apt-get install -y curl ca-certificates unzip docker.io

# Setup Docker
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu

# Install AWS CLI v2
echo "Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws

# Install K3s
echo "Installing K3s..."
export K3S_KUBECONFIG_MODE="644"
curl -sfL https://get.k3s.io | sh -s - --disable traefik --disable servicelb

# Configure kubectl for ubuntu user
mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
chown -R ubuntu:ubuntu /home/ubuntu/.kube

# Install Cert Manager
echo "Installing Cert Manager..."
/usr/local/bin/k3s kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml

echo "--- Initialization Complete ---"
BASH_SCRIPT
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
