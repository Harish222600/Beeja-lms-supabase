const { initializeStorageBuckets } = require('../config/supabaseStorage');

/**
 * Test script to verify bucket creation with updated configuration
 * Run this to test if the "Object exceeded maximum allowed size" error is fixed
 */
async function testBucketCreation() {
    console.log('🧪 Testing Supabase bucket creation with updated configuration...\n');
    
    try {
        await initializeStorageBuckets();
        console.log('\n✅ Bucket creation test completed successfully!');
        console.log('📋 Check the output above for any failed buckets.');
        console.log('💡 If buckets failed to create automatically, use the manual methods in SUPABASE_SETUP_GUIDE.md');
    } catch (error) {
        console.error('\n❌ Bucket creation test failed:', error.message);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check your SUPABASE_SERVICE_ROLE_KEY in .env file');
        console.log('2. Ensure you\'re using the service_role key, not anon key');
        console.log('3. Verify your Supabase project URL is correct');
        console.log('4. See SUPABASE_SETUP_GUIDE.md for manual bucket creation');
    }
    
    process.exit(0);
}

// Run the test
testBucketCreation();
