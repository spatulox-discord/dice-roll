import {ActionRowBuilder, ButtonBuilder, EmbedBuilder, User} from "discord.js";
import {ButtonManager, EmbedManager, SimpleColor} from "@spatulox/simplediscordbot";
import {CompareOperator, DiceTerm, formatTerm, KeepRule} from "./parser";
import {RollResult, TermResult} from "./roller";

export const REROLL_PREFIX = "dice_reroll";
const REROLL_SEPARATOR = "|";

const DESCRIPTION_MAX_LENGTH = 4096;
const FIELD_MAX_LENGTH = 1024;

export const FILTER_FIELD_NAME = "Dés correspondant au filtre";

export type RerollPayload = {
    formula: string
    isPrivate: boolean
};

type DiceTermResult = TermResult & {term: DiceTerm};

export function buildRollEmbed(result: RollResult, user: User): EmbedBuilder {
    const color = result.critical === 'success' ? SimpleColor.green
        : result.critical === 'failure' ? SimpleColor.red
        : null;

    const embed = EmbedManager.create(color)
        .setTitle(`🎲 ${result.formula.normalized}`)
        .setAuthor({name: user.displayName, iconURL: user.displayAvatarURL()})
        .setDescription(buildRollDescription(result));

    const filter = buildFilterField(result);
    return filter ? EmbedManager.field(embed, {name: FILTER_FIELD_NAME, value: filter}) : embed;
}

/**
 * One line per term with a filter : the rule in words and the dice it matched,
 * i.e. the dice kept by kh / kl / k<op>, and the dice removed by dh / dl. Null when no term has a filter.
 */
export function buildFilterField(result: RollResult): string | null {
    const lines = result.terms.filter(isDiceTerm).flatMap(({term, dice}) => {
        if (!term.keep) {
            return [];
        }
        const keeps = term.keep.mode !== 'dh' && term.keep.mode !== 'dl';
        const matched = dice.filter(die => die.kept === keeps).map(die => `[${die.value}]`).join(" ");
        // A face value filter can match no die at all
        const shown = matched ? `\`${matched}\`` : "aucun dé";
        return [`\`${formatTerm(term)}\` ${describeRule(term.keep)} → ${shown}`];
    });

    if (lines.length === 0) {
        return null;
    }
    const value = lines.join("\n");
    return value.length <= FIELD_MAX_LENGTH ? value : `${value.slice(0, FIELD_MAX_LENGTH - 1)}…`;
}

const OPERATOR_SYMBOLS: Record<CompareOperator, string> = {'<': "<", '<=': "≤", '>': ">", '>=': "≥", '=': "="};

function describeRule(rule: KeepRule): string {
    if (rule.mode === 'k') {
        return `garde les dés ${OPERATOR_SYMBOLS[rule.operator]} ${rule.value}`;
    }
    const {mode, count} = rule;
    const verb = mode === 'kh' || mode === 'kl' ? "garde" : "retire";
    const high = mode === 'kh' || mode === 'dh';
    if (count === 1) {
        return `${verb} le plus ${high ? "haut" : "bas"}`;
    }
    return `${verb} les ${count} plus ${high ? "hauts" : "bas"}`;
}

/**
 * The "game mat" : the dice that count (filters applied), the dice total,
 * the modifiers and the final total. When a term has a filter, a smaller
 * mat below shows every die rolled and the total without filters.
 */
export function buildRollDescription(result: RollResult): string {
    const diceTerms = result.terms.filter(isDiceTerm);
    const modifiers = result.terms.filter(term => term.term.kind === 'constant');
    const width = Math.max(...diceTerms.map(term => `${term.term.sides}`.length));

    const diceTotal = diceTerms.reduce((sum, term) => sum + term.subtotal, 0);
    const modifiersTotal = modifiers.reduce((sum, term) => sum + term.subtotal, 0);

    const lines = [
        codeBlock(mat(diceTerms, width, true)),
        `Total des dés : **${diceTotal}**`
    ];
    if (modifiers.length > 0) {
        lines.push(`Modificateurs : **${signed(modifiersTotal)}**`);
    }
    lines.push(`# Total : ${result.total}`);

    if (result.critical === 'success') lines.push("✨ **Réussite critique !**");
    if (result.critical === 'failure') lines.push("💀 **Échec critique…**");

    const main = lines.join("\n");

    if (!diceTerms.some(term => term.term.keep)) {
        return main;
    }

    const rawTotal = diceTerms.reduce((sum, term) => sum + term.term.sign * sumOf(term.dice.map(die => die.value)), modifiersTotal);
    const miniMat = [
        "-# Tous les dés, sans filtre :",
        ...mat(diceTerms, width, false).map(line => `-# \`${line}\``),
        `-# Total sans filtre : ${rawTotal}`
    ].join("\n");

    const full = `${main}\n\n${miniMat}`;
    // Only reachable with huge formulas : the main mat matters more than the mini one
    return full.length <= DESCRIPTION_MAX_LENGTH ? full : main;
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
        const dice = values.map(value => `[${`${value}`.padStart(width)}]`).join(" ") || "aucun dé";
        const subtotal = applyKeep && values.length > 1 ? `  = ${sumOf(values)}` : "";
        return `${labels[index]!.padEnd(labelWidth)}  ${dice}${subtotal}`;
    });
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

export function buildRerollRow(formula: string, isPrivate: boolean): ActionRowBuilder<ButtonBuilder> {
    const customId = [REROLL_PREFIX, isPrivate ? "p" : "s", formula].join(REROLL_SEPARATOR);
    return ButtonManager.row(ButtonManager.secondary({customId, label: "Relancer", emoji: "🎲"}));
}

export function parseRerollId(customId: string): RerollPayload | null {
    const [prefix, visibility, ...formula] = customId.split(REROLL_SEPARATOR);
    if (prefix !== REROLL_PREFIX || (visibility !== "p" && visibility !== "s") || formula.length === 0) {
        return null;
    }
    return {formula: formula.join(REROLL_SEPARATOR), isPrivate: visibility === "p"};
}
