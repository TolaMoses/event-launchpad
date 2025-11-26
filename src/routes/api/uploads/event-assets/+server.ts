import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

const BUCKET_NAME = 'event-assets';
const LIMITS: Record<'banner' | 'logo', number> = {
  banner: 500 * 1024,
  logo: 150 * 1024
};

const LABELS: Record<'banner' | 'logo', string> = {
  banner: 'Banner image',
  logo: 'Logo image'
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const kind = formData.get('kind');

  if (!(file instanceof File)) {
    throw error(400, 'Missing file payload');
  }

  if (kind !== 'banner' && kind !== 'logo') {
    throw error(400, 'Invalid asset kind');
  }

  const limit = LIMITS[kind];
  if (file.size > limit) {
    throw error(400, `${LABELS[kind]} exceeds ${limit / 1024} KB size limit.`);
  }

  if (!file.type.startsWith('image/')) {
    throw error(400, 'Only image uploads are supported.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = (() => {
    const name = file.name ?? '';
    const ext = name.split('.').pop();
    return ext ? ext.toLowerCase() : 'png';
  })();

  const objectPath = `${kind}s/${randomUUID()}.${extension}`;

  const uploadResult = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(objectPath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    });

  if (uploadResult.error) {
    throw error(500, uploadResult.error.message);
  }

  const { data: publicUrlData, error: publicUrlError } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(objectPath);

  if (publicUrlError) {
    throw error(500, publicUrlError.message);
  }

  return json(
    {
      path: uploadResult.data.path,
      publicUrl: publicUrlData.publicUrl
    },
    { status: 201 }
  );
};
