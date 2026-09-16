/**
 * Debug route — tests Supabase connectivity and table existence.
 * GET /api/supabase-debug
 * Remove this file after confirming Supabase is working.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: 'Missing env vars',
      url: url ? 'SET' : 'MISSING',
      key: key ? 'SET' : 'MISSING',
    });
  }

  const client = createClient(url, key);
  const results: Record<string, unknown> = {
    url: url,
    keyPrefix: key.substring(0, 20) + '...',
  };

  // Test each table
  const tables = ['children', 'assessments', 'sessions', 'ml_predictions', 'reports'];
  for (const table of tables) {
    const { data, error } = await client.from(table).select('count').limit(1);
    results[table] = error ? `ERROR: ${error.message}` : 'OK';
  }

  // Try inserting a test child profile using a real UUID
  const testId = crypto.randomUUID();
  const { data: insertData, error: insertError } = await client
    .from('children')
    .insert({
      id: testId,
      name: 'Debug Test Child',
      age: 8,
      grade: 'Grade 3',
      interests: ['test'],
      preferred_language: 'en',
    })
    .select()
    .single();

  if (insertError) {
    results['insert_test'] = `FAILED: ${insertError.message} (code: ${insertError.code})`;
  } else {
    results['insert_test'] = 'SUCCESS — row inserted';
    // Clean up
    await client.from('children').delete().eq('id', testId);
    results['cleanup'] = 'Test row deleted';
  }

  return NextResponse.json(results, { status: 200 });
}
