import { AppConfig, CustomCompetency, CustomLeaveType, OrgReviewConfig, OrgNotificationConfig, UserNotificationPreferences } from './types';

export const DEPARTMENTS = [
  "Ingénierie",
  "Ressources humaines",
  "Finance",
  "Opérations",
  "Marketing",
  "Ventes",
  "Produit",
  "Usine"
];

export const DESIGNATIONS = [
  "Développeur senior",
  "Développeur junior",
  "Responsable RH",
  "Responsable des opérations",
  "Associé financier",
  "Spécialiste marketing",
  "Concepteur UX",
  "Superviseur d'usine",
  "Technicien de terrain"
];

export const OFFICE_LOCATIONS = [
  { name: "Siège de Dhaka (Gulshan)", lat: 23.7925, lng: 90.4078, radius: 500 },
  { name: "Agence de Chittagong", lat: 22.3569, lng: 91.7832, radius: 500 },
  { name: "Centre technologique de Sylhet", lat: 24.8949, lng: 91.8687, radius: 500 },
  { name: "Zone industrielle", lat: 23.9999, lng: 90.5000, radius: 2000 },
  { name: "Bureau distant", lat: 0, lng: 0, radius: 9999999 }
];

export const DEFAULT_COMPETENCIES: CustomCompetency[] = [
  {
    id: 'AGILITY',
    name: 'Agilité',
    description: "S'adapte rapidement aux priorités changeantes et pilote une gestion transparente du changement.",
    behaviors: ['Transparence dans le changement', 'Implication des autres dans les décisions', "Création d'équipes flexibles", 'Prise de décision rapide'],
  },
  {
    id: 'COLLABORATION',
    name: 'Collaboration',
    description: 'Travaille efficacement au sein des équipes, partage les connaissances et instaure la confiance.',
    behaviors: ['Partage des connaissances', 'Renforcement des réseaux', "Accueil de la diversité d'opinions", 'Instauration de la confiance'],
  },
  {
    id: 'CUSTOMER_FOCUS',
    name: 'Orientation client',
    description: 'Comprend et anticipe les besoins des clients pour offrir une valeur exceptionnelle.',
    behaviors: ['Compréhension des besoins des clients', 'Établissement de relations', 'Participation au dialogue numérique', 'Confirmation de la satisfaction'],
  },
  {
    id: 'DEVELOPING_OTHERS',
    name: 'Développement des autres',
    description: "Investit dans la croissance des membres de l'équipe par le coaching, le feedback et des opportunités de développement.",
    behaviors: ["Motivation de l'équipe", 'Définition des priorités de développement', 'Fourniture de retours constructifs', 'Évaluation des capacités'],
  },
  {
    id: 'GLOBAL_MINDSET',
    name: 'Esprit mondial',
    description: "Réfléchit globalement à l'impact sur l'entreprise et s'adapte à divers contextes culturels.",
    behaviors: ["Compréhension à l'échelle de l'entreprise", 'Sensibilisation aux répercussions', 'Adaptation culturelle', 'Pensée transversale'],
  },
  {
    id: 'INNOVATION_MINDSET',
    name: "Esprit d'innovation",
    description: "Encourage l'expérimentation, accueille de nouvelles idées et pilote des solutions créatives.",
    behaviors: ['Prototypage rapide', 'Partage ouvert des idées', "Encouragement de l'expérimentation", 'Expression créative'],
  },
];

// Conserver l'ancien nom comme alias pour la rétrocompatibilité pendant la transition
export const PERFORMANCE_COMPETENCIES = DEFAULT_COMPETENCIES;

export const DEFAULT_RATING_SCALE: {
  value: number;
  label: string;
  color: string;
}[] = [
  { value: 1, label: 'Nécessite une amélioration significative', color: 'bg-red-500' },
  { value: 2, label: 'En deçà des attentes', color: 'bg-orange-500' },
  { value: 3, label: 'Répond aux attentes', color: 'bg-yellow-500' },
  { value: 4, label: 'Dépasse les attentes', color: 'bg-blue-500' },
  { value: 5, label: 'Exceptionnel', color: 'bg-green-500' },
];

