import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase server credentials not configured - feedback system will be disabled');
}

export const supabaseServer = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Create feedback-shots bucket if it doesn't exist
export async function ensureFeedbackBucket() {
  if (!supabaseServer) return false;
  
  try {
    // Check if bucket exists
    const { data: buckets } = await supabaseServer.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.id === 'feedback-shots');
    
    if (!bucketExists) {
      const { error } = await supabaseServer.storage.createBucket('feedback-shots', {
        public: true
      });
      
      if (error) {
        console.error('Failed to create feedback-shots bucket:', error);
        return false;
      }
      
      console.log('✅ Created feedback-shots storage bucket');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring feedback bucket:', error);
    return false;
  }
}

// Upload screenshot to Supabase Storage
export async function uploadScreenshot(base64Data: string, feedbackId: string): Promise<string | null> {
  if (!supabaseServer) return null;
  
  try {
    await ensureFeedbackBucket();
    
    // Convert base64 to buffer
    const base64Clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    
    // Generate filename
    const filename = `${feedbackId}-${Date.now()}.png`;
    const filePath = `screenshots/${filename}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseServer.storage
      .from('feedback-shots')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false
      });
    
    if (error) {
      console.error('Failed to upload screenshot:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabaseServer.storage
      .from('feedback-shots')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return null;
  }
}