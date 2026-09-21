import React, { useState, useEffect } from 'react';
import { Send, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle2, Calendar, Download, RefreshCw } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { organizationService } from '../../services/organization.service';
import { PerformanceReview, ReviewCycle, CompetencyRating, OrgReviewConfig, CustomCompetency } from '../../types';
import CompetencyRatingCard from './CompetencyRatingCard';
import AttendanceLeaveCard from './AttendanceLeaveCard';
import ReviewStatusBadge from './ReviewStatusBadge';
import HelpButton from '../onboarding/HelpButton';


const getScaledLogoDims = (dataUrl: string, maxSize: number): Promise<{ w: number; h: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
      resolve({ w: img.naturalWidth * ratio, h: img.naturalHeight * ratio });
    };
    img.onerror = () => resolve({ w: maxSize, h: maxSize });
    img.src = dataUrl;
  });

interface Props {
  user: any;
  activeCycle: ReviewCycle | null;
  upcomingCycle?: ReviewCycle | null;
  myReview: PerformanceReview | null;
  pastReviews: PerformanceReview[];
  onRefresh: () => void;
  readOnly?: boolean;
  reviewConfig: OrgReviewConfig;
  cycles?: ReviewCycle[];
}

const EmployeeReviewModule: React.FC<Props> = ({ user, activeCycle, upcomingCycle, myReview, pastReviews, onRefresh, readOnly = false, reviewConfig, cycles }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  const competencies = reviewConfig.competencies;
  const ratingScale = reviewConfig.ratingScale.labels;

  const [ratings, setRatings] = useState<Record<string, { rating: number; comment: string }>>(() => {
    const initial: any = {};
    competencies.forEach(c => {
      const existing = myReview?.selfRatings.find(r => r.competencyId === c.id);
      initial[c.id] = {
        rating: existing?.rating || 0,
        comment: existing?.comment || '',
      };
    });
    return initial;
  });

  // Synchroniser l'état des notes lorsque les compétences changent (ex: nouvelle compétence ajoutée dans les paramètres)
  useEffect(() => {
    setRatings(prev => {
      const updated = { ...prev };
      let changed = false;
      competencies.forEach(c => {
        if (!(c.id in updated)) {
          const existing = myReview?.selfRatings.find(r => r.competencyId === c.id);
          updated[c.id] = { rating: existing?.rating || 0, comment: existing?.comment || '' };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [competencies, myReview]);

  const canSubmit = myReview?.status === 'DRAFT' && !readOnly;
  const allRated = competencies.every(c => ratings[c.id]?.rating > 0);

  const handleCreateAndOpen = async () => {
    if (!activeCycle || readOnly) return;
    setIsProcessing(true);
    try {
      const employees = await hrService.getEmployees();
      const me = employees.find((e: any) => e.id === user.id);
      const manager = me?.lineManagerId ? employees.find((e: any) => e.id === me.lineManagerId) : null;

      await hrService.createReview(
        activeCycle.id,
        user.id,
        user.name,
        me?.lineManagerId || manager?.id,
        manager?.name,
      );
      onRefresh();
    } catch (e) {
      console.error("Échec de la création de l'évaluation :", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!myReview || !canSubmit || !allRated) return;
    setIsProcessing(true);
    try {
      const selfRatings: CompetencyRating[] = competencies.map(c => ({
        competencyId: c.id,
        rating: ratings[c.id].rating,
        comment: ratings[c.id].comment,
      }));
      await hrService.submitSelfAssessment(myReview.id, selfRatings);
      onRefresh();
    } catch (e) {
      console.error("Échec de la soumission de l'auto-évaluation :", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateRating = (id: string, rating: number) => {
    setRatings(prev => ({ ...prev, [id]: { ...prev[id], rating } }));
  };

  const updateComment = (id: string, comment: string) => {
    setRatings(prev => ({ ...prev, [id]: { ...prev[id], comment } }));
  };

  const avgRating = (ratingsArr: CompetencyRating[]) => {
    const rated = ratingsArr.filter(r => r.rating > 0);
    if (rated.length === 0) return 0;
    return (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(1);
  };

  // Résoudre les informations de compétence : essayer d'abord la configuration de l'organisation, puis recourir à une solution de repli pour les identifiants obsolètes
  const resolveCompetency = (competencyId: string): CustomCompetency => {
    const found = competencies.find(c => c.id === competencyId);
    if (found) return found;
    return { id: competencyId, name: competencyId.replace(/_/g, ' '), description: '', behaviors: [] };
  };

  const maxRating = reviewConfig.ratingScale.max;

  const generateReviewPdf = async (review: PerformanceReview, cycleName?: string) => {
    setGeneratingPdfId(review.id);
    try {
      // Récupérer les informations de l'organisation
      let orgName = '', orgAddress = '', logoDataUrl: string | null = null;
      try {
        const branding = await organizationService.getOrgBranding();
        orgName = branding.name;
        orgAddress = branding.address;
        logoDataUrl = branding.logoDataUrl;
      } catch { /* procéder sans les informations de l'organisation */ }

      const resolvedCycleName = cycleName || cycles?.find(c => c.id === review.cycleId)?.name || review.cycleId;

      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      if (autoTableModule.applyPlugin) autoTableModule.applyPlugin(jsPDF);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      // En-tête : logo + nom de l'organisation + adresse
      const logoSize = 18;
      let textStartX = 14;
      if (logoDataUrl) {
        try {
          const logoDims = await getScaledLogoDims(logoDataUrl, logoSize);
          doc.addImage(logoDataUrl, 'PNG', 14, y - 4, logoDims.w, logoDims.h);
          textStartX = 14 + logoDims.w + 5;
        } catch { /* ignorer le logo */ }
      }
      if (orgName) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(orgName, textStartX, y + 2);
        if (orgAddress) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(orgAddress, textStartX, y + 8);
        }
      }
      y += 20;

      // Ligne de séparation RH
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageWidth - 14, y);
      y += 12;

      // Titre
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Rapport d'évaluation des performances", pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Nom du cycle
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(resolvedCycleName, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 10;

      // Utilitaire pour les sections
      const pageHeight = doc.internal.pageSize.getHeight();
      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }
      };

      const drawSection = (title: string, rows: [string, string][]) => {
        checkPageBreak(20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(title, 14, y);
        y += 2;
        doc.setDrawColor(220);
        doc.line(14, y, pageWidth - 14, y);
        y += 6;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        rows.forEach(([label, value]) => {
          checkPageBreak(10);
          doc.setFont('helvetica', 'bold');
          doc.text(label + ' :', 18, y);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(value || 'N/A', pageWidth - 70);
          doc.text(lines, 65, y);
          y += lines.length * 5 + 2;
        });
        y += 4;
      };

      // Informations sur l'employé
      drawSection("Informations sur l'employé", [
        ['Nom', review.employeeName || user.name || ''],
        ['ID employé', user.employeeId || ''],
        ['Département', user.department || ''],
        ['Désignation', user.designation || ''],
        ['Manager', review.managerName || 'N/A'],
      ]);

      // Résumé des présences
      const att = review.attendanceSummary;
      drawSection('Résumé des présences', [
        ['Jours ouvrables totaux', String(att.totalWorkingDays)],
        ['Présences', String(att.presentDays)],
        ['Retards', String(att.lateDays)],
        ['Absences', String(att.absentDays)],
        ['Départs anticipés', String(att.earlyOutDays)],
        ['Pourcentage de présence', `${att.attendancePercentage}%`],
      ]);

      // Résumé des congés
      const leaveRows: [string, string][] = Object.entries(review.leaveSummary.typeBreakdown || {}).map(
        ([type, days]) => [type.replace(/_/g, ' '), String(days)]
      );
      leaveRows.push(["Nombre total de jours de congé", String(review.leaveSummary.totalLeaveDays)]);
      drawSection('Résumé des congés', leaveRows);

      // Tableau des notes de compétences
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Notes des compétences', 14, y);
      y += 2;
      doc.setDrawColor(220);
      doc.line(14, y, pageWidth - 14, y);
      y += 4;

      const tableBody = competencies.map(comp => {
        const selfR = review.selfRatings.find(r => r.competencyId === comp.id);
        const mgrR = review.managerRatings.find(r => r.competencyId === comp.id);
        return [
          comp.name,
          selfR?.rating ? `${selfR.rating}/${maxRating}` : '-',
          selfR?.comment || '-',
          mgrR?.rating ? `${mgrR.rating}/${maxRating}` : '-',
          mgrR?.comment || '-',
        ];
      });

      (doc as any).autoTable({
        startY: y,
        head: [['Compétence', 'Note perso.', 'Commentaire perso.', 'Note manager', 'Commentaire manager']],
        body: tableBody,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [70, 70, 70] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 45 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 45 },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Résumé des notes
      drawSection('Résumé des notes', [
        ['Moyenne personnelle', `${avgRating(review.selfRatings)}/${maxRating}`],
        ['Moyenne du manager', `${avgRating(review.managerRatings)}/${maxRating}`],
      ]);

      // Évaluation finale RH (uniquement si COMPLETED)
      if (review.status === 'COMPLETED') {
        drawSection('Évaluation finale RH', [
          ['Note globale', review.hrOverallRating?.replace(/_/g, ' ') || 'N/A'],
          ['Remarques RH', review.hrFinalRemarks || 'N/A'],
        ]);
      }

      // Lignes de signature — s'assurer qu'elles tiennent sur la page
      const sigSpaceNeeded = 30; // espace nécessaire pour le bloc de signature
      if (y + sigSpaceNeeded > pageHeight - 15) {
        doc.addPage();
        y = 30;
      }
      const sigY = y + 20;
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(25, sigY, 90, sigY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("Signature de l'employé", 35, sigY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(review.employeeName || user.name || '', 40, sigY + 10);
      doc.line(pageWidth - 90, sigY, pageWidth - 25, sigY);
      doc.setFont('helvetica', 'normal');
      doc.text('Signature du manager / approbateur', pageWidth - 85, sigY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(review.managerName || 'N/A', pageWidth - 70, sigY + 10);

      const safeCycleName = resolvedCycleName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeName = (review.employeeName || user.name || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Performance_Review_${safeCycleName}_${safeName}.pdf`);
    } catch (err) {
      console.error("Échec de la génération du PDF de l'évaluation", err);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-xl font-bold text-slate-900">Mon évaluation des performances</h2><HelpButton helpPointId="review.employee" size={16} /></div>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeCycle
              ? `${activeCycle.name} — du ${new Date(activeCycle.startDate).toLocaleDateString()} au ${new Date(activeCycle.endDate).toLocaleDateString()}`
              : "Aucun cycle d'évaluation actif"}
          </p>
        </div>
        {myReview && (
          <div className="flex items-center gap-2">
            {(myReview.status === 'MANAGER_REVIEWED' || myReview.status === 'COMPLETED') && (
              <button
                onClick={() => generateReviewPdf(myReview, activeCycle?.name)}
                disabled={generatingPdfId === myReview.id}
                className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                title="Télécharger le PDF"
              >
                {generatingPdfId === myReview.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              </button>
            )}
            <ReviewStatusBadge status={myReview.status} />
          </div>
        )}
      </div>

      {/* Aucun cycle actif */}
      {!activeCycle && !upcomingCycle && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Aucun cycle d'évaluation actif pour le moment.</p>
          <p className="text-xs text-slate-400 mt-1">Votre équipe RH ouvrira un cycle lorsque ce sera le moment des évaluations.</p>
        </div>
      )}

      {/* Aperçu du prochain cycle */}
      {!activeCycle && upcomingCycle && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
          <Calendar size={36} className="mx-auto text-blue-400 mb-3" />
          <p className="font-semibold text-blue-800">{upcomingCycle.name}</p>
          <p className="text-sm text-blue-600 mt-1">
            Période d'évaluation : du {new Date(upcomingCycle.startDate).toLocaleDateString()} au {new Date(upcomingCycle.endDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-blue-500 mt-2">
            Ouverture le <span className="font-semibold">{new Date(upcomingCycle.reviewStartDate).toLocaleDateString()}</span> — vous pourrez commencer votre auto-évaluation à partir de cette date.
          </p>
        </div>
      )}

      {/* Cycle actif mais aucune évaluation créée pour l'instant */}
      {activeCycle && !myReview && (
        <div className="bg-primary-light/30 border border-primary/10 rounded-2xl p-6 text-center">
          <FileText size={40} className="mx-auto text-primary mb-3" />
          <p className="text-slate-700 font-medium mb-3">Un cycle d'évaluation est ouvert. Commencez votre auto-évaluation dès maintenant.</p>
          <button
            onClick={handleCreateAndOpen}
            disabled={isProcessing || readOnly}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Commencer l'auto-évaluation
          </button>
        </div>
      )}

      {/* Formulaire d'évaluation actif */}
      {myReview && (
        <div className="space-y-4">
          {/* Présences & Congés */}
          <AttendanceLeaveCard
            attendance={myReview.attendanceSummary}
            leave={myReview.leaveSummary}
          />

          {/* Compétences d'auto-évaluation */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Auto-évaluation</h3>
            <div className="space-y-3">
              {competencies.map(comp => (
                <CompetencyRatingCard
                  key={comp.id}
                  competencyName={comp.name}
                  description={comp.description}
                  behaviors={comp.behaviors}
                  rating={canSubmit ? (ratings[comp.id]?.rating || 0) : (myReview.selfRatings.find(r => r.competencyId === comp.id)?.rating || 0)}
                  comment={canSubmit ? (ratings[comp.id]?.comment || '') : (myReview.selfRatings.find(r => r.competencyId === comp.id)?.comment || '')}
                  onRatingChange={canSubmit ? (v) => updateRating(comp.id, v) : undefined}
                  onCommentChange={canSubmit ? (v) => updateComment(comp.id, v) : undefined}
                  readOnly={!canSubmit}
                  label="Personnel"
                  ratingScale={ratingScale}
                />
              ))}
            </div>
          </div>

          {/* Notes du manager (visibles après l'évaluation du manager) */}
          {(myReview.status === 'MANAGER_REVIEWED' || myReview.status === 'COMPLETED') && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Évaluation du manager</h3>
              <div className="space-y-3">
                {myReview.managerRatings.filter(r => r.rating > 0).map(mRating => {
                  const comp = resolveCompetency(mRating.competencyId);
                  return (
                    <CompetencyRatingCard
                      key={mRating.competencyId}
                      competencyName={comp.name}
                      description={comp.description}
                      behaviors={comp.behaviors}
                      rating={mRating.rating}
                      comment={mRating.comment}
                      readOnly
                      label="Manager"
                      ratingScale={ratingScale}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Remarques finales des RH (visibles une fois complété) */}
          {myReview.status === 'COMPLETED' && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-green-600" />
                <h3 className="font-semibold text-green-800">Évaluation finale</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-green-600 font-medium mb-1">Note globale</p>
                  <p className="font-bold text-green-900">{myReview.hrOverallRating?.replace(/_/g, ' ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium mb-1">Moyenne personnelle</p>
                  <p className="font-bold text-green-900">{avgRating(myReview.selfRatings)}</p>
                </div>
              </div>
              {myReview.hrFinalRemarks && (
                <div className="mt-3">
                  <p className="text-xs text-green-600 font-medium mb-1">Remarques des RH</p>
                  <p className="text-sm text-green-800">{myReview.hrFinalRemarks}</p>
                </div>
              )}
            </div>
          )}

          {/* Bouton de soumission */}
          {canSubmit && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !allRated}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Soumettre l'auto-évaluation
              </button>
            </div>
          )}
          {canSubmit && !allRated && (
            <p className="text-xs text-slate-400 text-right">Veuillez noter l'ensemble des {competencies.length} compétences avant de soumettre.</p>
          )}
        </div>
      )}

      {/* Historique des évaluations passées */}
      {pastReviews.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Évaluations passées ({pastReviews.length})
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {pastReviews.map(review => (
                <div
                  key={review.id}
                  className="bg-white border border-slate-100 rounded-xl p-4 cursor-pointer hover:border-slate-200 transition-colors"
                  onClick={() => setExpandedHistoryId(expandedHistoryId === review.id ? null : review.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-slate-900">Cycle : {cycles?.find(c => c.id === review.cycleId)?.name || review.cycleId}</p>
                      <p className="text-xs text-slate-400">Moyenne perso. : {avgRating(review.selfRatings)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(review.status === 'MANAGER_REVIEWED' || review.status === 'COMPLETED') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); generateReviewPdf(review); }}
                          disabled={generatingPdfId === review.id}
                          className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                          title="Télécharger le PDF"
                        >
                          {generatingPdfId === review.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                      )}
                      <ReviewStatusBadge status={review.status} />
                    </div>
                  </div>
                  {expandedHistoryId === review.id && (
                    <div className="mt-3 pt-3 border-t border-slate-50">
                      <AttendanceLeaveCard attendance={review.attendanceSummary} leave={review.leaveSummary} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeReviewModule;