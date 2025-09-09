#!/bin/bash

# Cross-Browser Testing Setup Script
# Sets up complete cross-browser testing environment for Educational Dashboard

set -e

echo "🚀 Setting up Cross-Browser Testing Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "\n${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "tests" ]; then
    print_error "Please run this script from the apps/client directory"
    exit 1
fi

print_step "1" "Checking dependencies and installing missing packages"

# Check if Playwright is installed
if ! npm list @playwright/test >/dev/null 2>&1; then
    print_warning "Playwright not found, installing..."
    npm install --save-dev @playwright/test
else
    print_success "Playwright is already installed"
fi

print_step "2" "Installing browser binaries"

# Install all browsers needed for cross-browser testing
echo "Installing Chromium..."
npx playwright install chromium

echo "Installing Firefox..."
npx playwright install firefox

echo "Installing WebKit (Safari)..."
npx playwright install webkit

echo "Installing system dependencies..."
npx playwright install-deps

print_success "All browser binaries installed"

print_step "3" "Validating test configuration"

# Check if playwright.config.ts exists and is valid
if [ -f "playwright.config.ts" ]; then
    if npx playwright test --list >/dev/null 2>&1; then
        print_success "Playwright configuration is valid"
    else
        print_error "Playwright configuration has issues"
        exit 1
    fi
else
    print_error "playwright.config.ts not found"
    exit 1
fi

print_step "4" "Running test validation"

# Check if tests directory structure is correct
required_dirs=("tests/e2e/core" "tests/e2e/performance" "tests/e2e/accessibility" "tests/e2e/visual" "tests/e2e/browser-specific")

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_success "Test directory: $dir"
    else
        print_error "Missing test directory: $dir"
        exit 1
    fi
done

print_step "5" "Verifying server can start"

# Check if dev server can start (quickly)
echo "Testing server startup..."
timeout 10s npm run dev >/dev/null 2>&1 &
SERVER_PID=$!

sleep 5

if kill -0 $SERVER_PID 2>/dev/null; then
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null
    print_success "Development server can start successfully"
else
    print_error "Development server failed to start"
    exit 1
fi

print_step "6" "Running quick smoke test"

# Run a quick test to make sure everything works
echo "Running basic smoke test on Chromium..."
if npx playwright test tests/e2e/core/educational-dashboard.spec.ts --project=chromium --timeout=30000 >/dev/null 2>&1; then
    print_success "Smoke test passed"
else
    print_warning "Smoke test failed - this may be due to server not being ready"
    echo "You can run the full test suite manually with: npm run test:cross-browser"
fi

print_step "7" "Creating test shortcuts"

# Create helpful aliases in a local script
cat > run-tests.sh << 'EOF'
#!/bin/bash

# Cross-Browser Testing Shortcuts
# Usage: ./run-tests.sh [command]

case "$1" in
    "all")
        echo "🔄 Running full cross-browser test suite..."
        npm run test:cross-browser
        ;;
    "chrome")
        echo "🔄 Running Chrome tests..."
        npm run test:e2e:chromium
        ;;
    "firefox")
        echo "🔄 Running Firefox tests..."
        npm run test:e2e:firefox
        ;;
    "safari")
        echo "🔄 Running Safari tests..."
        npm run test:e2e:webkit
        ;;
    "edge")
        echo "🔄 Running Edge tests..."
        npm run test:e2e:edge
        ;;
    "mobile")
        echo "🔄 Running mobile tests..."
        npm run test:e2e:mobile
        ;;
    "accessibility")
        echo "🔄 Running accessibility tests..."
        npm run test:accessibility
        ;;
    "performance")
        echo "🔄 Running performance tests..."
        npm run test:performance
        ;;
    "visual")
        echo "🔄 Running visual tests..."
        npm run test:visual
        ;;
    "debug")
        echo "🔍 Starting debug mode..."
        npm run test:e2e:debug
        ;;
    "report")
        echo "📊 Opening test report..."
        npm run test:e2e:report
        ;;
    *)
        echo "Cross-Browser Testing Commands:"
        echo "  ./run-tests.sh all          - Run full test suite"
        echo "  ./run-tests.sh chrome       - Test Chrome only"
        echo "  ./run-tests.sh firefox      - Test Firefox only"
        echo "  ./run-tests.sh safari       - Test Safari only"
        echo "  ./run-tests.sh edge         - Test Edge only"
        echo "  ./run-tests.sh mobile       - Test mobile browsers"
        echo "  ./run-tests.sh accessibility - Test accessibility"
        echo "  ./run-tests.sh performance  - Test performance"
        echo "  ./run-tests.sh visual       - Test visual regression"
        echo "  ./run-tests.sh debug        - Debug mode"
        echo "  ./run-tests.sh report       - View test report"
        ;;
esac
EOF

chmod +x run-tests.sh
print_success "Created run-tests.sh helper script"

print_step "8" "Setup complete"

echo ""
echo "🎉 Cross-Browser Testing Setup Complete!"
echo "======================================="
echo ""
echo "📋 Quick Start Commands:"
echo "  npm run test:cross-browser     # Test all browsers"
echo "  npm run test:e2e:chromium      # Test Chrome"
echo "  npm run test:accessibility     # Test accessibility"
echo "  npm run test:performance       # Test performance"
echo "  ./run-tests.sh all             # Use helper script"
echo ""
echo "🔍 Debug & Development:"
echo "  npm run test:e2e:debug         # Debug mode"
echo "  npm run test:e2e:headed        # Watch tests run"
echo "  npm run test:e2e:report        # View results"
echo ""
echo "📚 Documentation:"
echo "  tests/CROSS_BROWSER_TEST_PLAN.md              # Complete test strategy"
echo "  CROSS_BROWSER_TESTING_IMPLEMENTATION.md       # Implementation details"
echo ""
echo "🚀 Next Steps:"
echo "1. Start your dev server: npm run dev"
echo "2. Run tests: npm run test:cross-browser"
echo "3. View results: npm run test:e2e:report"
echo ""
print_success "Ready for cross-browser testing!"