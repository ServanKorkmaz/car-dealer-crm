
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE!;

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Storage bucket management
export async function ensureFeedbackBucket(): Promise<void> {
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'feedback-shots';
  
  try {
    const { data: buckets } = await supabaseServer.storage.listBuckets();
    const bucketExists = buckets?.find(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error } = await supabaseServer.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        console.error('Failed to create feedback bucket:', error);
        throw error;
      }
      
      console.log(`Created feedback bucket: ${bucketName}`);
    }
  } catch (error) {
    console.error('Error ensuring feedback bucket:', error);
    throw error;
  }
}

export async function uploadScreenshot(base64Data: string, filename: string): Promise<string> {
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'feedback-shots';
  
  // Remove data URL prefix if present
  const base64Clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(base64Clean, 'base64');
  
  const { data, error } = await supabaseServer.storage
    .from(bucketName)
    .upload(filename, buffer, {
      contentType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
      upsert: false
    });
  
  if (error) {
    console.error('Screenshot upload failed:', error);
    throw error;
  }
  
  const { data: urlData } = supabaseServer.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}
