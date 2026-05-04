resource "aws_iam_role" "ec2_role" {
  name = "socialflow-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "socialflow-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

resource "aws_iam_user" "ci_cd_user" {
  name = "socialflow-ci-cd-user"
}

resource "aws_iam_user_policy" "ci_cd_policy" {
  name = "socialflow-ci-cd-policy"
  user = aws_iam_user.ci_cd_user.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_access_key" "ci_cd_key" {
  user   = aws_iam_user.ci_cd_user.name
  status = "Active"
}
