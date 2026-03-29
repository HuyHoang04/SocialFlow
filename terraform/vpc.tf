resource "aws_vpc" "main" {
    cidr_block = var.vpc_cidr
    enable_dns_hostnames = true
    enable_dns_support = true

    tags = {
        Name = "socialflow-vpc"
    }
}

# internet
resource "aws_internet_gateway" "main" {
    vpc_id = aws_vpc.main.id

    tags = {
        Name = "socialflow-igw"
    }
}

# subnet A
resource "aws_subnet" "public_a" {
    vpc_id = aws_vpc.main.id
    cidr_block = var.subnet_cidr
    availability_zone = data.aws_availability_zones.available.names[0]
    map_public_ip_on_launch = true
    tags = {
        Name = "socialflow-public-subnet-a"
    }
}

# subnet B
resource "aws_subnet" "public_b" {
    vpc_id = aws_vpc.main.id
    cidr_block = var.subnet_cidr_b
    availability_zone = data.aws_availability_zones.available.names[1]
    map_public_ip_on_launch = true
    tags = {
        Name = "socialflow-public-subnet-b"
    }
}

# Get availability_zone
data "aws_availability_zones" "available" {
    state = "available"
}

data "http" "my_ip" {
    url = "https://checkip.amazonaws.com"
}

locals {
    my_ip = "${trimspace(data.http.my_ip.response_body)}/32"
}

# Route table
resource "aws_route_table" "public" {
    vpc_id = aws_vpc.main.id
    route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.main.id
    }
    tags = {
        Name = "socialflow-public-rt"
    }
}

# Route Association
resource "aws_route_table_association" "public_a" {
    subnet_id = aws_subnet.public_a.id
    route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
    subnet_id = aws_subnet.public_b.id
    route_table_id = aws_route_table.public.id
}

# Security group
resource "aws_security_group" "rds" {
    name = "socialflow-rds-sg"
    description = "Security group for RDS"
    vpc_id = aws_vpc.main.id

    ingress {
        from_port = 5432
        to_port = 5432
        protocol = "tcp"
        security_groups = [aws_security_group.ec2.id]
    }

    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
    
    tags = {
        Name = "socialflow-rds-sg"
    }
}

# EC2 security group
resource "aws_security_group" "ec2" {
    name = "socialflow-ec2-sg"
    description = "Security group for ec2"
    vpc_id = aws_vpc.main.id

    # SSH
    ingress {
        from_port = 22
        to_port = 22
        protocol = "tcp"
        cidr_blocks = var.allowed_ssh_cidr
    }

    # HTTP
    ingress {
        from_port = 80
        to_port = 80 
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    # HTTPS
    ingress {
        from_port   = 443
        to_port     = 443
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    # K3s NodePort (30000-32767)
    ingress {
        from_port   = 30000
        to_port     = 30000
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }
      # Outbound
    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    tags = {
        Name = "socialflow-ec2-sg"
    }
}