// Simple test script to check the SecurityRule export issue
console.log('🧪 Testing SecurityRule import...');

try {
  const { SecurityRule, getSecurityRules } = await import('./src/utils/securityPatterns.ts');
  console.log('✅ Successfully imported SecurityRule:', typeof SecurityRule);
  console.log('✅ Successfully imported getSecurityRules:', typeof getSecurityRules);
  
  const rules = getSecurityRules('javascript');
  console.log('✅ Got security rules:', rules.length);
} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Stack:', error.stack);
}