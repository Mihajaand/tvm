import React from 'react';
import { BookOpen, CheckCircle2, ShieldAlert, User, Briefcase, Building } from 'lucide-react';
import { Role } from '../../types';

interface Props {
  role: Role;
}

export const LeaveGuidelines: React.FC<Props> = ({ role }) => {
  const getGuidelines = () => {
    switch (role) {
      case 'EMPLOYEE':
        return {
          title: 'Directives pour les employés',
          icon: User,
          color: 'bg-primary-light text-primary',
          rules: [
            "Assurez-vous d'avoir un solde de congés suffisant avant de faire une demande.",
            "Les congés de circonstance ou exceptionnels doivent si possible être demandés 2 jours à l'avance.",
            "Un certificat médical est requis pour un congé de maladie supérieur à 3 jours.",
            "Votre chef d'équipe ou responsable hiérarchique direct doit approuver la demande avant la validation par les RH."
          ]
        };
      case 'TEAM_LEAD':
      case 'MANAGER':
        return {
          title: 'Directives managériales',
          icon: Briefcase,
          color: 'bg-primary-light text-primary',
          rules: [
            "Examinez la demande de congé de votre subordonné direct dans les 24 heures.",
            "Assurez-vous que l'effectif de l'équipe est suffisant avant d'approuver les dates.",
            "Les approbations transmettent automatiquement la demande aux RH pour documentation.",
            "Les refus sont définitifs et notifient immédiatement l'employé."
          ]
        };
      case 'MANAGEMENT':
        return {
          title: 'Directives de la direction',
          icon: ShieldAlert,
          color: 'bg-primary-light text-primary',
          rules: [
            "Supervisez les tendances de congés des managers et chefs d'équipe.",
            "L'autorité d'approbation prime sur les décisions des niveaux inférieurs si nécessaire.",
            "Garantissez la disponibilité de l'ensemble du département pendant les phases critiques des projets."
          ]
        };
      case 'HR':
      case 'ADMIN':
        return {
          title: 'Politique RH et conformité',
          icon: Building,
          color: 'bg-emerald-50 text-emerald-600',
          rules: [
            "Vérifiez les soldes de congés par rapport au quota annuel.",
            "Vérifiez la présence des pièces justificatives (ex. : certificats médicaux).",
            "C'est la dernière étape ; les congés 'Approuvés' sont déduits du solde.",
            "Vous pouvez passer outre l'approbation d'un manager en cas de violation de la politique."
          ]
        };
      default:
        return {
          title: 'Politique générale',
          icon: BookOpen,
          color: 'bg-slate-50 text-slate-600',
          rules: ["Veuillez respecter la politique de l'entreprise à tout moment."]
        };
    }
  };

  const guide = getGuidelines();
  const Icon = guide.icon;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm mb-8 animate-in slide-in-from-top-4">
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 rounded-2xl ${guide.color}`}>
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-tight">{guide.title}</h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Veuillez consulter ceci avant de continuer</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guide.rules.map((rule, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
            <CheckCircle2 size={16} className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{rule}</p>
          </div>
        ))}
      </div>
    </div>
  );
};