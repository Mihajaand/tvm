import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('review cycle workflow schema', () => {
  it('adds the status and active competency fields used by the service', () => {
    const migration = fs.readFileSync(
      path.resolve('supabase/migrations/0038_review_cycle_workflow_fields.sql'),
      'utf8'
    );

    expect(migration).toMatch(/add column if not exists status text not null default 'UPCOMING'/i);
    expect(migration).toMatch(/add column if not exists active_competencies jsonb not null default '\[\]'::jsonb/i);
    expect(migration).toContain("'UPCOMING', 'OPEN', 'CLOSED', 'ARCHIVED'");
  });
});