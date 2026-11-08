// While typing an entry, "/<name>" is replaced by what it expands to. A command
// picked from the suggestions is replaced right away, so /now is the time it
// was picked; any command still typed out is replaced when the entry is added.
// A command starts a word ("/" after the start, whitespace or an opening
// bracket), so "and/or" or a URL are left alone, as is any "/<name>" that names
// no command.

import type { Principal } from '@/api/auth';
import type { Mission } from '@/api/missions';
import { formatTime } from './logbookEntries';

export type CommandContext = {
  mission: Mission | null;
  principal: Principal | null;
};

// value replaces the word being typed.
export type Suggestion = { value: string; label: string; detail?: string };

type Expansion = { text: string } | { error: string };

type LogbookCommand = {
  name: string;
  description: string;
  expand: (ctx: CommandContext) => Expansion;
};

const maxSuggestions = 8;

const namePattern = '[a-z][a-z0-9-]*';

// A command's "/" may only follow whitespace, an opening bracket or the start.
const wordStart = '(?<![^\\s([{])';

// Punctuation ending a word, as in "/me.", is not part of a command's name.
const trailing = '[.,;:!?)\\]}]';

const typedName = new RegExp(`${wordStart}/(${namePattern})(?=${trailing}|\\s|$)`, 'g');

const now: LogbookCommand = {
  name: 'now',
  description: 'Insert the current date and time',
  expand: () => ({ text: formatTime(new Date().toISOString()) }),
};

const callee: LogbookCommand = {
  name: 'callee',
  description: 'Mention the callee of the mission',
  expand: ({ mission }) => {
    const name = mission?.callee.trim() ?? '';
    return name === '' ? { error: '/callee: the mission has no callee.' } : { text: name };
  },
};

// The directory's display name, else the username.
const me: LogbookCommand = {
  name: 'me',
  description: 'Mention yourself',
  expand: ({ principal }) => {
    const name = principal?.name || principal?.username || '';
    return name === '' ? { error: '/me: your name is not known.' } : { text: name };
  },
};

export type Commands = Map<string, LogbookCommand>;

const byName = (list: LogbookCommand[]): Commands => new Map(list.map((c) => [c.name, c]));

export const commands: Commands = byName([now, callee, me]);

// The commands naming a person, for sender and receiver.
export const partyCommands: Commands = byName([callee, me]);

// Returns the errors instead if any command cannot be expanded.
export function expandCommands(
  text: string,
  ctx: CommandContext,
  available: Commands = commands,
): { text: string } | { errors: string[] } {
  const errors: string[] = [];
  let out = '';
  let last = 0;
  for (const m of text.matchAll(typedName)) {
    const command = available.get(m[1]);
    if (!command) continue;
    const result = command.expand(ctx);
    if ('error' in result) {
      errors.push(result.error);
      continue;
    }
    out += text.slice(last, m.index) + result.text;
    last = m.index + m[0].length;
  }
  out += text.slice(last);
  return errors.length > 0 ? { errors } : { text: out };
}

// suggestions replace text[from, to).
export type Completion = { from: number; to: number; suggestions: Suggestion[] };

const typingName = new RegExp(`^/(?:${namePattern})?$`);

// The command names while typing "/<name>"; null when there is nothing to
// offer.
export function completionAt(
  text: string,
  caret: number,
  ctx: CommandContext,
  available: Commands = commands,
): Completion | null {
  const from = text.slice(0, caret).search(/[^\s([{]*$/);
  const to = caret + text.slice(caret).search(/[\s.,;:!?)\]}]|$/);
  const word = text.slice(from, caret);
  if (!typingName.test(word)) return null;
  const query = word.slice(1);
  const suggestions = [...available.values()]
    .filter((c) => c.name.startsWith(query))
    .map((c) => {
      // Inserted as what it expands to; one that cannot expand now is inserted
      // as typed, so adding the entry reports why.
      const result = c.expand(ctx);
      return {
        value: 'text' in result ? `${result.text} ` : `/${c.name} `,
        label: `/${c.name}`,
        detail: `${c.description} · ${'text' in result ? result.text : result.error}`,
      };
    });
  return suggestions.length > 0 ? { from, to, suggestions } : null;
}

// Earlier values containing text, ignoring case, replacing all of it; null if
// text is blank or none match.
export function valueCompletion(text: string, values: string[]): Completion | null {
  const q = text.trim().toLowerCase();
  if (q === '') return null;
  const suggestions = values
    .filter((v) => v !== text && v.toLowerCase().includes(q))
    .slice(0, maxSuggestions)
    .map((v) => ({ value: v, label: v }));
  return suggestions.length > 0 ? { from: 0, to: text.length, suggestions } : null;
}