export const RATING_SCALE = DEFAULT_RATING_SCALE;

export const DEFAULT_OVERALL_RATINGS: {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-500' },
  { value: 'VERY_GOOD', label: 'Très bon', color: 'bg-blue-500' },
  { value: 'GOOD', label: 'Bon', color: 'bg-yellow-500' },
  { value: 'NEEDS_IMPROVEMENT', label: 'À améliorer', color: 'bg-orange-500' },
  { value: 'UNSATISFACTORY', label: 'Insatisfaisant', color: 'bg-red-500' },
];

export const HR_OVERALL_RATINGS = DEFAULT_OVERALL_RATINGS;

export const DEFAULT_LEAVE_TYPES: CustomLeaveType[] = [
  { id: 'ANNUEL', name: 'Congé annuel', color: 'bg-primary', hasBalance: true },
  { id: 'OCCASIONNEL', name: 'Congé occasionnel', color: 'bg-emerald-500', hasBalance: true },
  { id: 'MALADIE', name: 'Congé maladie', color: 'bg-rose-500', hasBalance: true },
  { id: 'MATERNITE', name: 'Congé de maternité', color: 'bg-pink-500', hasBalance: false },
  { id: 'PATERNITE', name: 'Congé de paternité', color: 'bg-indigo-500', hasBalance: false },
  { id: 'ACQUIS', name: 'Congé acquis', color: 'bg-amber-500', hasBalance: false },
  { id: 'NON_REMUNERE', name: 'Congé non rémunéré', color: 'bg-slate-500', hasBalance: false },
];

export const DEFAULT_REVIEW_CONFIG: OrgReviewConfig = {
  competencies: DEFAULT_COMPETENCIES,
  ratingScale: {
    min: 1,
    max: 5,
    labels: DEFAULT_RATING_SCALE,
  },
  overallRatings: DEFAULT_OVERALL_RATINGS,
};

