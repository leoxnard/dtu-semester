/** DTU corporate palette — designguide.dtu.dk/colours */
export const DTU = {
  red: "#990000",
  blue: "#2F3EEA",
  brightGreen: "#1FD082",
  navy: "#030F4F",
  yellow: "#F6D04D",
  orange: "#FC7634",
  pink: "#F7BBB1",
  grey: "#DADADA",
  redLight: "#E83F48",
  green: "#008835",
  purple: "#79238E",
} as const;

/** Colours assigned to courses, in order. Navy/red are reserved for chrome. */
export const COURSE_COLOURS = [
  DTU.blue,
  DTU.green,
  DTU.orange,
  DTU.purple,
  DTU.brightGreen,
  DTU.redLight,
  DTU.yellow,
] as const;

export type SlotLabel = "8-12" | "13-17" | "18-22";
export const SLOTS: { label: SlotLabel; startHour: number; endHour: number }[] = [
  { label: "8-12", startHour: 8, endHour: 12 },
  { label: "13-17", startHour: 13, endHour: 17 },
  { label: "18-22", startHour: 18, endHour: 22 },
];

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * DTU's fixed autumn module grid. A course's placement (E2A, E7, ...) maps to
 * exactly one weekday + slot, so we can label any derived slot with its module.
 */
export const AUTUMN_MODULE_GRID: Record<Weekday, Partial<Record<SlotLabel, string>>> = {
  Monday: { "8-12": "E1A", "13-17": "E2A" },
  Tuesday: { "8-12": "E3A", "13-17": "E4A", "18-22": "E7" },
  Wednesday: { "8-12": "E5A", "13-17": "E5B" },
  Thursday: { "8-12": "E2B", "13-17": "E1B" },
  Friday: { "8-12": "E4B", "13-17": "E3B" },
};

export const SPRING_MODULE_GRID: Record<Weekday, Partial<Record<SlotLabel, string>>> = {
  Monday: { "8-12": "F1A", "13-17": "F2A" },
  Tuesday: { "8-12": "F3A", "13-17": "F4A", "18-22": "F7" },
  Wednesday: { "8-12": "F5A", "13-17": "F5B" },
  Thursday: { "8-12": "F2B", "13-17": "F1B" },
  Friday: { "8-12": "F4B", "13-17": "F3B" },
};

export const CAMPUS_TZ = "Europe/Copenhagen";

export const COURSE_ANALYZER_URL = (code: string) =>
  `https://dtucourseanalyzer.pythonanywhere.com/course/${code}`;
export const COURSE_BASE_URL = (code: string) => `https://kurser.dtu.dk/course/${code}`;
export const DTU_LEARN_HOME = "https://learn.inside.dtu.dk/d2l/home";
export const DTU_LEARN_COURSE = (ou: string) => `https://learn.inside.dtu.dk/d2l/home/${ou}`;
export const CALENDAR_GUIDE_URL =
  "https://learnsupport.dtu.dk/teachers/subscribe_to_calendar.php";
