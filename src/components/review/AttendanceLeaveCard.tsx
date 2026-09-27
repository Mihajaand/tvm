
import React from 'react';
import { Clock, CalendarOff } from 'lucide-react';
import { AttendanceSummary, LeaveSummary } from '../../types';

interface Props {
  attendance: AttendanceSummary;
  leave: LeaveSummary;
}

const StatItem: React.FC<{ label: string; value: number | string; color?: string }> = ({ label, value, color = 'text-slate-900' }) => (
  <div className="text-center">
    <p className={`text-lg font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
  </div>
);

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Congé annuel',
  CASUAL: 'Congé occasionnel',
  SICK: 'Congé maladie',
  UNPAID: 'Congé non rémunéré',
  ANNUEL: 'Congé annuel',
  OCCASIONNEL: 'Congé occasionnel',
  MALADIE: 'Congé maladie',
  NON_REMUNERE: 'Congé non rémunéré',
};

const AttendanceLeaveCard: React.FC<Props> = ({ attendance, leave }) => {
  // Build leave entries from typeBreakdown (new format) or legacy fields
  const leaveEntries: { label: string; value: number; color?: string }[] = [];

  if (leave.typeBreakdown && Object.keys(leave.typeBreakdown).length > 0) {
    for (const [type, days] of Object.entries(leave.typeBreakdown)) {
      leaveEntries.push({
        label: LEAVE_TYPE_LABELS[type.toUpperCase()] || type.replace(/_/g, ' '),
        value: days,
        color: type === 'UNPAID' ? 'text-red-600' : undefined,
      });
    }
  } else {
    // Legacy format fallback
    if (leave.annualLeaveTaken !== undefined) leaveEntries.push({ label: 'Congé annuel', value: leave.annualLeaveTaken || 0 });
    if (leave.casualLeaveTaken !== undefined) leaveEntries.push({ label: 'Congé occasionnel', value: leave.casualLeaveTaken || 0 });
    if (leave.sickLeaveTaken !== undefined) leaveEntries.push({ label: 'Congé maladie', value: leave.sickLeaveTaken || 0 });
    if (leave.unpaidLeaveTaken !== undefined) leaveEntries.push({ label: 'Congé non rémunéré', value: leave.unpaidLeaveTaken || 0, color: 'text-red-600' });
  }

  return (
    <div className="space-y-4">
      {/* Attendance Summary */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-primary" />
          <h4 className="font-semibold text-slate-900 text-sm">Résumé des présences</h4>
          <span className="ml-auto text-xs font-bold text-primary bg-primary-light/50 px-2.5 py-0.5 rounded-full">
            {attendance.attendancePercentage}%
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatItem label="Jours ouvrés" value={attendance.totalWorkingDays} />
          <StatItem label="Présents" value={attendance.presentDays} color="text-green-600" />
          <StatItem label="Retards" value={attendance.lateDays} color="text-orange-600" />
          <StatItem label="Absences" value={attendance.absentDays} color="text-red-600" />
          <StatItem label="Départs anticipés" value={attendance.earlyOutDays} color="text-yellow-600" />
        </div>
      </div>

      {/* Leave Summary */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarOff size={16} className="text-primary" />
          <h4 className="font-semibold text-slate-900 text-sm">Résumé des congés</h4>
          <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {leave.totalLeaveDays} jour(s)
          </span>
        </div>
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(leaveEntries.length || 1, 5)}, 1fr)` }}>
          {leaveEntries.map(entry => (
            <StatItem key={entry.label} label={entry.label} value={entry.value} color={entry.color} />
          ))}
          {leaveEntries.length === 0 && (
            <p className="text-xs text-slate-400 col-span-full text-center">Aucune donnée de congé</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceLeaveCard;
