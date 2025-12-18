.PHONY: build up down logs deploy-local push-aws-ecr deploy-aws-ec2 clean help

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

deploy-local:
	docker compose build
	docker compose up -d

push-aws-ecr:
	@AWS_PUBLIC_ECR=public.ecr.aws/s2e1n3u8 ; \
	AWS_REGION=$$(aws configure get region) ; \
	aws ecr-public get-login-password --region $$AWS_REGION | docker login --username AWS --password-stdin $$AWS_PUBLIC_ECR ; \
	aws ecr-public describe-repositories --region $$AWS_REGION --repository-names mdb-bfsi-credit-reco-genai-backend >/dev/null 2>&1 || \
	aws ecr-public create-repository --repository-name mdb-bfsi-credit-reco-genai-backend --region $$AWS_REGION ; \
	docker buildx build \
	--file ./backend_agentic/Dockerfile \
	--platform linux/amd64,linux/arm64 \
	--tag "$$AWS_PUBLIC_ECR/mdb-bfsi-credit-reco-genai-backend:latest" \
	--push . ; \
	aws ecr-public describe-repositories --region $$AWS_REGION --repository-names mdb-bfsi-credit-reco-genai-frontend >/dev/null 2>&1 || \
	aws ecr-public create-repository --repository-name mdb-bfsi-credit-reco-genai-frontend --region $$AWS_REGION ; \
	docker buildx build \
	--file ./frontend/Dockerfile \
	--platform linux/amd64,linux/arm64 \
	--tag "$$AWS_PUBLIC_ECR/mdb-bfsi-credit-reco-genai-frontend:latest" \
	--push .

deploy-aws-ec2:
	chmod +x one-click.ksh
	./one-click.ksh

clean:
	@echo "Cleaning up Docker containers and images..."
	docker compose down
	docker system prune -f
	docker volume prune -f
	docker network prune -f
	docker rmi -f $$(docker images -q)
	@echo "Cleanup complete."
	@echo "All Docker containers and images have been removed."

help:
	@echo "Makefile commands:"
	@echo "  build            - Build the Docker images"
	@echo "  up               - Start the Docker containers"
	@echo "  down             - Stop the Docker containers"
	@echo "  logs             - View the logs of the Docker containers"
	@echo "  deploy-local     - Build and start the Docker containers locally"
	@echo "  push-aws-ecr     - Push Docker images to AWS ECR"
	@echo "  deploy-aws-ec2   - Deploy the application on AWS EC2 instance"
	@echo "  help             - Show this help message"