#!/bin/bash

# setup-github-webhook.sh
# Automated GitHub webhook configuration script
# Configures webhook to trigger Jenkins pipeline on push to main

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Parse command line arguments
REPO=""
JENKINS_URL=""
GITHUB_TOKEN=""
WEBHOOK_SECRET=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo)
            REPO="$2"
            shift 2
            ;;
        --jenkins-url)
            JENKINS_URL="$2"
            shift 2
            ;;
        --github-token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        --webhook-secret)
            WEBHOOK_SECRET="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 --repo OWNER/REPO --jenkins-url URL --github-token TOKEN [--webhook-secret SECRET]"
            echo ""
            echo "Options:"
            echo "  --repo              GitHub repository (e.g., gobmj/Automator)"
            echo "  --jenkins-url       Jenkins server URL (e.g., http://your-server:8080)"
            echo "  --github-token      GitHub personal access token with repo:hook permissions"
            echo "  --webhook-secret    Optional webhook secret for security"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$REPO" ] || [ -z "$JENKINS_URL" ] || [ -z "$GITHUB_TOKEN" ]; then
    print_error "Missing required parameters"
    echo "Usage: $0 --repo OWNER/REPO --jenkins-url URL --github-token TOKEN"
    echo "Use --help for more information"
    exit 1
fi

# Generate webhook secret if not provided
if [ -z "$WEBHOOK_SECRET" ]; then
    WEBHOOK_SECRET=$(openssl rand -hex 20)
    print_info "Generated webhook secret: $WEBHOOK_SECRET"
    print_warning "Save this secret - you'll need it to configure Jenkins!"
fi

# Construct webhook URL
WEBHOOK_URL="${JENKINS_URL}/github-webhook/"

print_info "Setting up GitHub webhook..."
print_info "Repository: $REPO"
print_info "Jenkins URL: $JENKINS_URL"
print_info "Webhook URL: $WEBHOOK_URL"

# Create webhook configuration
WEBHOOK_CONFIG=$(cat <<EOF
{
  "name": "web",
  "active": true,
  "events": ["push"],
  "config": {
    "url": "${WEBHOOK_URL}",
    "content_type": "json",
    "secret": "${WEBHOOK_SECRET}",
    "insecure_ssl": "0"
  }
}
EOF
)

# Create webhook using GitHub API
print_info "Creating webhook via GitHub API..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO}/hooks" \
    -d "$WEBHOOK_CONFIG")

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
    print_info "✓ Webhook created successfully!"
    
    # Extract webhook ID
    WEBHOOK_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    print_info "Webhook ID: $WEBHOOK_ID"
    
    # Save webhook configuration
    CONFIG_FILE="jenkins/config/webhook-config.json"
    mkdir -p "$(dirname "$CONFIG_FILE")"
    
    cat > "$CONFIG_FILE" <<EOF
{
  "repository": "${REPO}",
  "webhookId": ${WEBHOOK_ID},
  "webhookUrl": "${WEBHOOK_URL}",
  "webhookSecret": "${WEBHOOK_SECRET}",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    print_info "✓ Configuration saved to: $CONFIG_FILE"
    
    echo ""
    print_info "=== Next Steps ==="
    echo "1. Configure Jenkins job to use GitHub webhook trigger"
    echo "2. Add webhook secret to Jenkins credentials:"
    echo "   - Go to Jenkins > Manage Jenkins > Credentials"
    echo "   - Add new 'Secret text' credential"
    echo "   - Secret: ${WEBHOOK_SECRET}"
    echo "   - ID: github-webhook-secret"
    echo "3. Test the webhook by pushing to main branch"
    echo ""
    
elif [ "$HTTP_CODE" -eq 422 ]; then
    print_warning "Webhook may already exist"
    print_info "Checking existing webhooks..."
    
    # List existing webhooks
    EXISTING=$(curl -s \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer ${GITHUB_TOKEN}" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/${REPO}/hooks")
    
    # Check if our webhook URL exists
    if echo "$EXISTING" | grep -q "$WEBHOOK_URL"; then
        print_info "✓ Webhook already configured for this Jenkins URL"
        
        # Extract webhook ID
        WEBHOOK_ID=$(echo "$EXISTING" | grep -B5 "$WEBHOOK_URL" | grep '"id"' | head -1 | grep -o '[0-9]*')
        print_info "Existing Webhook ID: $WEBHOOK_ID"
        
        # Update webhook
        print_info "Updating existing webhook..."
        UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            "https://api.github.com/repos/${REPO}/hooks/${WEBHOOK_ID}" \
            -d "$WEBHOOK_CONFIG")
        
        UPDATE_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
        
        if [ "$UPDATE_CODE" -eq 200 ]; then
            print_info "✓ Webhook updated successfully!"
        else
            print_error "Failed to update webhook (HTTP $UPDATE_CODE)"
        fi
    else
        print_error "Failed to create webhook (HTTP 422)"
        echo "Response: $RESPONSE_BODY"
        exit 1
    fi
    
else
    print_error "Failed to create webhook (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

print_info "✓ GitHub webhook setup completed"