export const DEFAULT_NOTIFICATION_CONFIG: OrgNotificationConfig = {
  enabledTypes: ['ANNOUNCEMENT', 'LEAVE', 'ATTENDANCE', 'REVIEW', 'SYSTEM'],
  emailDigestFrequency: 'IMMEDIATE',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

export const DEFAULT_USER_NOTIFICATION_PREFS: UserNotificationPreferences = {
  mutedTypes: [],
  emailDigestFrequency: 'IMMEDIATE',
};

export const TIMEZONE_OPTIONS = [
  { group: "UTC", zones: [
    { label: "UTC (GMT+0)", value: "UTC" },
  ]},
  { group: "Africa", zones: [
    { label: "Africa/Cairo (GMT+2)", value: "Africa/Cairo" },
    { label: "Africa/Johannesburg (GMT+2)", value: "Africa/Johannesburg" },
    { label: "Africa/Lagos (GMT+1)", value: "Africa/Lagos" },
    { label: "Africa/Nairobi (GMT+3)", value: "Africa/Nairobi" },
  ]},
  { group: "America", zones: [
    { label: "America/Argentina/Buenos_Aires (GMT-3)", value: "America/Argentina/Buenos_Aires" },
    { label: "America/Mexico_City (GMT-6)", value: "America/Mexico_City" },
    { label: "America/New_York (GMT-5)", value: "America/New_York" },
    { label: "America/Sao_Paulo (GMT-3)", value: "America/Sao_Paulo" },
    { label: "America/Toronto (GMT-5)", value: "America/Toronto" },
  ]},
  { group: "Asia", zones: [
    { label: "Asia/Bahrain (GMT+3)", value: "Asia/Bahrain" },
    { label: "Asia/Bangkok (GMT+7)", value: "Asia/Bangkok" },
    { label: "Asia/Colombo (GMT+5:30)", value: "Asia/Colombo" },
    { label: "Asia/Dhaka (GMT+6)", value: "Asia/Dhaka" },
    { label: "Asia/Dubai (GMT+4)", value: "Asia/Dubai" },
    { label: "Asia/Ho_Chi_Minh (GMT+7)", value: "Asia/Ho_Chi_Minh" },
    { label: "Asia/Hong_Kong (GMT+8)", value: "Asia/Hong_Kong" },
    { label: "Asia/Jakarta (GMT+7)", value: "Asia/Jakarta" },
    { label: "Asia/Jerusalem (GMT+2)", value: "Asia/Jerusalem" },
    { label: "Asia/Karachi (GMT+5)", value: "Asia/Karachi" },
    { label: "Asia/Kathmandu (GMT+5:45)", value: "Asia/Kathmandu" },
    { label: "Asia/Kolkata (GMT+5:30)", value: "Asia/Kolkata" },
    { label: "Asia/Kuala_Lumpur (GMT+8)", value: "Asia/Kuala_Lumpur" },
    { label: "Asia/Kuwait (GMT+3)", value: "Asia/Kuwait" },
    { label: "Asia/Manila (GMT+8)", value: "Asia/Manila" },
    { label: "Asia/Muscat (GMT+4)", value: "Asia/Muscat" },
    { label: "Asia/Qatar (GMT+3)", value: "Asia/Qatar" },
    { label: "Asia/Riyadh (GMT+3)", value: "Asia/Riyadh" },
    { label: "Asia/Seoul (GMT+9)", value: "Asia/Seoul" },
    { label: "Asia/Shanghai (GMT+8)", value: "Asia/Shanghai" },
    { label: "Asia/Singapore (GMT+8)", value: "Asia/Singapore" },
    { label: "Asia/Taipei (GMT+8)", value: "Asia/Taipei" },
    { label: "Asia/Tokyo (GMT+9)", value: "Asia/Tokyo" },
  ]},
  { group: "Australia", zones: [
    { label: "Australia/Sydney (GMT+10)", value: "Australia/Sydney" },
  ]},
  { group: "Europe", zones: [
    { label: "Europe/Amsterdam (GMT+1)", value: "Europe/Amsterdam" },
    { label: "Europe/Berlin (GMT+1)", value: "Europe/Berlin" },
    { label: "Europe/Brussels (GMT+1)", value: "Europe/Brussels" },
    { label: "Europe/Copenhagen (GMT+1)", value: "Europe/Copenhagen" },
    { label: "Europe/Dublin (GMT+0)", value: "Europe/Dublin" },
    { label: "Europe/Helsinki (GMT+2)", value: "Europe/Helsinki" },
    { label: "Europe/Istanbul (GMT+3)", value: "Europe/Istanbul" },
    { label: "Europe/London (GMT+0)", value: "Europe/London" },
    { label: "Europe/Madrid (GMT+1)", value: "Europe/Madrid" },
    { label: "Europe/Oslo (GMT+1)", value: "Europe/Oslo" },
    { label: "Europe/Paris (GMT+1)", value: "Europe/Paris" },
    { label: "Europe/Rome (GMT+1)", value: "Europe/Rome" },
    { label: "Europe/Stockholm (GMT+1)", value: "Europe/Stockholm" },
    { label: "Europe/Vienna (GMT+1)", value: "Europe/Vienna" },
    { label: "Europe/Zurich (GMT+1)", value: "Europe/Zurich" },
  ]},
  { group: "Pacific", zones: [
    { label: "Pacific/Auckland (GMT+12)", value: "Pacific/Auckland" },
  ]},
];

export const DEFAULT_CONFIG: AppConfig = {
  companyName: "OpenHRApp Solutions Ltd.",
  timezone: "UTC",
  currency: "USD",
  dateFormat: "DD/MM/YYYY",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Sunday"],
  officeStartTime: "09:00",
  officeEndTime: "18:00",
  lateGracePeriod: 5,
  earlyOutGracePeriod: 15,
  defaultReportRecipient: "",
  dutyLabel1: "Bureau",
  dutyLabel2: "Usine"
};