import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load the pulled envs
dotenv.config({ path: '.env.development.local' });

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();

console.log("Using URL:", supabaseUrl);
console.log("Using Key (first 10):", supabaseKey.substring(0, 10));

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGen() {
    const newKey = "TEST-" + Math.random().toString(36).substring(7).toUpperCase();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const { error } = await supabase.from("access_keys").insert([{
        key: newKey,
        expiry_date: expiryDate.toISOString(),
        status: "active"
    }]);

    if (error) {
        console.error("FAILED:", error.message);
    } else {
        console.log("SUCCESS! Key created:", newKey);
    }
}

testGen();
