
import React, { useState, useEffect } from 'react';
import { X, Send, RefreshCw, AlertCircle, UserPlus, Edit3 } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { LeaveRequest, CustomLeaveType } from '../../types';
import { DEFAULT_LEAVE_TYPES } from '../../constants';
import { getLeaveStatusLabel, getLeaveTypeLabel } from '../../utils/leaveLabels';

interface Employee {
  id: string;
  name: string;
  department: string;
}

interface Props {
  mode: 'create' | 'edit';
  leave?: LeaveRequest | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = ['APPROVED', 'PENDING_MANAGER', 'PENDING_HR', 'REJECTED'];

const AdminLeaveFormModal: React.FC<Props> = ({ mode, leave, employees, onClose, onSaved }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<CustomLeaveType[]>(DEFAULT_LEAVE_TYPES);

  const [employeeId, setEmployeeId] = useState(leave?.employeeId || '');
  const [type, setType] = useState<string>(leave?.type || 'ANNUAL');
  const [startDate, setStartDate] = useState(leave?.startDate?.split(' ')[0] || '');
  const [endDate, setEndDate] = useState(leave?.endDate?.split(' ')[0] || '');
  const [reason, setReason] = useState(leave?.reason || '');
  const [status, setStatus] = useState<string>(leave?.status || 'APPROVED');
  const [remarks, setRemarks] = useState(leave?.approverRemarks || '');
  const [totalDays, setTotalDays] = useState(leave?.totalDays || 0);

  useEffect(() => {
    hrService.getLeaveTypes().then(setLeaveTypes).catch((err) => {
      console.error('Échec du chargement des types de congé :', err);
    });
  }, []);

  // Calcul automatique du nombre de jours calendaires, modifiable par l'administration.
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e >= s) {
        const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setTotalDays(diff);
      }
    }
  }, [startDate, endDate]);

  const selectedEmployee = employees.find(e => e.id === employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'create' && !employeeId) {
      setError('Veuillez sélectionner un employé.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Veuillez sélectionner les dates de début et de fin.');
      return;
    }
    if (totalDays <= 0) {
      setError('Le nombre de jours doit être supérieur à zéro.');
      return;
    }

    setIsProcessing(true);
    try {
      if (mode === 'create') {
        await hrService.adminCreateLeave({
          employeeId,
          employeeName: selectedEmployee?.name || '',
          type,
          startDate,
          endDate,
          totalDays,
          reason,
          status,
          remarks
        });
      } else if (leave) {
        await hrService.adminUpdateLeave(leave.id, {
          type,
          startDate,
          endDate,
          totalDays,
          reason,
          status,
          approverRemarks: remarks
        });
      }
      onSaved();
    } catch (err: any) {
      console.error('Échec de l’enregistrement du congé :', err);
      setError('Impossible d’enregistrer le congé. Vérifiez les informations et réessayez.');
    } finally {
      setIsProcessing(false);
    }
  };

  const headerColor = mode === 'create' ? 'bg-primary' : 'bg-amber-600';
  const HeaderIcon = mode === 'create' ? UserPlus : Edit3;
  const headerTitle = mode === 'create' ? 'Créer une demande de congé' : 'Modifier la demande de congé';
  const submitLabel = mode === 'create' ? 'Créer le congé' : 'Enregistrer les modifications';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in max-h-[90vh] flex flex-col">
        <div className={`p-8 ${headerColor} text-white flex justify-between items-center flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <HeaderIcon size={20} />
            <h3 className="text-lg font-semibold uppercase tracking-tight">{headerTitle}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl flex gap-2 items-start">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Sélection de l'employé (création uniquement) */}
          {mode === 'create' && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Employé</label>
              <select
                required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm outline-none focus:ring-4 focus:ring-primary-light transition-all"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
              >
                <option value="">— Sélectionner un employé —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                ))}
              </select>
            </div>
          )}

          {/* En modification, le nom de l'employé est en lecture seule */}
          {mode === 'edit' && leave && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Employé</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{leave.employeeName}</p>
            </div>
          )}

          {/* Type de congé */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Type de congé</label>
            <select
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm outline-none focus:ring-4 focus:ring-primary-light transition-all"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>{getLeaveTypeLabel(t.id, t.name)}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Date de début</label>
              <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light transition-all" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Date de fin</label>
              <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light transition-all" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Nombre de jours (calculé automatiquement et modifiable) */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Nombre de jours</label>
            <input type="number" min={0} step={0.5} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light transition-all" value={totalDays} onChange={e => setTotalDays(Number(e.target.value))} />
          </div>

          {/* Motif */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Motif</label>
            <textarea placeholder="Précisez le motif du congé…" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm min-h-[80px] outline-none focus:ring-4 focus:ring-primary-light transition-all" value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          {/* Statut */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Statut</label>
            <select
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm outline-none focus:ring-4 focus:ring-primary-light transition-all"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{getLeaveStatusLabel(s)}</option>
              ))}
            </select>
          </div>

          {/* Remarques */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Remarques de l’administration</label>
            <textarea placeholder="Notes facultatives de l’administration…" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm min-h-[60px] outline-none focus:ring-4 focus:ring-primary-light transition-all" value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full py-5 ${headerColor} text-white rounded-xl font-semibold uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all`}
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLeaveFormModal;
