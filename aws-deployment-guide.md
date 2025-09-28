# AWS Free Tier Deployment Guide

## Prerequisites
1. AWS Account (free to create)
2. AWS CLI installed
3. Docker installed locally

## Step 1: Prepare Your Application

### Update Dockerfile for Production
```dockerfile
# Use a multi-stage build to create a lean final image
FROM maven:3.9.5-eclipse-temurin-17 AS build
WORKDIR /app
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
COPY src ./src
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Environment Variables
Set these in AWS Systems Manager Parameter Store:
- `GEMINI_KEY`: Your Gemini API key

## Step 2: AWS Setup

### 1. Create EC2 Instance
```bash
# Launch EC2 instance (t2.micro - free tier)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t2.micro \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx
```

### 2. Security Group Configuration
- **Inbound Rules**:
  - HTTP (80) from anywhere (0.0.0.0/0)
  - HTTPS (443) from anywhere (0.0.0.0/0)
  - SSH (22) from your IP
  - Custom TCP (8080) from anywhere

### 3. Deploy with Docker
```bash
# On EC2 instance
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Build and run your app
git clone your-repo
cd research-assistant
sudo docker build -t research-assistant .
sudo docker run -d -p 8080:8080 --name research-app research-assistant
```

## Step 3: Domain & SSL (Optional but Professional)

### Using Route 53 + CloudFront
1. Register domain in Route 53
2. Create CloudFront distribution
3. Configure SSL certificate with ACM

## Step 4: Monitoring & Logging

### CloudWatch Setup
- Application logs
- Performance metrics
- Alerts for downtime

## Cost Optimization
- Use t2.micro (free tier)
- Enable auto-scaling
- Use S3 for static assets
- Implement health checks

## CI/CD Pipeline (Bonus Points)

### GitHub Actions
```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to EC2
        run: |
          # Your deployment script
```

## Skills Demonstrated
✅ AWS Services (EC2, S3, CloudFront, Route 53)
✅ Docker containerization
✅ Infrastructure as Code
✅ CI/CD pipelines
✅ Monitoring and logging
✅ Security best practices
✅ Domain management
✅ SSL/TLS configuration