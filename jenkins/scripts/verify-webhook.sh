#!/bin/bash

# verify-webhook.sh
# Verifies GitHub webhook configuration and connectivity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Parse command line arguments
REPO=""
GITHUB_TOKEN=""
JENKINS_URL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo)
            REPO="$2"
            shift 2
            ;;
        --github-token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        --jenkins-url)
            JENKINS_URL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 --repo OWNER/REPO --github-token TOKEN --jenkins-url URL"
            echo ""
            echo "Options:"
            echo "  --repo              GitHub repository (e.g., gobmj/Automator)"
            echo "  --github-token      GitHub personal access token"
            echo "  --jenkins-url       Jenkins server URL"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate parameters
if [ -z "$REPO" ] || [ -z "$GITHUB_TOKEN" ]; then
    print_error "Missing required parameters"
    echo "Usage: $0 --repo OWNER/REPO --github-token TOKEN --jenkins-url URL"
    exit 1
fi

echo "=== GitHub Webhook Verification ==="
echo ""

# Step 1: Check GitHub API connectivity
print_step "1. Checking GitHub API connectivity..."
GITHUB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    "https://api.github.com/user")

if [ "$GITHUB_STATUS" -eq 200 ]; then
    print_info "✓ GitHub API is accessible"
else
    print_error "✗ Cannot connect to GitHub API (HTTP $GITHUB_STATUS)"
    exit 1
fi

# Step 2: Verify repository access
print_step "2. Verifying repository access..."
REPO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${REPO}")

if [ "$REPO_STATUS" -eq 200 ]; then
    print_info "✓ Repository is accessible"
else
    print_error "✗ Cannot access repository (HTTP $REPO_STATUS)"
    exit 1
fi

# Step 3: List existing webhooks
print_step "3. Checking existing webhooks..."
WEBHOOKS=$(curl -s \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO}/hooks")

WEBHOOK_COUNT=$(echo "$WEBHOOKS" | grep -c '"id"' || echo "0")
print_info "Found $WEBHOOK_COUNT webhook(s) configured"

if [ "$WEBHOOK_COUNT" -eq 0 ]; then
    print_warning "No webhooks configured for this repository"
    echo ""
    echo "To set up a webhook, run:"
    echo "./jenkins/scripts/setup-github-webhook.sh --repo $REPO --jenkins-url YOUR_JENKINS_URL --github-token YOUR_TOKEN"
    exit 0
fi

# Step 4: Check for Jenkins webhook
if [ -n "$JENKINS_URL" ]; then
    print_step "4. Checking for Jenkins webhook..."
    JENKINS_WEBHOOK_URL="${JENKINS_URL}/github-webhook/"
    
    if echo "$WEBHOOKS" | grep -q "$JENKINS_WEBHOOK_URL"; then
        print_info "✓ Jenkins webhook found"
        
        # Extract webhook details
        WEBHOOK_ID=$(echo "$WEBHOOKS" | grep -B5 "$JENKINS_WEBHOOK_URL" | grep '"id"' | head -1 | grep -o '[0-9]*')
        print_info "Webhook ID: $WEBHOOK_ID"
        
        # Get webhook details
        WEBHOOK_DETAILS=$(curl -s \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            "https://api.github.com/repos/${REPO}/hooks/${WEBHOOK_ID}")
        
        # Check webhook status
        ACTIVE=$(echo "$WEBHOOK_DETAILS" | grep '"active"' | grep -o 'true\|false')
        EVENTS=$(echo "$WEBHOOK_DETAILS" | grep '"events"' | head -1)
        
        if [ "$ACTIVE" = "true" ]; then
            print_info "✓ Webhook is active"
        else
            print_warning "⚠ Webhook is inactive"
        fi
        
        print_info "Events: $EVENTS"
        
        # Check recent deliveries
        print_step "5. Checking recent webhook deliveries..."
        DELIVERIES=$(curl -s \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            "https://api.github.com/repos/${REPO}/hooks/${WEBHOOK_ID}/deliveries")
        
        DELIVERY_COUNT=$(echo "$DELIVERIES" | grep -c '"id"' || echo "0")
        
        if [ "$DELIVERY_COUNT" -gt 0 ]; then
            print_info "Found $DELIVERY_COUNT recent delivery/deliveries"
            
            # Check last delivery status
            LAST_STATUS=$(echo "$DELIVERIES" | grep '"status_code"' | head -1 | grep -o '[0-9]*')
            
            if [ -n "$LAST_STATUS" ]; then
                if [ "$LAST_STATUS" -ge 200 ] && [ "$LAST_STATUS" -lt 300 ]; then
                    print_info "✓ Last delivery successful (HTTP $LAST_STATUS)"
                else
                    print_warning "⚠ Last delivery failed (HTTP $LAST_STATUS)"
                fi
            fi
        else
            print_info "No deliveries yet (webhook hasn't been triggered)"
        fi
        
    else
        print_warning "Jenkins webhook not found for URL: $JENKINS_WEBHOOK_URL"
        echo ""
        echo "Configured webhooks:"
        echo "$WEBHOOKS" | grep '"url"' | sed 's/.*"url": "\(.*\)".*/  - \1/'
    fi
fi

# Step 6: Test Jenkins connectivity (if URL provided)
if [ -n "$JENKINS_URL" ]; then
    print_step "6. Testing Jenkins connectivity..."
    
    JENKINS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${JENKINS_URL}" || echo "000")
    
    if [ "$JENKINS_STATUS" -eq 200 ] || [ "$JENKINS_STATUS" -eq 403 ]; then
        print_info "✓ Jenkins server is reachable"
    else
        print_warning "⚠ Cannot reach Jenkins server (HTTP $JENKINS_STATUS)"
        print_info "Make sure Jenkins is running and accessible from GitHub"
    fi
fi

echo ""
print_info "=== Verification Summary ==="
echo "Repository: $REPO"
echo "Webhooks configured: $WEBHOOK_COUNT"

if [ -n "$JENKINS_URL" ]; then
    echo "Jenkins URL: $JENKINS_URL"
fi

echo ""
print_info "✓ Verification completed"

# Provide recommendations
echo ""
echo "=== Recommendations ==="
echo "1. Test the webhook by pushing a commit to the main branch"
echo "2. Check Jenkins job console output for webhook triggers"
echo "3. Monitor webhook deliveries in GitHub repository settings"
echo "4. Ensure Jenkins has proper GitHub credentials configured"