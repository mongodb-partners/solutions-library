# Makefile for backend_agentic project

.PHONY: help install lint test clean docker-build docker-run

help:
	@echo "Available targets:"
	@echo "  install      Install dependencies"
	@echo "  lint         Run linter"
	@echo "  test         Run tests"
	@echo "  clean        Remove temporary files"
	@echo "  docker-build Build Docker image"
	@echo "  docker-run   Run Docker container"

install:
	pip install -r requirements.txt

lint:
	flake8 .

test:
	pytest

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	rm -rf .pytest_cache

docker-build:
	docker build -t maap-fireworks-qs .

docker-run:
	docker run --rm -it --env-file .env -p 5001:5001 maap-fireworks-qs