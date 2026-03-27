resource "aws_db_subnet_group" "main" {
  name       = "socialflow-db-subnet-group"
  subnet_ids = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id
  ]

  tags = {
    Name = "socialflow-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier             = "socialflow-db"
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = var.rds_instance_class
  allocated_storage      = var.rds_allocated_storage
  storage_type           = "gp2"

  db_name                = var.rds_db_name
  username               = var.rds_username
  password               = var.rds_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  multi_az               = false
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false

  backup_retention_period = 7

  tags = {
    Name = "socialflow-rds"
  }
}