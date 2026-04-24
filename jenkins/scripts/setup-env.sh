#!/bin/bash

# setup-env.sh
# Sets up the environment for test execution
# Installs Node.js, Docker CLI, and other dependencies

set -e

echo "=== Environment Setup Started ==="

# Check if running in Jenkins
if [ -z "$JENKINS_HOME" ]; then
    echo "Warning: Not running in Jenkins environment"
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    echo "✓ Node.js installed: $(node --version)"
else
    echo "✓ Node.js already installed: $(node --version)"
fi

# Install npm if not present
if ! command -v npm &> /dev/null; then
    echo "Installing npm..."
    apt-get install -y npm
    echo "✓ npm installed: $(npm --version)"
else
    echo "✓ npm already installed: $(npm --version)"
fi

# Install Docker CLI if not present (for Docker-in-Docker scenarios)
if ! command -v docker &> /dev/null; then
    echo "Installing Docker CLI..."
    
    apt-get update
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce-cli
    
    echo "✓ Docker CLI installed: $(docker --version)"
else
    echo "✓ Docker CLI already installed: $(docker --version)"
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    apt-get install -y git
    echo "✓ git installed: $(git --version)"
else
    echo "✓ git already installed: $(git --version)"
fi

# Create necessary directories
echo "Creating required directories..."
mkdir -p reports
mkdir -p playwright-tests/generated
mkdir -p playwright-tests/test-results

echo "✓ Directories created"

# Set permissions
echo "Setting permissions..."
chmod -R 755 jenkins/scripts
chmod +x jenkins/scripts/*.sh 2>/dev/null || true
chmod +x jenkins/scripts/*.js 2>/dev/null || true

echo "✓ Permissions set"

# Verify environment
echo ""
echo "=== Environment Verification ==="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "git: $(git --version)"
echo "Docker: $(docker --version 2>/dev/null || echo 'Not available')"
echo "Working Directory: $(pwd)"
echo ""

echo "✓ Environment setup completed successfully"