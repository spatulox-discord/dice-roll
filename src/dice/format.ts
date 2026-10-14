import {ButtonBuilder, ContainerBuilder, escapeMarkdown, User} from "discord.js";
import {ButtonManager, ComponentManager, ComponentManagerField, SimpleColor} from "@spatulox/simplediscordbot";
import {CompareOperator, DiceFilter, DiceTerm, formatTerm} from "./parser";
import {RollResult, TermResult} from "./roller";

export const REROLL_PREFIX = "dice_reroll";
const REROLL_SEPARATOR = "|";

/** Discord caps the text of a Components V2 message at 4000 characters */
export const TEXT_MAX_LENGTH = 4000;

export const FILTER_FIELD_NAME = "Filters";
const FILTER_LEGEND = "-# (n) = not counted";

/** The rolls column wraps past this width, so the table stays readable on a phone */
const ROLLS_MAX_WIDTH = 20;
const HIDDEN_ROLLS = "…";

export type RerollPayload = {
    formula: string
    isPrivate: boolean
};

type DiceTermResult = TermResult & {term: DiceTerm};

/**
 * The roll as a Components V2 container :
 * - who rolled, in small text
 * - the table of the roll (see buildRollTable)
 * - the "Filters" list, only when a term has a filter
 * - the "Reroll" button
 */
export function buildRollContainer(result: RollResult, user: User, isPrivate: boolean): ContainerBuilder {
    const rolledBy = `-# 🎲 Rolled by **${escapeMarkdown(user.displayName)}**`;
    const filters = buildFiltersText(result);

    // Every die is listed in the table : on huge rolls, only the sums fit in Discord's text limit
    const fixedLength = rolledBy.length + (filters ? FILTER_FIELD_NAME.length + 6 + filters.length : 0);
    let table = codeBlock(buildRollTable(result));
    if (fixedLength + table.length > TEXT_MAX_LENGTH) {
        table = codeBlock(buildRollTable(result, true));
    }

    const fields: ComponentManagerField[] = [{value: table, separator: false}];
    if (filters) fields.push({name: FILTER_FIELD_NAME, value: filters, separator: false});
    fields.push({button: [buildRerollButton(result.formula.normalized, isPrivate)]});

    return ComponentManager.fields(ComponentManager.create({description: rolledBy}), fields);
}

/** Ephemeral error answer (invalid formula, stale button...) */
export function buildErrorContainer(message: string): ContainerBuilder {
    return ComponentManager.create({title: "### ❌ Cannot roll", description: message, color: SimpleColor.error});
}

type TableRow = {
    dice: string
    /** One entry per line : the rolls wrap past ROLLS_MAX_WIDTH */
    rolls: string[]
    sum: string
};

/**
 * The roll as a box-drawing table, for a code block :
 *
 *   ╔═══════════════════╗
 *   ║        5d6        ║
 *   ╠═══════════╤═══════╣
 *   ║   rolls   │  sum  ║
 *   ╟───────────┼───────╢
 *   ║ 1 2 4 2 4 │ [13]  ║
 *   ╚═══════════╧═══════╝
 *
 * One row per dice term (dice that do not count between parentheses), a `mod` row for the modifiers,
 * and a `total` row when there is more than one row. A `dice` column is added with several dice terms.
 * `hideRolls` replaces the rolls with "…", for rolls too big for Discord's text limit.
 */
export function buildRollTable(result: RollResult, hideRolls = false): string {
    const diceTerms = result.terms.filter(isDiceTerm);
    const modifiers = result.terms.filter(term => term.term.kind === 'constant');
    const withDiceColumn = diceTerms.length > 1;

    const rows: TableRow[] = diceTerms.map((term, index) => ({
        dice: diceLabel(term, index),
        rolls: hideRolls ? [HIDDEN_ROLLS] : wrap(term.dice.map(die => die.kept ? `${die.value}` : `(${die.value})`)),
        sum: term.term.filter?.type === 'success'
            ? `[${term.subtotal}] total = ${term.term.sign * term.faceTotal}`
            : `[${term.subtotal}]`
    }));
    if (modifiers.length > 0) {
        rows.push({dice: "mod", rolls: [withDiceColumn ? "" : "mod"], sum: signed(sumOf(modifiers.map(term => term.subtotal)))});
    }
    const total = rows.length > 1 ? `[${result.total}]` : null;

    const sumHeader = sumColumnHeader(diceTerms);
    // Content widths, the cells add one space on each side
    const diceWidth = withDiceColumn ? Math.max("dice".length, ...rows.map(row => row.dice.length)) : 0;
    let rollsWidth = Math.max("rolls".length, ...rows.flatMap(row => row.rolls.map(line => line.length)));
    const sumWidth = Math.max(sumHeader.length, ...rows.map(row => row.sum.length), total?.length ?? 0);

    // Without the dice column, `total` is written in the rolls column
    if (total && !withDiceColumn) rollsWidth = Math.max(rollsWidth, "total".length);

    const columns = () => withDiceColumn ? [diceWidth + 2, rollsWidth + 2, sumWidth + 2] : [rollsWidth + 2, sumWidth + 2];
    const innerWidth = () => columns().reduce((sum, width) => sum + width, 0) + columns().length - 1;

    // The title is the formula : widen the rolls column when it is longer than the table
    const title = result.formula.normalized;
    if (title.length + 2 > innerWidth()) rollsWidth += title.length + 2 - innerWidth();

    const widths = columns();
    const line = (left: string, fill: string, join: string, right: string, spans = widths) =>
        left + spans.map(width => fill.repeat(width)).join(join) + right;
    const cells = (contents: string[], align: ('left' | 'center')[]) =>
        "║" + contents.map((content, index) => cell(content, widths[index]!, align[index]!)).join("│") + "║";
    const rowAlign: ('left' | 'center')[] = withDiceColumn ? ['left', 'left', 'center'] : ['left', 'center'];
    const headers = withDiceColumn ? ["dice", "rolls", sumHeader] : ["rolls", sumHeader];

    const lines = [
        line("╔", "═", "═", "╗", [innerWidth()]),
        "║" + center(title, innerWidth()) + "║",
        line("╠", "═", "╤", "╣"),
        cells(headers, headers.map(() => 'center')),
        line("╟", "─", "┼", "╢")
    ];

    for (const row of rows) {
        row.rolls.forEach((rolls, index) => {
            const first = index === 0;
            lines.push(cells(
                withDiceColumn ? [first ? row.dice : "", rolls, first ? row.sum : ""] : [rolls, first ? row.sum : ""],
                rowAlign
            ));
        });
    }

    if (total && withDiceColumn) {
        // The total row merges the dice and rolls columns
        const merged = widths[0]! + 1 + widths[1]!;
        lines.push(`╟${"─".repeat(widths[0]!)}┴${"─".repeat(widths[1]!)}┼${"─".repeat(widths[2]!)}╢`);
        lines.push("║" + cell("total", merged, 'left') + "│" + cell(total, widths[2]!, 'center') + "║");
        lines.push(`╚${"═".repeat(merged)}╧${"═".repeat(widths[2]!)}╝`);
    } else {
        if (total) {
            lines.push(line("╟", "─", "┼", "╢"));
            lines.push(cells(["total", total], rowAlign));
        }
        lines.push(line("╚", "═", "╧", "╝"));
    }

    return lines.join("\n");
}

