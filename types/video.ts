export type BackgroundType = "solid" | "gradient" | "image" | "video";
export type TextEntryAnimation = "fade" | "slideUp" | "typewriter" | "wordByWord";
export type TransitionStyle = "fade" | "slideLeft" | "wipe" | "zoom";
export type VideoFormat = "9:16" | "1:1" | "16:9";

export interface Verse {
  id: string;
  text: string;
  translation: string;
  reference?: string;
  /** Override de durée en secondes ; sinon calcul auto. */
  durationSec?: number;
  /** Audio de récitation propre à ce verset (ex. import Quran.com), joué pendant son slide. */
  audioUrl?: string;
  /** Image de fond spécifique à ce verset (ex. recherche web automatique), prioritaire sur design.background. */
  backgroundImageUrl?: string;
}

export interface BackgroundConfig {
  type: BackgroundType;
  /** 1 couleur = fond uni, 2+ = dégradé. */
  colors: string[];
  /** URL du média pour type "image" / "video" (ex. /uploads/xxx.jpg). */
  mediaUrl?: string;
  /** Effet de zoom lent sur l'image/vidéo de fond. */
  kenBurns?: boolean;
}

export interface AudioConfig {
  musicUrl?: string;
  ambienceUrl?: string;
  musicVolume: number;
  ambienceVolume: number;
}

export interface DesignConfig {
  format: VideoFormat;
  background: BackgroundConfig;
  textColor: string;
  /** Couleur du texte du verset (arabe/texte principal) ; si absent, utilise textColor. */
  verseTextColor?: string;
  accentColor: string;
  /** Logo affiché en haut de chaque slide (optionnel). */
  logoUrl?: string;
  mainFontFamily: string;
  mainFontUrl?: string;
  translationFontFamily: string;
  translationFontUrl?: string;
  mainRTL: boolean;
  textEntry: TextEntryAnimation;
  transition: TransitionStyle;
  transitionDurationMs: number;
  showReference: boolean;
  attribution?: string;
  pageName?: string;
  audio: AudioConfig;
  /** Durée par verset en secondes, ou calcul automatique depuis la longueur du texte. */
  secondsPerVerse: number | "auto";
  /** Si actif, utilise Verse.backgroundImageUrl (image web par verset) quand disponible. */
  autoBackgroundEnabled?: boolean;
  /** Écran de couverture (logo + nom de page) au tout début de la vidéo. */
  showCoverSlide?: boolean;
  coverDurationSec?: number;
  /** Multiplicateur de taille du logo sur l'écran de couverture (défaut 1). */
  coverLogoScale?: number;
  /** Multiplicateur de taille du titre sur l'écran de couverture (défaut 1). */
  coverTitleScale?: number;
  /** Marges générales du slide (en-tête, haut/bas du contenu) ; défaut 1. */
  marginScale?: number;
  /** Multiplicateur de taille du logo dans l'en-tête des slides (défaut 1). */
  logoScale?: number;
  /** Taille et interligne réglables séparément pour le verset et la traduction. */
  verseTextScale?: number;
  translationTextScale?: number;
  verseLineHeight?: number;
  translationLineHeight?: number;
  /** Minuteur circulaire sous la traduction, qui décompte le temps restant du verset affiché. */
  showCountdownTimer?: boolean;
  countdownScale?: number;
}

export const DEFAULT_VERSE_LINE_HEIGHT = 1.6;
export const DEFAULT_TRANSLATION_LINE_HEIGHT = 1.5;

export const DEFAULT_COVER_DURATION_SEC = 3;

/** Un écran de couverture n'a de sens que s'il y a un logo ou un nom de page à montrer. */
export function hasCoverContent(design: DesignConfig): boolean {
  return Boolean(design.showCoverSlide && (design.logoUrl || design.pageName));
}

export interface VideoProject {
  verses: Verse[];
  design: DesignConfig;
}

export const FORMAT_DIMENSIONS: Record<VideoFormat, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export interface FontOption {
  label: string;
  family: string;
  /** Chemin relatif au dossier public/, sans slash initial (compatible staticFile). */
  file: string;
  rtl: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  { label: "Amiri (arabe)", family: "Amiri", file: "fonts/Amiri-Regular.ttf", rtl: true },
  {
    label: "KFGQPC Uthmanic Hafs (arabe)",
    family: "UthmanicHafs",
    file: "fonts/KFGQPC Uthmanic Script HAFS Regular.otf",
    rtl: true,
  },
  { label: "Poppins (latin)", family: "Poppins", file: "fonts/Poppins-Regular.ttf", rtl: false },
  {
    label: "Scheherazade New (arabe)",
    family: "ScheherazadeNew",
    file: "fonts/ScheherazadeNew-Regular.ttf",
    rtl: true,
  },
  { label: "Lateef (arabe)", family: "Lateef", file: "fonts/Lateef-Regular.ttf", rtl: true },
  { label: "Reem Kufi (arabe, kufique)", family: "ReemKufi", file: "fonts/ReemKufi-Regular.ttf", rtl: true },
  { label: "Aref Ruqaa (arabe, calligraphié)", family: "ArefRuqaa", file: "fonts/ArefRuqaa-Regular.ttf", rtl: true },
  {
    label: "Playfair Display (latin, élégant)",
    family: "PlayfairDisplay",
    file: "fonts/PlayfairDisplay-Regular.ttf",
    rtl: false,
  },
  { label: "Lora (latin, serif)", family: "Lora", file: "fonts/Lora-Regular.ttf", rtl: false },
  { label: "Montserrat (latin, moderne)", family: "Montserrat", file: "fonts/Montserrat-Regular.ttf", rtl: false },
  {
    label: "Merriweather (latin, lisible)",
    family: "Merriweather",
    file: "fonts/Merriweather-Regular.ttf",
    rtl: false,
  },
];

