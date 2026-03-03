import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type Locale = "en" | "es" | "fr" | "de" | "pt";

export const SUPPORTED_LOCALES: {
  code: Locale;
  label: string;
  flag: string;
}[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

type TranslationKey = string;
type Translations = Record<TranslationKey, string>;
type LocaleTranslations = Record<Locale, Translations>;

// English as the base/fallback language
const translations: LocaleTranslations = {
  en: {
    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.loading": "Loading...",
    "common.noResults": "No results found",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.close": "Close",
    "common.copy": "Copy",
    "common.copied": "Copied!",
    // Auth
    "auth.signIn": "Sign In",
    "auth.signOut": "Sign Out",
    "auth.welcome": "Welcome",
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.tasks": "Tasks",
    "nav.contacts": "Contacts",
    "nav.blog": "Blog",
    "nav.settings": "Settings",
    "nav.agents": "Agents",
    "nav.workflows": "Workflows",
    "nav.prompts": "Prompts",
    "nav.infrastructure": "Infrastructure",
    "nav.metrics": "Metrics",
    "nav.calendar": "Calendar",
    // Desktop
    "desktop.missionControl": "Mission Control",
    "desktop.noOpenWindows": "No open windows",
    "desktop.newFolder": "New Folder",
    "desktop.changeWallpaper": "Change Wallpaper...",
    "desktop.refresh": "Refresh",
    "desktop.switchClassic": "Switch to Classic Mode",
    "desktop.viewSite": "View Site",
    "desktop.aboutWorkspace": "About this workspace",
    "desktop.maxWindows":
      "Maximum of 10 windows open. Close a window to open a new one.",
    // Tasks
    "tasks.title": "Tasks",
    "tasks.newTask": "New Task",
    "tasks.noTasks": "No tasks yet",
    "tasks.createFirst": "Create your first task to get started.",
    // Settings
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.notifications": "Notifications",
  },
  es: {
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.create": "Crear",
    "common.search": "Buscar",
    "common.filter": "Filtrar",
    "common.loading": "Cargando...",
    "common.noResults": "No se encontraron resultados",
    "common.confirm": "Confirmar",
    "common.back": "Atrás",
    "common.next": "Siguiente",
    "common.close": "Cerrar",
    "common.copy": "Copiar",
    "common.copied": "¡Copiado!",
    "auth.signIn": "Iniciar sesión",
    "auth.signOut": "Cerrar sesión",
    "auth.welcome": "Bienvenido",
    "nav.dashboard": "Panel",
    "nav.tasks": "Tareas",
    "nav.contacts": "Contactos",
    "nav.blog": "Blog",
    "nav.settings": "Configuración",
    "nav.agents": "Agentes",
    "nav.workflows": "Flujos de trabajo",
    "nav.prompts": "Prompts",
    "nav.infrastructure": "Infraestructura",
    "nav.metrics": "Métricas",
    "nav.calendar": "Calendario",
    "desktop.missionControl": "Centro de control",
    "desktop.noOpenWindows": "No hay ventanas abiertas",
    "desktop.newFolder": "Nueva carpeta",
    "desktop.changeWallpaper": "Cambiar fondo...",
    "desktop.refresh": "Actualizar",
    "desktop.switchClassic": "Cambiar a modo clásico",
    "desktop.viewSite": "Ver sitio",
    "desktop.aboutWorkspace": "Sobre este espacio",
    "desktop.maxWindows":
      "Máximo de 10 ventanas abiertas. Cierra una ventana para abrir una nueva.",
    "tasks.title": "Tareas",
    "tasks.newTask": "Nueva tarea",
    "tasks.noTasks": "Aún no hay tareas",
    "tasks.createFirst": "Crea tu primera tarea para empezar.",
    "settings.title": "Configuración",
    "settings.language": "Idioma",
    "settings.theme": "Tema",
    "settings.notifications": "Notificaciones",
  },
  fr: {
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.create": "Créer",
    "common.search": "Rechercher",
    "common.filter": "Filtrer",
    "common.loading": "Chargement...",
    "common.noResults": "Aucun résultat",
    "common.confirm": "Confirmer",
    "common.back": "Retour",
    "common.next": "Suivant",
    "common.close": "Fermer",
    "common.copy": "Copier",
    "common.copied": "Copié !",
    "auth.signIn": "Se connecter",
    "auth.signOut": "Se déconnecter",
    "auth.welcome": "Bienvenue",
    "nav.dashboard": "Tableau de bord",
    "nav.tasks": "Tâches",
    "nav.contacts": "Contacts",
    "nav.blog": "Blog",
    "nav.settings": "Paramètres",
    "nav.agents": "Agents",
    "nav.workflows": "Flux de travail",
    "nav.prompts": "Prompts",
    "nav.infrastructure": "Infrastructure",
    "nav.metrics": "Métriques",
    "nav.calendar": "Calendrier",
    "desktop.missionControl": "Centre de contrôle",
    "desktop.noOpenWindows": "Aucune fenêtre ouverte",
    "tasks.title": "Tâches",
    "tasks.newTask": "Nouvelle tâche",
    "settings.title": "Paramètres",
    "settings.language": "Langue",
    "settings.theme": "Thème",
    "settings.notifications": "Notifications",
  },
  de: {
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.delete": "Löschen",
    "common.edit": "Bearbeiten",
    "common.create": "Erstellen",
    "common.search": "Suchen",
    "common.loading": "Laden...",
    "common.noResults": "Keine Ergebnisse gefunden",
    "auth.signIn": "Anmelden",
    "auth.signOut": "Abmelden",
    "auth.welcome": "Willkommen",
    "nav.dashboard": "Dashboard",
    "nav.tasks": "Aufgaben",
    "nav.contacts": "Kontakte",
    "nav.settings": "Einstellungen",
    "tasks.title": "Aufgaben",
    "tasks.newTask": "Neue Aufgabe",
    "settings.title": "Einstellungen",
    "settings.language": "Sprache",
  },
  pt: {
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.delete": "Excluir",
    "common.edit": "Editar",
    "common.create": "Criar",
    "common.search": "Pesquisar",
    "common.loading": "Carregando...",
    "common.noResults": "Nenhum resultado encontrado",
    "auth.signIn": "Entrar",
    "auth.signOut": "Sair",
    "auth.welcome": "Bem-vindo",
    "nav.dashboard": "Painel",
    "nav.tasks": "Tarefas",
    "nav.contacts": "Contatos",
    "nav.settings": "Configurações",
    "tasks.title": "Tarefas",
    "tasks.newTask": "Nova tarefa",
    "settings.title": "Configurações",
    "settings.language": "Idioma",
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = "app-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored as Locale]) return stored as Locale;
    // Try browser language
    const browserLang = navigator.language.split("-")[0] as Locale;
    if (translations[browserLang]) return browserLang;
    return "en";
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>): string => {
      let text = translations[locale]?.[key] || translations.en[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, v);
        });
      }
      return text;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
