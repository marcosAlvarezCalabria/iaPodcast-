const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Checking Supabase connection...");
console.log("URL:", url ? "Found" : "Missing");
console.log("Key:", key ? "Found (starts with " + key.substring(0, 5) + "...)" : "Missing");

if (!url || !key) {
    console.error("ERROR: Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    // 1. Check Buckets
    console.log("\nListing Buckets...");
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error("❌ Error connecting/listing:", error.message);
        if (error.message.includes("JWT")) console.error("   (Your SERVICE_ROLE_KEY might be invalid)");
        return;
    }

    if (!buckets || buckets.length === 0) {
        console.log("⚠️  Connected, but NO buckets found.");
        console.log("   Please create a bucket named 'podcasts' in Supabase -> Storage.");
    } else {
        console.log("✅ Connected! Found these buckets:");
        let found = false;
        buckets.forEach(b => {
            console.log(`   - "${b.name}" (Public: ${b.public})`);
            if (b.name === 'podcasts') found = true;
        });

        if (found) {
            console.log("\nTrying strict upload test to 'podcasts'...");
            const { error: uploadError } = await supabase.storage
                .from('podcasts')
                .upload('test_connection.txt', 'Hello World', { upsert: true });

            if (uploadError) {
                console.error("❌ Upload failed:", uploadError.message);
            } else {
                console.log("✅ Ready! Upload test passed.");
            }
        } else {
            console.error("\n❌ ERROR: 'podcasts' bucket is MISSING. Please create it exactly with that name.");
        }
    }
}

check();
