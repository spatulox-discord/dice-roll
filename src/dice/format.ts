import {ButtonBuilder, ContainerBuilder, escapeMarkdown, SeparatorSpacingSize, User} from "discord.js";
import {ButtonManager, ComponentManager, ComponentManagerField, SimpleColor} from "@spatulox/simplediscordbot";
import {CompareOperator, DiceFilter, DiceTerm, formatTerm} from "./parser";
import {RollResult, TermResult} from "./roller";

export const REROLL_PREFIX = "dice_reroll";
const REROLL_SEPARATOR = "|";

/** Discord caps the text of a Components V2 message at 4000 characters */
export const TEXT_MAX_LENGTH = 4000;
/** Room kept for the footer ComponentManager adds (bot name + timestamps) */
const FOOTER_RESERVED_LENGTH = 100;

export const FILTER_FIELD_NAME = "Dice matching filter";

export type RerollPayload = {
    formula: string
    isPrivate: boolean
};

type DiceTermResult = TermResult & {term: DiceTerm};

/**
 * The roll as a Components V2 container :
 * - header : the formula and who rolled, with their avatar
 * - the game mat (dice that count, filters applied)
 * - the totals, with the "Relancer" button next to them
 * - with a filter : the mini mat (every die, no filter) and the "Dés correspondant au filtre" list
 */
export function buildRollContainer(result: RollResult, user: User, isPrivate: boolean): ContainerBuilder {
    const header = `### 🎲 ${result.formula.normalized}\n-# Rolled by **${escapeMarkdown(user.displayName)}**`;
    const container = ComponentManager.create({
        title: header,
        thumbnailUrl: user.displayAvatarURL(),
        separator: SeparatorSpacingSize.Small
    });

    const {miniMat, filter} = fitOptionalSections(
        result,
        TEXT_MAX_LENGTH - FOOTER_RESERVED_LENGTH - header.length - buildMatText(result).length - buildTotalsText(result).length
    );

    const fields: ComponentManagerField[] = [
        {value: buildMatText(result), separator: false},
        {value: buildTotalsText(result), button: buildRerollButton(result.formula.normalized, isPrivate)}
    ];
    if (miniMat) fields.push({value: miniMat});
    if (filter) fields.push({name: FILTER_FIELD_NAME, value: filter});

    return ComponentManager.fields(container, fields);
}

/** Ephemeral error answer (invalid formula, stale button...) */
export function buildErrorContainer(message: string): ContainerBuilder {
    return ComponentManager.create({title: "### ❌ Cannot roll", description: message, color: SimpleColor.error});
}

/**
 * The mini mat and the filter list only matter with huge formulas when it comes to the text limit :
 * the mini mat is dropped first, then the filter list is cut.
 */
function fitOptionalSections(result: RollResult, budget: number): {miniMat: string | null, filter: string | null} {
    let miniMat = buildMiniMatText(result);
    let filter = buildFilterField(result);
    // `__**name**__` added by ComponentManager.field
    const filterLength = () => filter ? filter.length + FILTER_FIELD_NAME.length + 6 : 0;

    if ((miniMat?.length ?? 0) + filterLength() > budget) {
        miniMat = null;
    }
    if (filter && filterLength() > budget) {
        const room = budget - FILTER_FIELD_NAME.length - 6;
        filter = room > 1 ? `${filter.slice(0, room - 1)}…` : null;
    }
    return {miniMat, filter};
}

/** The game mat : one line per dice term with the dice that count (filters applied) */
export function buildMatText(result: RollResult): string {
    const diceTerms = result.terms.filter(isDiceTerm);
    return codeBlock(mat(diceTerms, dieWidth(diceTerms), true));
}