const WORDS_PER_SECOND = 2;
const MIN_DURATION_SEC = 3;
const MAX_DURATION_SEC = 12;

export function estimateDurationSec(text: string, translation: string): number {
  const words = `${text} ${translation}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_DURATION_SEC, Math.min(MAX_DURATION_SEC, Math.round(words / WORDS_PER_SECOND)));
}

export function resolveVerseDurationSec(verse: Verse, design: DesignConfig): number {
  if (verse.durationSec) return verse.durationSec;
  if (design.secondsPerVerse === "auto") return estimateDurationSec(verse.text, verse.translation);
  return design.secondsPerVerse;
}

/** Durée totale de la composition en frames, en tenant compte du chevauchement des transitions. */
export function calculateTotalDurationInFrames(verses: Verse[], design: DesignConfig, fps: number): number {
  const transitionFrames = Math.round((design.transitionDurationMs / 1000) * fps);
  const versesFrames = verses.reduce((sum, verse, i) => {
    const frames = Math.round(resolveVerseDurationSec(verse, design) * fps);
    return sum + frames - (i > 0 ? transitionFrames : 0);
  }, 0);

  const withCover = hasCoverContent(design);
  const coverFrames = withCover ? Math.round((design.coverDurationSec ?? DEFAULT_COVER_DURATION_SEC) * fps) : 0;
  const coverOverlap = withCover && verses.length > 0 ? transitionFrames : 0;

  return Math.max(coverFrames + versesFrames - coverOverlap, fps);
}

export function createVerseId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultDesign(): DesignConfig {
  return {
    format: "9:16",
    background: { type: "gradient", colors: ["#395778", "#051234"], kenBurns: true },
    textColor: "#ffffff",
    accentColor: "#d4af37",
    mainFontFamily: "Amiri",
    translationFontFamily: "Poppins",
    mainRTL: true,
    textEntry: "fade",
    transition: "fade",
    transitionDurationMs: 500,
    showReference: true,
    attribution: "",
    pageName: "",
    audio: { musicVolume: 0.5, ambienceVolume: 0.3 },
    secondsPerVerse: "auto",
    showCoverSlide: true,
    coverDurationSec: DEFAULT_COVER_DURATION_SEC,
  };
}

/** Jeu de versets de démonstration (arabe RTL), repris du prototype initial. */
export function demoProjectArabic(): VideoProject {
  return {
    verses: [
      {
        id: "demo-ar-1",
        text: "وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا",
        translation: "Ton Seigneur a décrété : n'adorez que Lui, et soyez bons envers vos parents.",
        reference: "Sourate Al-Isra • 17:23",
      },
      {
        id: "demo-ar-2",
        text: "فَلَا تَقُل لَّهُمَا أُفٍّ وَلَا تَنْهَرْهُمَا وَقُل لَّهُمَا قَوْلًا كَرِيمًا",
        translation: "Ne leur dis pas « ouf », ne les repousse pas, et adresse-leur des paroles respectueuses.",
        reference: "Sourate Al-Isra • 17:23",
      },
      {
        id: "demo-ar-3",
        text: "وَاخْفِضْ لَهُمَا جَنَاحَ الذُّلِّ مِنَ الرَّحْمَةِ",
        translation: "Abaisse pour eux l'aile de l'humilité, par miséricorde.",
        reference: "Sourate Al-Isra • 17:24",
      },
      {
        id: "demo-ar-4",
        text: "وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        translation: "Et dis : « Seigneur, fais-leur miséricorde, comme ils m'ont élevé tout petit. »",
        reference: "Sourate Al-Isra • 17:24",
      },
    ],
    design: {
      ...defaultDesign(),
      attribution: "Le Noble Coran",
      pageName: "versets_de_lumiere",
      logoUrl: "/branding/logo.png",
    },
  };
}

/** Jeu de démonstration générique (latin LTR), pour prouver que l'outil n'est pas lié à une langue. */
export function demoProjectLatin(): VideoProject {
  return {
    verses: [
      {
        id: "demo-fr-1",
        text: "La vie est un mystère qu'il faut vivre, et non un problème qu'il faut résoudre.",
        translation: "Gandhi",
        reference: "Citation",
      },
      {
        id: "demo-fr-2",
        text: "Le bonheur n'est pas une destination, c'est une façon de voyager.",
        translation: "Margaret Lee Runbeck",
        reference: "Citation",
      },
      {
        id: "demo-fr-3",
        text: "Ce que nous faisons de notre vie est notre cadeau à Dieu.",
        translation: "Mère Teresa",
        reference: "Citation",
      },
    ],
    design: {
      ...defaultDesign(),
      mainRTL: false,
      mainFontFamily: "Poppins",
      textEntry: "slideUp",
      transition: "slideLeft",
      background: { type: "gradient", colors: ["#1f2937", "#111827"], kenBurns: true },
    },
  };
}
