resource "aws_instance" "main" {
  ami                    = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_name
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.ec2.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = <<-EOF
              #!/bin/bash
              set -ex

              # 1. Setup 4GB Swap for stability
              if [ ! -f /swapfile ]; then
                fallocate -l 4G /swapfile
                chmod 600 /swapfile
                mkswap /swapfile
                swapon /swapfile
                echo '/swapfile none swap sw 0 0' >> /etc/fstab
              fi

              # 2. Install Docker and Docker Compose
              apt-get update
              apt-get install -y apt-transport-https ca-certificates curl software-properties-common unzip
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
              add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
              apt-get update
              apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

              # 3. Setup permissions
              usermod -aG docker ubuntu

              # 4. Install AWS CLI v2
              curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
              unzip awscliv2.zip
              ./aws/install

              # 5. Prepare project directory
              mkdir -p /home/ubuntu/socialflow
              chown -R ubuntu:ubuntu /home/ubuntu/socialflow
              EOF

  tags = {
    Name = "socialflow-instance"
  }
}
