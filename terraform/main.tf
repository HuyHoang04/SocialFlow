terraform {
    required_version = ">=1.0"
    required_providers {
        aws = {
            source = "hashicorp/aws"
            version = "~> 5.0"
        }
        http = {
            source = "hashicorp/http"
            version = "~> 3.0"
        }
    }
}

provider "aws" {
    region = "us-east-1"
    default_tags {
        tags = {
            Environment = "production"
            Project     = "socialflow"
            ManagedBy   = "Terraform"
        }
    }
}
