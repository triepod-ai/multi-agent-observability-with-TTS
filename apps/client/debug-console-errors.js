import puppeteer from 'puppeteer';

async function captureConsoleErrors() {
    const browser = await puppeteer.launch({
        headless: false, // Set to true for headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        devtools: false
    });

    try {
        const page = await browser.newPage();
        
        // Arrays to capture different types of logs
        const errors = [];
        const warnings = [];
        const logs = [];
        
        // Listen to console events
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            
            console.log(`[${type.toUpperCase()}] ${text}`);
            
            if (type === 'error') {
                errors.push(text);
            } else if (type === 'warning') {
                warnings.push(text);
            } else {
                logs.push(text);
            }
        });
        
        // Listen to page errors (uncaught exceptions)
        page.on('pageerror', error => {
            console.log(`[PAGE ERROR] ${error.message}`);
            errors.push(`PAGE ERROR: ${error.message}`);
        });
        
        // Listen to failed requests
        page.on('requestfailed', request => {
            console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure().errorText}`);
            errors.push(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
        });
        
        console.log('🚀 Navigating to http://localhost:8544...\n');
        
        // Navigate to the application
        await page.goto('http://localhost:8544', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait a bit for any async operations to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n📊 SUMMARY REPORT');
        console.log('==================');
        
        if (errors.length > 0) {
            console.log(`\n❌ ERRORS (${errors.length}):`);
            errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
                
                // Check specifically for AnalysisResult export errors
                if (error.toLowerCase().includes('analysisresult')) {
                    console.log(`   🎯 FOUND AnalysisResult ISSUE: ${error}`);
                }
                if (error.toLowerCase().includes('export')) {
                    console.log(`   📤 EXPORT-RELATED: ${error}`);
                }
                if (error.toLowerCase().includes('import')) {
                    console.log(`   📥 IMPORT-RELATED: ${error}`);
                }
            });
        } else {
            console.log('\n✅ NO ERRORS FOUND');
        }
        
        if (warnings.length > 0) {
            console.log(`\n⚠️ WARNINGS (${warnings.length}):`);
            warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning}`);
            });
        }
        
        if (logs.length > 0) {
            console.log(`\n💬 OTHER LOGS (${logs.length}):`);
            logs.slice(0, 5).forEach((log, index) => {
                console.log(`${index + 1}. ${log}`);
            });
            if (logs.length > 5) {
                console.log(`... and ${logs.length - 5} more logs`);
            }
        }
        
        // Try to get more specific information about the application state
        console.log('\n🔍 APPLICATION STATE CHECK');
        console.log('==========================');
        
        try {
            const title = await page.title();
            console.log(`Page Title: ${title}`);
            
            const url = page.url();
            console.log(`Current URL: ${url}`);
            
            // Check if React is loaded
            const reactVersion = await page.evaluate(() => {
                return typeof window.React !== 'undefined' ? 'React loaded' : 'React not found';
            });
            console.log(`React Status: ${reactVersion}`);
            
            // Check for any global error objects
            const globalErrors = await page.evaluate(() => {
                return window.errors || window.errorLog || 'No global error objects found';
            });
            console.log(`Global Errors: ${globalErrors}`);
            
        } catch (evalError) {
            console.log(`Error checking application state: ${evalError.message}`);
        }
        
        console.log('\n✨ Debug session completed');
        
    } catch (error) {
        console.error('❌ Failed to debug application:', error.message);
        
        if (error.message.includes('ERR_CONNECTION_REFUSED')) {
            console.log('\n💡 TROUBLESHOOTING TIPS:');
            console.log('1. Make sure the development server is running on http://localhost:8544');
            console.log('2. Check if the port 8544 is correct');
            console.log('3. Verify the application started successfully');
        }
    } finally {
        await browser.close();
    }
}

// Run the debug session
captureConsoleErrors().catch(console.error);