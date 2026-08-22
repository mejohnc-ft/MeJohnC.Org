import { describe, it, expect, vi } from 'vitest';
import { PostgrestError } from '@supabase/supabase-js';
import { SUPABASE_ERROR_CODES } from './constants';
import { SupabaseQueryError } from './errors';

vi.mock('./sentry', () => ({
  captureException: vi.fn(),
}));

vi.mock('./supabase', () => ({
  getSupabase: vi.fn(),
  supabase: {},
}));

import { getSiteContent } from './site-content-queries';

function mockClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, maybeSingle };
}

describe('getSiteContent', () => {
  it('returns null for a missing site_content key without throwing', async () => {
    const client = mockClient({ data: null, error: null });

    await expect(getSiteContent('projects', client as never)).resolves.toBeNull();
    expect(client.from).toHaveBeenCalledWith('site_content');
    expect(client.maybeSingle).toHaveBeenCalled();
  });

  it('returns null for PGRST116 (0 rows) without throwing', async () => {
    const error: PostgrestError = {
      message: 'JSON object requested, multiple (or no) rows returned',
      details: 'The result contains 0 rows',
      hint: null,
      code: SUPABASE_ERROR_CODES.NOT_FOUND,
    };

    await expect(
      getSiteContent('projects', mockClient({ data: null, error }) as never)
    ).resolves.toBeNull();
  });

  it('throws SupabaseQueryError for real query failures', async () => {
    const error: PostgrestError = {
      message: 'JWT expired',
      details: null,
      hint: null,
      code: 'PGRST301',
    };

    await expect(
      getSiteContent('hero', mockClient({ data: null, error }) as never)
    ).rejects.toBeInstanceOf(SupabaseQueryError);
  });

  it('returns the row when present', async () => {
    const row = { key: 'hero', title: 'Hero', content: '{}' };

    await expect(
      getSiteContent('hero', mockClient({ data: row, error: null }) as never)
    ).resolves.toEqual(row);
  });
});
