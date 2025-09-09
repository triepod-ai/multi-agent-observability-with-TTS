import puppeteer from 'puppeteer';

async function debugNetworkIssues() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        devtools: true
    });

    try {
        const page = await browser.newPage();
        
        // Arrays to capture different types of information
        const errors = [];
        const networkFailures = [];
        const responses = [];
        
        // Listen to console events
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            
            console.log(`[${type.toUpperCase()}] ${text}`);
            
            if (type === 'error') {
                errors.push(text);
            }
        });
        
        // Listen to page errors
        page.on('pageerror', error => {
            console.log(`[PAGE ERROR] ${error.message}`);
            errors.push(`PAGE ERROR: ${error.message}`);
        });
        
        // Listen to failed requests
        page.on('requestfailed', request => {
            const failure = `${request.url()} - ${request.failure().errorText}`;
            console.log(`[REQUEST FAILED] ${failure}`);
            networkFailures.push(failure);
        });
        
        // Listen to responses for TypeScript files
        page.on('response', response => {
            const url = response.url();
            if (url.includes('securityPatterns') || url.includes('.ts') || url.includes('.js')) {
                responses.push({
                    url,
                    status: response.status(),
                    statusText: response.statusText(),
                    headers: response.headers()
                });
            }
        });
        
        console.log('🚀 Navigating to http://localhost:8544...\n');
        
        // Navigate to the application
        await page.goto('http://localhost:8544', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait for any additional requests
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n📊 DETAILED ANALYSIS');
        console.log('====================');
        
        // Show SecurityRule specific errors
        const securityRuleErrors = errors.filter(error => 
            error.toLowerCase().includes('securityrule') || 
            error.toLowerCase().includes('securitypatterns')
        );
        
        if (securityRuleErrors.length > 0) {
            console.log('\n🎯 SECURITYRULE SPECIFIC ERRORS:');
            securityRuleErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        // Show network responses for relevant files
        if (responses.length > 0) {
            console.log('\n🌐 RELEVANT NETWORK RESPONSES:');
            responses.forEach((response, index) => {
                console.log(`${index + 1}. ${response.url}`);
                console.log(`   Status: ${response.status} ${response.statusText}`);
                console.log(`   Content-Type: ${response.headers['content-type'] || 'not set'}`);
            });
        }
        
        // Try to inspect the actual module in the browser
        console.log('\n🔍 MODULE INSPECTION');
        console.log('===================');
        
        try {
            const moduleInfo = await page.evaluate(() => {
                // Try to access the module through Vite's module system
                if (window.__vite_plugin_react_preamble_installed__) {
                    return 'Vite React plugin detected';
                }
                
                // Check if we can access the module
                const moduleScript = document.querySelector('script[type="module"]');
                if (moduleScript) {
                    return `Module script found: ${moduleScript.src || 'inline'}`;
                }
                
                return 'No module information found';
            });
            console.log(`Module Info: ${moduleInfo}`);
            
        } catch (evalError) {
            console.log(`Error inspecting modules: ${evalError.message}`);
        }
        
        // Let the page stay open for manual inspection
        console.log('\n⏸️  Page staying open for manual inspection...');
        console.log('   Press Ctrl+C to close when done');
        
        // Keep the browser open for manual inspection
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Failed to debug application:', error.message);
        
        if (error.message.includes('ERR_CONNECTION_REFUSED')) {
            console.log('\n💡 TROUBLESHOOTING TIPS:');
            console.log('1. Make sure the development server is running on http://localhost:8544');
            console.log('2. Check if the port 8544 is correct');
            console.log('3. Verify the application started successfully');
        }
    } finally {
        // Note: We're not closing the browser automatically for manual inspection
        // await browser.close();
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Closing browser...');
    process.exit(0);
});

// Run the debug session
debugNetworkIssues().catch(console.error);