/**
 * One line per term with a filter, in words, then the legend of the parentheses.
 * Null when no term has a filter.
 */
export function buildFiltersText(result: RollResult): string | null {
    const lines = result.terms.filter(isDiceTerm).flatMap(({term, subtotal, faceTotal}) => {
        if (!term.filter) {
            return [];
        }
        const description = `\`${formatTerm(term)}\` ${describeFilter(term.filter)}`;
        if (term.filter.type !== 'success') {
            return [description];
        }
        const successes = Math.abs(subtotal);
        return [`${description}: ${successes} success${successes === 1 ? "" : "es"} (total = ${faceTotal})`];
    });

    return lines.length > 0 ? [...lines, FILTER_LEGEND].join("\n") : null;
}

const OPERATOR_SYMBOLS: Record<CompareOperator, string> = {'<': "<", '<=': "≤", '>': ">", '>=': "≥", '=': "="};

function describeFilter(filter: DiceFilter): string {
    if (filter.type === 'success') {
        return `counts dice ${OPERATOR_SYMBOLS[filter.operator]} ${filter.value} as successes`;
    }
    const verb = filter.mode === 'kh' || filter.mode === 'kl' ? "keeps" : "drops";
    const high = filter.mode === 'kh' || filter.mode === 'dh';
    return filter.count === 1
        ? `${verb} the ${high ? "highest" : "lowest"} die`
        : `${verb} the ${filter.count} ${high ? "highest" : "lowest"} dice`;
}

/** `sum`, `successes` when every dice term counts successes, `result` when both are mixed */
function sumColumnHeader(terms: DiceTermResult[]): string {
    const successes = terms.filter(term => term.term.filter?.type === 'success').length;
    return successes === 0 ? "sum" : successes === terms.length ? "successes" : "result";
}

function diceLabel({term}: DiceTermResult, index: number): string {
    const sign = term.sign === -1 ? "-" : index === 0 ? "" : "+";
    return `${sign}${term.count}d${term.sides}`;
}

/** Spreads the dice over lines of at most ROLLS_MAX_WIDTH characters */
function wrap(dice: string[]): string[] {
    const lines: string[] = [];
    for (const die of dice) {
        const last = lines[lines.length - 1];
        if (last !== undefined && last.length + 1 + die.length <= ROLLS_MAX_WIDTH) {
            lines[lines.length - 1] = `${last} ${die}`;
        } else {
            lines.push(die);
        }
    }
    return lines;
}

function cell(content: string, width: number, align: 'left' | 'center'): string {
    return align === 'center' ? center(content, width) : ` ${content}`.padEnd(width);
}

function center(content: string, width: number): string {
    const left = Math.floor((width - content.length) / 2);
    return " ".repeat(left) + content + " ".repeat(width - content.length - left);
}

function codeBlock(table: string): string {
    return "```\n" + table + "\n```";
}

function isDiceTerm(result: TermResult): result is DiceTermResult {
    return result.term.kind === 'dice';
}

function sumOf(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0);
}

function signed(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
}

export function buildRerollButton(formula: string, isPrivate: boolean): ButtonBuilder {
    const customId = [REROLL_PREFIX, isPrivate ? "p" : "s", formula].join(REROLL_SEPARATOR);
    return ButtonManager.secondary({customId, label: "Reroll", emoji: "🎲"});
}

export function parseRerollId(customId: string): RerollPayload | null {
    const [prefix, visibility, ...formula] = customId.split(REROLL_SEPARATOR);
    if (prefix !== REROLL_PREFIX || (visibility !== "p" && visibility !== "s") || formula.length === 0) {
        return null;
    }
    return {formula: formula.join(REROLL_SEPARATOR), isPrivate: visibility === "p"};
}
