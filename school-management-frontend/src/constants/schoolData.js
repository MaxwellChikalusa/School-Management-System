export const SEX_OPTIONS = ["M", "F"];

export const FORM_OPTIONS = Array.from({ length: 7 }, (_, index) => `Form ${index + 1}`);

export const TERM_OPTIONS = ["Term 1", "Term 2", "Term 3"];

export const SECONDARY_SUBJECTS = [
  "Agriculture",
  "Additional Mathematics",
  "Bible Knowledge",
  "Biology",
  "Business Studies",
  "Chichewa",
  "Chemistry",
  "Computer Studies",
  "English Language",
  "French",
  "Geography",
  "History",
  "Home Economics",
  "Life Skills",
  "Literature in English",
  "Mathematics",
  "Music",
  "Physical Education",
  "Physics",
  "Social and Development Studies",
  "Technical Drawing",
];

export function matchesSearch(values, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalized));
}
