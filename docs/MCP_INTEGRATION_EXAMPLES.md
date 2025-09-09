# MCP Testing Evaluation Framework - Integration Examples

**Practical integration examples for CI/CD pipelines, cloud platforms, and development workflows**

## Table of Contents

1. [CI/CD Pipeline Integration](#cicd-pipeline-integration)
2. [Container & Orchestration](#container--orchestration)
3. [Cloud Platform Integration](#cloud-platform-integration)
4. [Development Workflow Integration](#development-workflow-integration)
5. [Monitoring & Observability](#monitoring--observability)
6. [Custom Plugin Development](#custom-plugin-development)

## CI/CD Pipeline Integration

### GitHub Actions

#### Basic Evaluation Workflow

```yaml
name: MCP Server Evaluation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  evaluate-mcp-server:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          
      - name: Install dependencies
        run: |
          npm ci
          pip install -r requirements.txt
          
      - name: Install MCP Evaluator
        run: |
          git clone https://github.com/your-org/multi-agent-observability-system /tmp/evaluator
          cd /tmp/evaluator/apps/mcp-evaluator
          npm ci
          sudo ln -sf $(pwd)/bin/mcp-evaluate /usr/local/bin/mcp-evaluate
          
      - name: Install MCP Inspector
        run: npm install -g @modelcontextprotocol/inspector
        
      - name: Run MCP Evaluation
        id: evaluation
        run: |
          # Set minimum score for CI/CD pass
          MIN_SCORE=80
          
          # Run evaluation with JSON output
          RESULT=$(mcp-evaluate . --ci --json --fail-threshold $MIN_SCORE)
          
          # Extract key metrics
          SCORE=$(echo "$RESULT" | jq '.score')
          STATUS=$(echo "$RESULT" | jq -r '.status')
          
          # Set outputs for other steps
          echo "score=$SCORE" >> $GITHUB_OUTPUT
          echo "status=$STATUS" >> $GITHUB_OUTPUT
          echo "result<<EOF" >> $GITHUB_OUTPUT
          echo "$RESULT" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
          
      - name: Generate Evaluation Report
        if: always()
        run: |
          mcp-evaluate . --report evaluation-report.md --json > evaluation-results.json
          
      - name: Upload Evaluation Artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: mcp-evaluation-results
          path: |
            evaluation-report.md
            evaluation-results.json
            
      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const score = ${{ steps.evaluation.outputs.score }};
            const status = '${{ steps.evaluation.outputs.status }}';
            
            const statusEmoji = status === 'passed' ? '✅' : '❌';
            const scoreColor = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
            
            const comment = `
            ## ${statusEmoji} MCP Server Evaluation Results
            
            ${scoreColor} **Score: ${score}%**
            
            **Status:** ${status}
            
            ### Requirements Summary
            - Functionality Match: ${status === 'passed' ? '✅' : '❌'}
            - No Prompt Injections: ${status === 'passed' ? '✅' : '❌'}
            - Clear Tool Names: ${status === 'passed' ? '✅' : '❌'}
            - Working Examples: ${status === 'passed' ? '✅' : '❌'}
            - Error Handling: ${status === 'passed' ? '✅' : '❌'}
            
            📊 [View detailed report in artifacts](${context.payload.pull_request.html_url}/checks)
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

#### Advanced Multi-Environment Workflow

```yaml
name: Multi-Environment MCP Evaluation

on:
  workflow_dispatch:
    inputs:
      environments:
        description: 'Environments to test'
        required: true
        default: 'development,staging,production'
        
jobs:
  evaluate-matrix:
    strategy:
      matrix:
        environment: [development, staging, production]
        transport: [stdio, sse, http]
        include:
          - environment: development
            min_score: 70
          - environment: staging
            min_score: 80
          - environment: production
            min_score: 90
            
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Environment
        run: |
          echo "Setting up ${{ matrix.environment }} environment"
          # Load environment-specific configuration
          cp config/${{ matrix.environment }}.json mcp.json
          
      - name: Run Evaluation
        env:
          TRANSPORT_TYPE: ${{ matrix.transport }}
          MIN_SCORE: ${{ matrix.min_score }}
          ENV_NAME: ${{ matrix.environment }}
        run: |
          # Run evaluation with environment-specific settings
          mcp-evaluate . \
            --transport $TRANSPORT_TYPE \
            --fail-threshold $MIN_SCORE \
            --json \
            --report "evaluation-$ENV_NAME-$TRANSPORT_TYPE.md" \
            --tags "$ENV_NAME,$TRANSPORT_TYPE"
            
      - name: Upload Environment Results
        uses: actions/upload-artifact@v3
        with:
          name: evaluation-results-${{ matrix.environment }}-${{ matrix.transport }}
          path: evaluation-*.md
          
  aggregate-results:
    needs: evaluate-matrix
    runs-on: ubuntu-latest
    
    steps:
      - name: Download All Results
        uses: actions/download-artifact@v3
        
      - name: Aggregate Results
        run: |
          # Create comprehensive report
          echo "# MCP Server Multi-Environment Evaluation" > final-report.md
          echo "Generated on: $(date)" >> final-report.md
          echo "" >> final-report.md
          
          # Process each environment result
          for artifact in */evaluation-*.md; do
            echo "Processing $artifact"
            cat "$artifact" >> final-report.md
            echo "" >> final-report.md
          done
          
      - name: Upload Final Report
        uses: actions/upload-artifact@v3
        with:
          name: final-evaluation-report
          path: final-report.md
```

### GitLab CI

#### Complete Pipeline Configuration

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test
  - evaluate
  - report
  - deploy

variables:
  NODE_VERSION: "18"
  PYTHON_VERSION: "3.9"
  MCP_MIN_SCORE: "80"

.mcp_evaluator_setup: &mcp_evaluator_setup
  - git clone https://github.com/your-org/multi-agent-observability-system /tmp/evaluator
  - cd /tmp/evaluator/apps/mcp-evaluator
  - npm ci
  - chmod +x bin/mcp-evaluate
  - export PATH="$PATH:$(pwd)/bin"
  - npm install -g @modelcontextprotocol/inspector
  - cd $CI_PROJECT_DIR

validate_mcp_config:
  stage: validate
  image: node:18-alpine
  script:
    - *mcp_evaluator_setup
    - |
      # Validate MCP configuration exists
      if [ ! -f "mcp.json" ] && [ ! -f "claude_mcp.json" ] && [ ! -f ".mcp/config.json" ]; then
        echo "❌ No MCP configuration found"
        exit 1
      fi
    - echo "✅ MCP configuration validated"
  rules:
    - if: $CI_PIPELINE_SOURCE == "push" || $CI_PIPELINE_SOURCE == "merge_request_event"

test_mcp_server:
  stage: test
  image: node:18
  services:
    - name: python:3.9
  before_script:
    - apt-get update -qq && apt-get install -y python3-pip
    - pip3 install -r requirements.txt || true
    - npm ci
  script:
    - |
      # Start MCP server for testing
      timeout 30s npm start &
      SERVER_PID=$!
      sleep 5
      
      # Test basic server functionality
      if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "❌ MCP server failed to start"
        exit 1
      fi
      
      # Clean shutdown
      kill $SERVER_PID
      echo "✅ MCP server basic test passed"
  artifacts:
    when: always
    reports:
      junit: test-results.xml

evaluate_static:
  stage: evaluate
  image: node:18
  before_script:
    - apt-get update -qq && apt-get install -y python3-pip
    - pip3 install requests pyyaml tabulate
    - *mcp_evaluator_setup
  script:
    - |
      echo "Running static analysis evaluation..."
      mcp-evaluate . --static-only --json > static-results.json
      
      STATIC_SCORE=$(jq '.score' static-results.json)
      echo "Static Analysis Score: $STATIC_SCORE%"
      
      if (( $(echo "$STATIC_SCORE < 60" | bc -l) )); then
        echo "❌ Static analysis failed minimum threshold"
        exit 1
      fi
  artifacts:
    paths:
      - static-results.json
    expire_in: 1 week
  rules:
    - if: $CI_PIPELINE_SOURCE == "push"

evaluate_runtime:
  stage: evaluate
  image: node:18
  before_script:
    - apt-get update -qq && apt-get install -y python3-pip bc
    - pip3 install requests pyyaml tabulate
    - *mcp_evaluator_setup
  script:
    - |
      echo "Running runtime evaluation..."
      
      # Start server in background
      npm start &
      SERVER_PID=$!
      sleep 10
      
      # Run runtime tests
      mcp-evaluate . --runtime-only --json > runtime-results.json
      
      # Stop server
      kill $SERVER_PID || true
      
      RUNTIME_SCORE=$(jq '.score' runtime-results.json)
      echo "Runtime Score: $RUNTIME_SCORE%"
      
      if (( $(echo "$RUNTIME_SCORE < $MCP_MIN_SCORE" | bc -l) )); then
        echo "❌ Runtime evaluation failed threshold: $MCP_MIN_SCORE%"
        exit 1
      fi
  artifacts:
    paths:
      - runtime-results.json
    expire_in: 1 week

full_evaluation:
  stage: evaluate
  image: node:18
  dependencies:
    - evaluate_static
    - evaluate_runtime
  before_script:
    - apt-get update -qq && apt-get install -y python3-pip bc
    - pip3 install requests pyyaml tabulate
    - *mcp_evaluator_setup
  script:
    - |
      echo "Running complete MCP evaluation..."
      
      # Full evaluation
      mcp-evaluate . \
        --ci \
        --fail-threshold $MCP_MIN_SCORE \
        --json \
        --report evaluation-report.md \
        > full-results.json
        
      FINAL_SCORE=$(jq '.score' full-results.json)
      echo "Final Score: $FINAL_SCORE%"
      
      # Set variables for downstream jobs
      echo "EVALUATION_SCORE=$FINAL_SCORE" >> evaluation.env
      echo "EVALUATION_STATUS=completed" >> evaluation.env
  artifacts:
    paths:
      - evaluation-report.md
      - full-results.json
    reports:
      dotenv: evaluation.env
    expire_in: 30 days
  only:
    - main
    - develop

generate_badge:
  stage: report
  image: python:3.9-alpine
  dependencies:
    - full_evaluation
  script:
    - |
      pip install requests
      
      # Generate evaluation badge
      SCORE=${EVALUATION_SCORE%.*}  # Remove decimal
      
      if [ $SCORE -ge 90 ]; then
        COLOR="brightgreen"
        LABEL="excellent"
      elif [ $SCORE -ge 80 ]; then
        COLOR="green"
        LABEL="good"
      elif [ $SCORE -ge 60 ]; then
        COLOR="yellow"
        LABEL="needs work"
      else
        COLOR="red"
        LABEL="failing"
      fi
      
      # Create badge URL
      BADGE_URL="https://img.shields.io/badge/MCP%20Evaluation-${SCORE}%25%20(${LABEL})-${COLOR}"
      echo $BADGE_URL > badge-url.txt
      
      # Update project badge (if using GitLab Pages)
      echo "[![MCP Evaluation](${BADGE_URL})](${CI_PIPELINE_URL})" > evaluation-badge.md
  artifacts:
    paths:
      - badge-url.txt
      - evaluation-badge.md
    expire_in: 30 days
  only:
    - main
```

### Jenkins Pipeline

#### Declarative Pipeline

```groovy
pipeline {
    agent any
    
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['development', 'staging', 'production'], description: 'Target environment')
        string(name: 'MIN_SCORE', defaultValue: '80', description: 'Minimum evaluation score')
        booleanParam(name: 'SKIP_RUNTIME', defaultValue: false, description: 'Skip runtime testing')
    }
    
    environment {
        NODE_VERSION = '18'
        PYTHON_VERSION = '3.9'
        MCP_EVALUATOR_PATH = '/tmp/mcp-evaluator'
    }
    
    stages {
        stage('Preparation') {
            parallel {
                stage('Setup Node.js') {
                    steps {
                        nodejs(nodeJSInstallationName: 'Node 18') {
                            sh 'npm ci'
                        }
                    }
                }
                
                stage('Setup Python') {
                    steps {
                        sh '''
                            python3 -m venv venv
                            . venv/bin/activate
                            pip install -r requirements.txt || echo "No requirements.txt found"
                        '''
                    }
                }
                
                stage('Install MCP Evaluator') {
                    steps {
                        sh '''
                            if [ -d "$MCP_EVALUATOR_PATH" ]; then
                                rm -rf "$MCP_EVALUATOR_PATH"
                            fi
                            
                            git clone https://github.com/your-org/multi-agent-observability-system "$MCP_EVALUATOR_PATH"
                            cd "$MCP_EVALUATOR_PATH/apps/mcp-evaluator"
                            npm ci
                            chmod +x bin/mcp-evaluate
                            
                            # Install MCP Inspector
                            npm install -g @modelcontextprotocol/inspector
                        '''
                    }
                }
            }
        }
        
        stage('Validate Configuration') {
            steps {
                script {
                    def configExists = sh(
                        script: '''
                            if [ -f "mcp.json" ] || [ -f "claude_mcp.json" ] || [ -f ".mcp/config.json" ]; then
                                echo "true"
                            else
                                echo "false"
                            fi
                        ''',
                        returnStdout: true
                    ).trim()
                    
                    if (configExists != 'true') {
                        error('No MCP configuration file found')
                    }
                }
                
                echo "✅ MCP configuration validated"
            }
        }
        
        stage('MCP Server Tests') {
            parallel {
                stage('Static Analysis') {
                    steps {
                        sh '''
                            . venv/bin/activate
                            export PATH="$PATH:$MCP_EVALUATOR_PATH/apps/mcp-evaluator/bin"
                            
                            echo "Running static analysis..."
                            mcp-evaluate . --static-only --json > static-results.json
                            
                            SCORE=$(jq '.score' static-results.json)
                            echo "Static Analysis Score: $SCORE%"
                        '''
                        
                        archiveArtifacts artifacts: 'static-results.json'
                    }
                }
                
                stage('Runtime Testing') {
                    when {
                        not { params.SKIP_RUNTIME }
                    }
                    steps {
                        sh '''
                            . venv/bin/activate
                            export PATH="$PATH:$MCP_EVALUATOR_PATH/apps/mcp-evaluator/bin"
                            
                            # Start MCP server
                            echo "Starting MCP server..."
                            npm start &
                            SERVER_PID=$!
                            sleep 10
                            
                            # Run runtime evaluation
                            echo "Running runtime tests..."
                            mcp-evaluate . --runtime-only --json > runtime-results.json
                            
                            # Cleanup
                            kill $SERVER_PID || true
                            
                            SCORE=$(jq '.score' runtime-results.json)
                            echo "Runtime Score: $SCORE%"
                        '''
                        
                        archiveArtifacts artifacts: 'runtime-results.json'
                    }
                }
            }
        }
        
        stage('Full Evaluation') {
            steps {
                sh '''
                    . venv/bin/activate
                    export PATH="$PATH:$MCP_EVALUATOR_PATH/apps/mcp-evaluator/bin"
                    
                    echo "Running complete evaluation..."
                    
                    # Set environment-specific configuration
                    if [ -f "config/${ENVIRONMENT}.json" ]; then
                        cp "config/${ENVIRONMENT}.json" mcp.json
                        echo "Using ${ENVIRONMENT} configuration"
                    fi
                    
                    # Run full evaluation
                    mcp-evaluate . \
                        --ci \
                        --fail-threshold ${MIN_SCORE} \
                        --json \
                        --report "evaluation-${ENVIRONMENT}.md" \
                        > "evaluation-${ENVIRONMENT}.json"
                        
                    FINAL_SCORE=$(jq '.score' "evaluation-${ENVIRONMENT}.json")
                    echo "Final Score for ${ENVIRONMENT}: $FINAL_SCORE%"
                    
                    # Store for pipeline decision
                    echo $FINAL_SCORE > final-score.txt
                '''
                
                script {
                    def finalScore = sh(
                        script: 'cat final-score.txt',
                        returnStdout: true
                    ).trim() as Double
                    
                    env.FINAL_SCORE = finalScore.toString()
                    
                    if (finalScore < params.MIN_SCORE.toDouble()) {
                        error("Evaluation failed with score ${finalScore}%, minimum required: ${params.MIN_SCORE}%")
                    }
                }
                
                archiveArtifacts artifacts: "evaluation-${params.ENVIRONMENT}.*"
            }
        }
        
        stage('Generate Reports') {
            steps {
                sh '''
                    # Generate comprehensive report
                    cat > comprehensive-report.md << EOF
# MCP Server Evaluation Report

**Environment:** ${ENVIRONMENT}
**Score:** ${FINAL_SCORE}%
**Date:** $(date)
**Pipeline:** [${BUILD_URL}](${BUILD_URL})

## Results Summary

EOF
                    
                    if [ -f "evaluation-${ENVIRONMENT}.md" ]; then
                        cat "evaluation-${ENVIRONMENT}.md" >> comprehensive-report.md
                    fi
                '''
                
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: '.',
                    reportFiles: 'comprehensive-report.md',
                    reportName: 'MCP Evaluation Report'
                ])
            }
        }
        
        stage('Notification') {
            steps {
                script {
                    def scoreEmoji = env.FINAL_SCORE.toDouble() >= 90 ? '🟢' : 
                                    env.FINAL_SCORE.toDouble() >= 80 ? '🟡' : '🔴'
                    def statusEmoji = env.FINAL_SCORE.toDouble() >= params.MIN_SCORE.toDouble() ? '✅' : '❌'
                    
                    // Send Slack notification
                    slackSend(
                        channel: '#mcp-evaluations',
                        color: env.FINAL_SCORE.toDouble() >= params.MIN_SCORE.toDouble() ? 'good' : 'danger',
                        message: """
${statusEmoji} MCP Evaluation Complete

${scoreEmoji} **Score:** ${env.FINAL_SCORE}%
**Environment:** ${params.ENVIRONMENT}
**Branch:** ${env.BRANCH_NAME}
**Pipeline:** ${env.BUILD_URL}

${env.FINAL_SCORE.toDouble() >= params.MIN_SCORE.toDouble() ? 
    'Evaluation passed all requirements!' : 
    'Evaluation failed minimum threshold of ' + params.MIN_SCORE + '%'}
                        """
                    )
                }
            }
        }
    }
    
    post {
        always {
            // Cleanup
            sh '''
                # Stop any remaining processes
                pkill -f "npm start" || true
                pkill -f "node.*server" || true
                
                # Cleanup temporary files
                rm -f final-score.txt
            '''
            
            // Archive all evaluation artifacts
            archiveArtifacts artifacts: 'evaluation-*, comprehensive-report.md', allowEmptyArchive: true
        }
        
        failure {
            emailext(
                subject: "❌ MCP Evaluation Failed - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
MCP Server evaluation failed for ${params.ENVIRONMENT} environment.

Score: ${env.FINAL_SCORE ?: 'N/A'}%
Required: ${params.MIN_SCORE}%

View details: ${env.BUILD_URL}
                """,
                to: "${env.CHANGE_AUTHOR_EMAIL ?: 'team@company.com'}"
            )
        }
        
        success {
            script {
                if (env.BRANCH_NAME == 'main') {
                    // Trigger deployment pipeline for main branch
                    build job: 'deploy-mcp-server', 
                          parameters: [
                              string(name: 'ENVIRONMENT', value: params.ENVIRONMENT),
                              string(name: 'SCORE', value: env.FINAL_SCORE)
                          ], 
                          wait: false
                }
            }
        }
    }
}
```

## Container & Orchestration

### Docker Integration

#### Multi-Stage Dockerfile for MCP Evaluator

```dockerfile
# Multi-stage build for production-ready MCP Evaluator
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 py3-pip make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    bash \
    curl \
    jq \
    bc

# Create non-root user
RUN addgroup -g 1001 -S evaluator && \
    adduser -S evaluator -u 1001 -G evaluator

WORKDIR /app

# Copy application
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Install Python dependencies
RUN pip3 install --no-cache-dir requests pyyaml tabulate

# Install MCP Inspector globally
RUN npm install -g @modelcontextprotocol/inspector

# Set permissions
RUN chown -R evaluator:evaluator /app && \
    chmod +x bin/mcp-evaluate

USER evaluator

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD node healthcheck.js || exit 1

EXPOSE 3457

CMD ["node", "src/dashboard/server.js"]
```

#### Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-evaluator:
    build:
      context: .
      target: runtime
    ports:
      - "3457:3457"
    environment:
      - NODE_ENV=development
      - MCP_DEBUG=true
      - MCP_LOG_LEVEL=verbose
    volumes:
      - ./src:/app/src
      - ./config:/app/config
      - evaluation-cache:/app/cache
      - /var/run/docker.sock:/var/run/docker.sock  # For testing containerized MCP servers
    depends_on:
      - redis
      - observability
    networks:
      - mcp-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - mcp-network

  observability:
    image: multi-agent-observability:latest
    ports:
      - "3456:3456"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    networks:
      - mcp-network

  # Test MCP server for evaluation
  test-mcp-server:
    build:
      context: ./examples/test-server
    ports:
      - "5555:5555"
    environment:
      - MCP_TRANSPORT=http
      - MCP_PORT=5555
    networks:
      - mcp-network

volumes:
  redis-data:
  evaluation-cache:

networks:
  mcp-network:
    driver: bridge
```

#### Evaluation Runner Container

```dockerfile
# Dockerfile.evaluator-runner
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    bash \
    jq

# Install MCP Evaluator
RUN git clone https://github.com/your-org/multi-agent-observability-system /opt/evaluator && \
    cd /opt/evaluator/apps/mcp-evaluator && \
    npm ci && \
    chmod +x bin/mcp-evaluate && \
    ln -sf /opt/evaluator/apps/mcp-evaluator/bin/mcp-evaluate /usr/local/bin/

# Install Python dependencies
RUN pip3 install requests pyyaml tabulate

# Install MCP Inspector
RUN npm install -g @modelcontextprotocol/inspector

# Create evaluation workspace
WORKDIR /workspace

# Entry point script
COPY evaluate-container.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/evaluate-container.sh

ENTRYPOINT ["/usr/local/bin/evaluate-container.sh"]
```

```bash
#!/bin/bash
# evaluate-container.sh

set -e

# Default values
SERVER_PATH=${SERVER_PATH:-"/workspace"}
TRANSPORT=${TRANSPORT:-"stdio"}
MIN_SCORE=${MIN_SCORE:-"80"}
OUTPUT_FORMAT=${OUTPUT_FORMAT:-"json"}
REPORT_FILE=${REPORT_FILE:-"evaluation-report.md"}

echo "🔍 Starting MCP Server Evaluation"
echo "Server Path: $SERVER_PATH"
echo "Transport: $TRANSPORT"
echo "Minimum Score: $MIN_SCORE"

# Change to server directory
cd "$SERVER_PATH"

# Validate MCP configuration
if [ ! -f "mcp.json" ] && [ ! -f "claude_mcp.json" ] && [ ! -f ".mcp/config.json" ]; then
    echo "❌ No MCP configuration found"
    exit 1
fi

# Run evaluation
echo "📊 Running evaluation..."
if mcp-evaluate . \
    --transport "$TRANSPORT" \
    --ci \
    --fail-threshold "$MIN_SCORE" \
    --"$OUTPUT_FORMAT" \
    --report "$REPORT_FILE"; then
    echo "✅ Evaluation completed successfully"
    exit 0
else
    echo "❌ Evaluation failed"
    exit 1
fi
```

### Kubernetes Deployment

#### Complete Kubernetes Manifests

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-evaluation
  labels:
    app.kubernetes.io/name: mcp-evaluator
    app.kubernetes.io/component: namespace
---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-evaluator-config
  namespace: mcp-evaluation
data:
  config.json: |
    {
      "inspector": {
        "transport": "stdio",
        "timeout": 60000,
        "retries": 3
      },
      "scoring": {
        "weights": {
          "static": 0.4,
          "runtime": 0.6
        },
        "thresholds": {
          "pass": 0.8,
          "warning": 0.6
        }
      },
      "observability": {
        "enabled": true,
        "url": "http://observability-service:3456"
      }
    }
  
  hooks-config.json: |
    {
      "thresholds": {
        "min_examples": 3,
        "max_generic_names": 0,
        "require_error_logging": true
      },
      "file_extensions": [".py", ".js", ".ts"],
      "exclude_paths": ["node_modules", "venv", "dist"]
    }
---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-evaluator-secrets
  namespace: mcp-evaluation
type: Opaque
data:
  api-key: <base64-encoded-api-key>
  observability-token: <base64-encoded-token>
---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-evaluator
  namespace: mcp-evaluation
  labels:
    app.kubernetes.io/name: mcp-evaluator
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: evaluator
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: mcp-evaluator
      app.kubernetes.io/component: evaluator
  template:
    metadata:
      labels:
        app.kubernetes.io/name: mcp-evaluator
        app.kubernetes.io/component: evaluator
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3457"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: mcp-evaluator
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      containers:
      - name: evaluator
        image: mcp-evaluator:1.0.0
        ports:
        - name: http
          containerPort: 3457
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: MCP_API_KEY
          valueFrom:
            secretKeyRef:
              name: mcp-evaluator-secrets
              key: api-key
        - name: OBSERVABILITY_TOKEN
          valueFrom:
            secretKeyRef:
              name: mcp-evaluator-secrets
              key: observability-token
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        - name: cache
          mountPath: /app/cache
        - name: temp
          mountPath: /tmp
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
            ephemeral-storage: "1Gi"
          limits:
            memory: "1Gi"
            cpu: "1000m"
            ephemeral-storage: "2Gi"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/v1/ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /api/v1/health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
      volumes:
      - name: config
        configMap:
          name: mcp-evaluator-config
      - name: cache
        emptyDir: {}
      - name: temp
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                  - mcp-evaluator
              topologyKey: kubernetes.io/hostname
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-evaluator-service
  namespace: mcp-evaluation
  labels:
    app.kubernetes.io/name: mcp-evaluator
    app.kubernetes.io/component: service
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  - port: 9090
    targetPort: metrics
    protocol: TCP
    name: metrics
  selector:
    app.kubernetes.io/name: mcp-evaluator
    app.kubernetes.io/component: evaluator
---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-evaluator-hpa
  namespace: mcp-evaluation
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-evaluator
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
```

#### Job-based Evaluation

```yaml
# evaluation-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mcp-evaluation-${MCP_SERVER_NAME}-${BUILD_ID}
  namespace: mcp-evaluation
  labels:
    app.kubernetes.io/name: mcp-evaluation-job
    mcp-server: ${MCP_SERVER_NAME}
    build-id: ${BUILD_ID}
spec:
  ttlSecondsAfterFinished: 86400  # Clean up after 24 hours
  backoffLimit: 2
  template:
    metadata:
      labels:
        app.kubernetes.io/name: mcp-evaluation-job
        mcp-server: ${MCP_SERVER_NAME}
    spec:
      restartPolicy: Never
      serviceAccountName: mcp-evaluator
      initContainers:
      - name: git-clone
        image: alpine/git:latest
        command:
        - sh
        - -c
        - |
          git clone ${MCP_SERVER_REPO} /workspace/${MCP_SERVER_NAME}
          cd /workspace/${MCP_SERVER_NAME}
          git checkout ${MCP_SERVER_COMMIT}
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      containers:
      - name: evaluator
        image: mcp-evaluator-runner:latest
        env:
        - name: SERVER_PATH
          value: /workspace/${MCP_SERVER_NAME}
        - name: TRANSPORT
          value: ${TRANSPORT_TYPE}
        - name: MIN_SCORE
          value: ${MIN_SCORE}
        - name: OUTPUT_FORMAT
          value: "json"
        - name: CI_MODE
          value: "true"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: results
          mountPath: /results
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        command:
        - sh
        - -c
        - |
          cd $SERVER_PATH
          
          # Install dependencies if needed
          if [ -f "package.json" ]; then
            npm ci
          fi
          
          if [ -f "requirements.txt" ]; then
            pip3 install -r requirements.txt
          fi
          
          # Run evaluation
          mcp-evaluate . \
            --transport $TRANSPORT \
            --ci \
            --fail-threshold $MIN_SCORE \
            --json \
            --report /results/evaluation-report.md \
            > /results/evaluation-results.json
            
          # Copy results for artifact collection
          cp evaluation-*.* /results/ 2>/dev/null || true
      volumes:
      - name: workspace
        emptyDir: {}
      - name: results
        persistentVolumeClaim:
          claimName: evaluation-results-pvc
```

## Cloud Platform Integration

### AWS Integration

#### AWS CodePipeline

```json
{
  "pipeline": {
    "name": "MCP-Server-Evaluation-Pipeline",
    "version": 1,
    "roleArn": "arn:aws:iam::123456789012:role/CodePipelineRole",
    "artifactStore": {
      "type": "S3",
      "location": "mcp-pipeline-artifacts-bucket"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [
          {
            "name": "SourceAction",
            "actionTypeId": {
              "category": "Source",
              "owner": "AWS",
              "provider": "CodeCommit",
              "version": "1"
            },
            "configuration": {
              "RepositoryName": "mcp-server-repo",
              "BranchName": "main"
            },
            "outputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ]
          }
        ]
      },
      {
        "name": "Build",
        "actions": [
          {
            "name": "BuildAction",
            "actionTypeId": {
              "category": "Build",
              "owner": "AWS",
              "provider": "CodeBuild",
              "version": "1"
            },
            "configuration": {
              "ProjectName": "mcp-evaluation-project"
            },
            "inputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ],
            "outputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

#### AWS CodeBuild Project

```yaml
# buildspec.yml
version: 0.2

env:
  variables:
    MCP_MIN_SCORE: "80"
    NODE_VERSION: "18"
  parameter-store:
    MCP_API_KEY: "/mcp-evaluator/api-key"
    SLACK_WEBHOOK: "/notifications/slack-webhook"

phases:
  install:
    runtime-versions:
      nodejs: 18
      python: 3.9
    commands:
      - echo "Installing MCP Evaluator..."
      - git clone https://github.com/your-org/multi-agent-observability-system /tmp/evaluator
      - cd /tmp/evaluator/apps/mcp-evaluator
      - npm ci
      - chmod +x bin/mcp-evaluate
      - export PATH="$PATH:$(pwd)/bin"
      - npm install -g @modelcontextprotocol/inspector
      - pip install requests pyyaml tabulate
      
  pre_build:
    commands:
      - echo "Validating MCP configuration..."
      - cd $CODEBUILD_SRC_DIR
      - |
        if [ ! -f "mcp.json" ] && [ ! -f "claude_mcp.json" ] && [ ! -f ".mcp/config.json" ]; then
          echo "No MCP configuration found"
          exit 1
        fi
      - npm ci || echo "No package.json found"
      
  build:
    commands:
      - echo "Running MCP evaluation..."
      - |
        mcp-evaluate . \
          --ci \
          --fail-threshold $MCP_MIN_SCORE \
          --json \
          --report evaluation-report.md \
          > evaluation-results.json
        
        SCORE=$(jq '.score' evaluation-results.json)
        echo "Evaluation Score: $SCORE%"
        
        # Store for post-build notifications
        echo $SCORE > score.txt
        
  post_build:
    commands:
      - |
        SCORE=$(cat score.txt)
        
        if (( $(echo "$SCORE >= $MCP_MIN_SCORE" | bc -l) )); then
          echo "✅ Evaluation passed with score: $SCORE%"
          
          # Send success notification
          curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ MCP Evaluation Passed\\nScore: $SCORE%\\nBuild: $CODEBUILD_BUILD_URL\"}" \
            $SLACK_WEBHOOK
        else
          echo "❌ Evaluation failed with score: $SCORE%"
          
          # Send failure notification
          curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"❌ MCP Evaluation Failed\\nScore: $SCORE%\\nRequired: $MCP_MIN_SCORE%\\nBuild: $CODEBUILD_BUILD_URL\"}" \
            $SLACK_WEBHOOK
            
          exit 1
        fi

artifacts:
  files:
    - evaluation-report.md
    - evaluation-results.json
    - score.txt
  base-directory: '.'
  
reports:
  mcp-evaluation:
    files:
      - evaluation-results.json
    file-format: 'JunitXml'
    base-directory: '.'
```

#### Lambda-based Evaluation

```python
# lambda_function.py
import json
import boto3
import subprocess
import tempfile
import os
from urllib.parse import urlparse

def lambda_handler(event, context):
    """
    AWS Lambda function for MCP server evaluation
    
    Event structure:
    {
        "repository_url": "https://github.com/user/mcp-server",
        "commit_sha": "abc123",
        "transport": "stdio",
        "min_score": 80,
        "notification_topic": "arn:aws:sns:..."
    }
    """
    
    try:
        # Extract parameters
        repo_url = event['repository_url']
        commit_sha = event.get('commit_sha', 'main')
        transport = event.get('transport', 'stdio')
        min_score = event.get('min_score', 80)
        notification_topic = event.get('notification_topic')
        
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Clone repository
            repo_name = os.path.basename(urlparse(repo_url).path).replace('.git', '')
            clone_path = os.path.join(temp_dir, repo_name)
            
            subprocess.run([
                'git', 'clone', repo_url, clone_path
            ], check=True)
            
            # Checkout specific commit
            subprocess.run([
                'git', 'checkout', commit_sha
            ], cwd=clone_path, check=True)
            
            # Install dependencies
            if os.path.exists(os.path.join(clone_path, 'package.json')):
                subprocess.run(['npm', 'ci'], cwd=clone_path, check=True)
                
            # Run evaluation
            result = subprocess.run([
                'mcp-evaluate', '.',
                '--transport', transport,
                '--ci',
                '--fail-threshold', str(min_score),
                '--json'
            ], cwd=clone_path, capture_output=True, text=True)
            
            evaluation_results = json.loads(result.stdout)
            
            # Store results in S3
            s3 = boto3.client('s3')
            bucket_name = os.environ['RESULTS_BUCKET']
            
            s3.put_object(
                Bucket=bucket_name,
                Key=f'evaluations/{repo_name}/{commit_sha}/results.json',
                Body=json.dumps(evaluation_results, indent=2)
            )
            
            # Send notification
            if notification_topic:
                sns = boto3.client('sns')
                
                score = evaluation_results['score']
                status = '✅ PASSED' if score >= min_score else '❌ FAILED'
                
                message = f"""
MCP Server Evaluation Complete

Repository: {repo_url}
Commit: {commit_sha}
Score: {score}%
Status: {status}

Results: https://s3.console.aws.amazon.com/s3/object/{bucket_name}?prefix=evaluations/{repo_name}/{commit_sha}/
                """
                
                sns.publish(
                    TopicArn=notification_topic,
                    Subject=f'MCP Evaluation {status} - {repo_name}',
                    Message=message
                )
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'score': evaluation_results['score'],
                    'status': 'passed' if evaluation_results['score'] >= min_score else 'failed',
                    'results_url': f's3://{bucket_name}/evaluations/{repo_name}/{commit_sha}/results.json'
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }
```

### Azure DevOps Integration

#### Azure Pipeline

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
    - main
    - develop
  paths:
    exclude:
    - README.md
    - docs/*

variables:
  - name: mcpMinScore
    value: 80
  - name: nodeVersion
    value: '18'
  - name: pythonVersion
    value: '3.9'

pool:
  vmImage: 'ubuntu-latest'

stages:
- stage: Validate
  displayName: 'Validate MCP Configuration'
  jobs:
  - job: ValidateConfig
    displayName: 'Validate Configuration'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(nodeVersion)
      displayName: 'Setup Node.js'
      
    - script: |
        if [ ! -f "mcp.json" ] && [ ! -f "claude_mcp.json" ] && [ ! -f ".mcp/config.json" ]; then
          echo "##vso[task.logissue type=error]No MCP configuration file found"
          exit 1
        fi
        echo "##vso[task.setvariable variable=configValid]true"
      displayName: 'Check MCP Configuration'

- stage: Evaluate
  displayName: 'MCP Server Evaluation'
  dependsOn: Validate
  jobs:
  - job: StaticAnalysis
    displayName: 'Static Analysis'
    steps:
    - task: UsePythonVersion@0
      inputs:
        versionSpec: $(pythonVersion)
      displayName: 'Setup Python'
      
    - script: |
        # Install MCP Evaluator
        git clone https://github.com/your-org/multi-agent-observability-system /tmp/evaluator
        cd /tmp/evaluator/apps/mcp-evaluator
        npm ci
        chmod +x bin/mcp-evaluate
        echo "##vso[task.prependpath]$(pwd)/bin"
        
        # Install dependencies
        pip install requests pyyaml tabulate
      displayName: 'Setup MCP Evaluator'
      
    - script: |
        mcp-evaluate . --static-only --json > static-results.json
        
        SCORE=$(jq '.score' static-results.json)
        echo "Static Analysis Score: $SCORE%"
        echo "##vso[task.setvariable variable=staticScore]$SCORE"
      displayName: 'Run Static Analysis'
      
    - task: PublishTestResults@2
      condition: always()
      inputs:
        testResultsFormat: 'JUnit'
        testResultsFiles: 'static-results.json'
        testRunTitle: 'Static Analysis Results'

  - job: RuntimeTesting
    displayName: 'Runtime Testing'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(nodeVersion)
    - task: UsePythonVersion@0
      inputs:
        versionSpec: $(pythonVersion)
        
    - script: |
        # Setup MCP Evaluator
        git clone https://github.com/your-org/multi-agent-observability-system /tmp/evaluator
        cd /tmp/evaluator/apps/mcp-evaluator
        npm ci
        chmod +x bin/mcp-evaluate
        echo "##vso[task.prependpath]$(pwd)/bin"
        
        # Install dependencies
        pip install requests pyyaml tabulate
        npm install -g @modelcontextprotocol/inspector
        
        # Install project dependencies
        cd $(System.DefaultWorkingDirectory)
        npm ci || echo "No package.json found"
      displayName: 'Setup Environment'
      
    - script: |
        # Start MCP server
        npm start &
        SERVER_PID=$!
        sleep 10
        
        # Run runtime evaluation
        mcp-evaluate . --runtime-only --json > runtime-results.json
        
        # Stop server
        kill $SERVER_PID || true
        
        SCORE=$(jq '.score' runtime-results.json)
        echo "Runtime Score: $SCORE%"
        echo "##vso[task.setvariable variable=runtimeScore]$SCORE"
      displayName: 'Run Runtime Tests'

  - job: FullEvaluation
    displayName: 'Complete Evaluation'
    dependsOn: 
    - StaticAnalysis
    - RuntimeTesting
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(nodeVersion)
    - task: UsePythonVersion@0
      inputs:
        versionSpec: $(pythonVersion)
        
    - script: |
        # Setup MCP Evaluator
        git clone https://github.com/your-org/multi-agent-observability-system /tmp/evaluator
        cd /tmp/evaluator/apps/mcp-evaluator
        npm ci
        chmod +x bin/mcp-evaluate
        echo "##vso[task.prependpath]$(pwd)/bin"
        
        # Install dependencies
        pip install requests pyyaml tabulate
        npm install -g @modelcontextprotocol/inspector
        
        # Install project dependencies
        cd $(System.DefaultWorkingDirectory)
        npm ci || echo "No package.json found"
      displayName: 'Setup Environment'
      
    - script: |
        mcp-evaluate . \
          --ci \
          --fail-threshold $(mcpMinScore) \
          --json \
          --report evaluation-report.md \
          > evaluation-results.json
          
        FINAL_SCORE=$(jq '.score' evaluation-results.json)
        echo "Final Score: $FINAL_SCORE%"
        
        echo "##vso[task.setvariable variable=finalScore;isOutput=true]$FINAL_SCORE"
        
        if (( $(echo "$FINAL_SCORE < $(mcpMinScore)" | bc -l) )); then
          echo "##vso[task.logissue type=error]Evaluation failed with score $FINAL_SCORE%, minimum required: $(mcpMinScore)%"
          exit 1
        fi
      name: evaluation
      displayName: 'Run Full Evaluation'
      
    - task: PublishPipelineArtifact@1
      condition: always()
      inputs:
        targetPath: 'evaluation-report.md'
        artifact: 'evaluation-report'
        
    - task: PublishPipelineArtifact@1
      condition: always()
      inputs:
        targetPath: 'evaluation-results.json'
        artifact: 'evaluation-results'

- stage: Notify
  displayName: 'Send Notifications'
  dependsOn: Evaluate
  variables:
    finalScore: $[ stageDependencies.Evaluate.FullEvaluation.outputs['evaluation.finalScore'] ]
  jobs:
  - job: SendNotification
    displayName: 'Send Teams Notification'
    steps:
    - script: |
        SCORE=$(finalScore)
        
        if (( $(echo "$SCORE >= $(mcpMinScore)" | bc -l) )); then
          STATUS="✅ PASSED"
          COLOR="good"
        else
          STATUS="❌ FAILED"
          COLOR="danger"
        fi
        
        # Send Teams notification
        curl -H "Content-Type: application/json" -d '{
          "@type": "MessageCard",
          "@context": "https://schema.org/extensions",
          "summary": "MCP Evaluation Complete",
          "themeColor": "'$COLOR'",
          "sections": [{
            "activityTitle": "MCP Server Evaluation",
            "activitySubtitle": "'$STATUS'",
            "facts": [
              {"name": "Repository", "value": "'$(Build.Repository.Name)'"},
              {"name": "Branch", "value": "'$(Build.SourceBranchName)'"},
              {"name": "Score", "value": "'$SCORE'%"},
              {"name": "Required", "value": "'$(mcpMinScore)'%"},
              {"name": "Build", "value": "'$(Build.BuildNumber)'"}
            ],
            "markdown": true
          }],
          "potentialAction": [{
            "@type": "OpenUri",
            "name": "View Build",
            "targets": [{"os": "default", "uri": "'$(System.TeamFoundationCollectionUri)'/'$(System.TeamProject)'/_build/results?buildId='$(Build.BuildId)'"}]
          }]
        }' $(TEAMS_WEBHOOK_URL)
      displayName: 'Send Teams Notification'
      condition: always()
```

This comprehensive integration examples documentation provides practical, production-ready templates for implementing MCP Testing Evaluation Framework across various CI/CD platforms, containerization solutions, and cloud environments. Each example includes error handling, proper resource management, and notification systems for complete integration workflows.