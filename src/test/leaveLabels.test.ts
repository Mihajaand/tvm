import { describe, expect, it } from 'vitest';
import { getLeaveStatusLabel, getLeaveTypeLabel } from '../utils/leaveLabels';

describe('leave labels', () => {
  it('translates leave workflow statuses without changing the stored codes', () => {
    expect(getLeaveStatusLabel('APPROVED')).toBe('Approuvé');
    expect(getLeaveStatusLabel('PENDING_MANAGER')).toBe('En attente du manager');
    expect(getLeaveStatusLabel('PENDING_HR')).toBe('En attente des RH');
    expect(getLeaveStatusLabel('REJECTED')).toBe('Refusé');
  });

  it('translates standard and legacy leave type codes', () => {
    expect(getLeaveTypeLabel('ANNUAL')).toBe('Congé annuel');
    expect(getLeaveTypeLabel('OCCASIONNEL')).toBe('Congé occasionnel');
    expect(getLeaveTypeLabel('SICK')).toBe('Congé maladie');
  });

  it('preserves configured names for custom leave types', () => {
    expect(getLeaveTypeLabel('SPECIAL_RECOVERY', 'Congé de récupération')).toBe('Congé de récupération');
    expect(getLeaveTypeLabel('SPECIAL_RECOVERY')).toBe('SPECIAL RECOVERY');
  });
});