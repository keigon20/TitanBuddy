import { supabase } from './supabase';

// Convert local file uri -> ArrayBuffer (works well in Expo)
async function uriToArrayBuffer(uri: string) {
    const res = await fetch(uri);
    return await res.arrayBuffer();
}

export async function uploadPublicImage(params: {
    bucket: 'profile-photos' | 'marketplace-images';
    path: string;           // e.g. `${uid}/profile.jpg` or `${listingId}/1.jpg`
    uri: string;            // local image uri from picker
    contentType?: string;   // e.g. 'image/jpeg'
}) {
    const { bucket, path, uri, contentType = 'image/jpeg' } = params;

    const body = await uriToArrayBuffer(uri);

    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, body, {
            contentType,
            upsert: true, // overwrite if exists
        });

    if (error) throw error;

    // For public buckets:
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}