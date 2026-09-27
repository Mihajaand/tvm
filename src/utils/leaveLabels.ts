const LEAVE_STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approuvé',
  PENDING_MANAGER: 'En attente du manager',
  PENDING_HR: 'En attente des RH',
  REJECTED: 'Refusé',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Congé annuel',
  ANNUEL: 'Congé annuel',
  CASUAL: 'Congé occasionnel',
  OCCASIONNEL: 'Congé occasionnel',
  SICK: 'Congé maladie',
  MALADIE: 'Congé maladie',
  MATERNITY: 'Congé de maternité',
  MATERNITE: 'Congé de maternité',
  PATERNITY: 'Congé de paternité',
  PATERNITE: 'Congé de paternité',
  EARNED: 'Congé acquis',
  ACQUIS: 'Congé acquis',
  UNPAID: 'Congé non rémunéré',
  NON_REMUNERE: 'Congé non rémunéré',
};

export const getLeaveStatusLabel = (status: string): string => {
  const normalizedStatus = status.trim().toUpperCase();
  return LEAVE_STATUS_LABELS[normalizedStatus] || normalizedStatus.replace(/_/g, ' ');
};

export const getLeaveTypeLabel = (type: string, configuredName?: string): string => {
  const normalizedType = type.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return LEAVE_TYPE_LABELS[normalizedType] || configuredName || type.replace(/_/g, ' ');
};