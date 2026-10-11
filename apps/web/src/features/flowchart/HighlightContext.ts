import { createContext } from 'react';

/** Codes that stay bright while a course is focused; null when nothing is focused. CourseNode reads it so focus changes never rebuild the node array. */
export const HighlightContext = createContext<Set<string> | null>(null);
