export const BASE_EXAM_TYPES = [
  'SAT', 'ACT', 'PSAT', 'GMAT', 'GRE', 'ISEE', 'SSAT',
  'LSAT', 'MCAT',
  'AP Biology', 'AP Calculus', 'AP Chemistry', 'AP English', 'AP History', 'AP Physics'
] as const;

export type BaseExamType = typeof BASE_EXAM_TYPES[number];