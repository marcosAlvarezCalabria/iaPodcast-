import type { JobInput } from "../utils/validation";

export type Chapter = {
  title: string;
  startSec: number;
  endSec: number;
  summary: string;
};

export type ScriptSection = {
  title: string;
  content: string;
};

const WORDS_PER_MINUTE = 140;

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const summarize = (text: string): string => {
  const sentence = text.split(/(?<=[.!?])\s+/).find(Boolean);
  if (sentence) {
    return sentence.trim();
  }
  const words = text.trim().split(/\s+/).slice(0, 18).join(" ");
  return words ? `${words}...` : "";
};

export const parseScriptSections = (markdown: string): ScriptSection[] => {
  const lines = markdown.split(/\r?\n/);
  const sections: ScriptSection[] = [];
  let current: ScriptSection | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.*)/);
    if (headingMatch) {
      if (current) {
        sections.push(current);
      }
      current = { title: headingMatch[1].trim(), content: "" };
      continue;
    }
    if (current) {
      current.content += `${line}\n`;
    }
  }

  if (current) {
    sections.push(current);
  }

  const filtered = sections.filter((section) => section.content.trim().length > 0);
  if (filtered.length === 0) {
    return [{ title: "Full Script", content: markdown }];
  }
  return filtered;
};

export const estimateChapters = (
  markdown: string,
  input: JobInput,
  wpm: number = WORDS_PER_MINUTE,
): Chapter[] => {
  const sections = parseScriptSections(markdown);
  let cursor = 0;

  return sections.map((section) => {
    const words = countWords(section.content);
    const seconds = Math.max(30, Math.ceil((words / wpm) * 60));
    const startSec = cursor;
    const endSec = cursor + seconds;
    cursor = endSec;
    return {
      title: section.title,
      startSec,
      endSec,
      summary: summarize(section.content) || `Sección sobre ${input.topic}.`,
    };
  });
};