/** Dice total, modifiers (only when there are some) and the final total */
export function buildTotalsText(result: RollResult): string {
    const diceTotal = result.terms.filter(isDiceTerm).reduce((sum, term) => sum + term.subtotal, 0);
    const modifiers = result.terms.filter(term => term.term.kind === 'constant');

    const lines = [`Dice total: **${diceTotal}**`];
    if (modifiers.length > 0) {
        lines.push(`Modifiers: **${signed(sumOf(modifiers.map(term => term.subtotal)))}**`);
    }
    lines.push(`# Total: ${result.total}`);
    return lines.join("\n");
}

/**
 * Every die rolled and the total without filters, in small text.
 * Null when no term has a filter : the game mat already shows every die.
 */
export function buildMiniMatText(result: RollResult): string | null {
    const diceTerms = result.terms.filter(isDiceTerm);
    if (!diceTerms.some(term => term.term.filter)) {
        return null;
    }

    const rawTotal = result.terms.reduce((sum, term) => term.term.kind === 'constant'
        ? sum + term.subtotal
        : sum + term.term.sign * sumOf(term.dice.map(die => die.value)), 0);

    return [
        "-# All dice, no filter:",
        ...mat(diceTerms, dieWidth(diceTerms), false).map(line => `-# \`${line}\``),
        `-# Total without filter: ${rawTotal}`
    ].join("\n");
}

/**
 * One line per term with a filter : the rule in words and the dice it matched,
 * i.e. the dice kept by kh / kl / k<op>, and the dice removed by dh / dl. Null when no term has a filter.
 */
export function buildFilterField(result: RollResult): string | null {
    const lines = result.terms.filter(isDiceTerm).flatMap(({term, dice}) => {
        if (!term.filter) {
            return [];
        }
        const keeps = term.filter.type === 'success' || term.filter.mode === 'kh' || term.filter.mode === 'kl';
        const matched = dice.filter(die => die.kept === keeps).map(die => `[${die.value}]`).join(" ");
        // A face value filter can match no die at all
        const shown = matched ? `\`${matched}\`` : "no dice";
        return [`\`${formatTerm(term)}\` ${describeRule(term.filter)} → ${shown}`];
    });

    return lines.length > 0 ? lines.join("\n") : null;
}

const OPERATOR_SYMBOLS: Record<CompareOperator, string> = {'<': "<", '<=': "≤", '>': ">", '>=': "≥", '=': "="};

function describeRule(filter: DiceFilter): string {
    if (filter.type === 'success') {
        return `counts dice ${OPERATOR_SYMBOLS[filter.operator]} ${filter.value} as successes`;
    }
    const verb = filter.mode === 'kh' || filter.mode === 'kl' ? "keeps" : "drops";
    const high = filter.mode === 'kh' || filter.mode === 'dh';
    return filter.count === 1
        ? `${verb} the ${high ? "highest" : "lowest"} die`
        : `${verb} the ${filter.count} ${high ? "highest" : "lowest"} dice`;
}

/**
 * One line per dice term : label, then each die as [ n] separated by spaces.
 * `applyKeep` = only the dice kept by the filters, with the term subtotal when it has several dice.
 */
function mat(terms: DiceTermResult[], width: number, applyKeep: boolean): string[] {
    const labels = terms.map((result, index) => {
        const {term} = result;
        const sign = term.sign === -1 ? "-" : index === 0 ? "" : "+";
        return sign + (applyKeep ? formatTerm(term) : `${term.count}d${term.sides}`);
    });
    const labelWidth = Math.max(...labels.map(label => label.length));

    return terms.map((result, index) => {
        const values = result.dice.filter(die => !applyKeep || die.kept).map(die => die.value);
        const dice = values.map(value => `[${`${value}`.padStart(width)}]`).join(" ") || "no dice";
        const subtotal = applyKeep && values.length > 1 ? `  = ${sumOf(values)}` : "";
        return `${labels[index]!.padEnd(labelWidth)}  ${dice}${subtotal}`;
    });
}

function dieWidth(terms: DiceTermResult[]): number {
    return Math.max(...terms.map(term => `${term.term.sides}`.length));
}

function codeBlock(lines: string[]): string {
    return "```\n" + lines.join("\n") + "\n```";
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
