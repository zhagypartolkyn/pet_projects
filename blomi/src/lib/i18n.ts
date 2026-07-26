export type Lang = "en" | "es" | "fr" | "ru";

export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "ru", label: "Русский" },
];

const dict = {
  en: {
    appName: "Blomi",
    tagline: "A monthly to-do list that flows with your cycle.",
    plan: "Plan",
    cycle: "Cycle",
    profile: "Profile",
    signIn: "Sign in",
    signUp: "Create account",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    name: "Name",
    age: "Age",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    cycleLength: "Average cycle length (days)",
    periodLength: "Period length (days)",
    lastPeriod: "First day of your last period",
    save: "Save",
    add: "Add task",
    yourTasks: "Your tasks this month",
    taskTitle: "Task",
    details: "Details (optional)",
    category: "Category",
    intensity: "Intensity",
    intensityLow: "Low",
    intensityMed: "Medium",
    intensityHigh: "High",
    generate: "Plan my month with AI",
    generating: "Planning…",
    monthly: "Monthly calendar",
    currentPhase: "You are in",
    today: "Today",
    empty: "No tasks yet — add a few and let AI arrange them.",
    noCycle: "Set your cycle info in the Cycle tab first.",
    signInHint: "Welcome back",
    signUpHint: "Start tracking beautifully",
    toggleAuth: "Need an account?",
    toggleAuthBack: "Already have an account?",
  },
} as const;

export function t(_lang: Lang, key: keyof typeof dict.en): string {
  return dict.en[key];
}
