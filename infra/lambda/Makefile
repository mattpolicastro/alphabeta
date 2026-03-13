# Lambda build and deploy helpers (Path B only)
# See requirements.md Section 10.3.

.PHONY: build deploy local

build:
	cd analysis && sam build

deploy: build
	sam deploy --guided

local:
	sam local start-lambda

# Docker-based build for Lambda container image deployment
docker-build:
	# TODO: create Dockerfile for Lambda container image
	# docker build -t ab-tool-analysis .

docker-push: docker-build
	# TODO: push to ECR
	# docker tag ab-tool-analysis:latest $(ECR_REPO):latest
	# docker push $(ECR_REPO):latest
