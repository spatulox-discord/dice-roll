import {EmbedBuilder, User} from "discord.js";
import {EmbedManager, SimpleColor} from "@spatulox/simplediscordbot";
import {formatTerm} from "./parser";
import {RollResult, TermResult} from "./roller";

export const DEFAULT_ROLL_TITLE = "🎲 Lancer de dés";

const FIELD_MAX_LENGTH = 1024;

export function rollTitle(reason: string | null): string {
    return reason ? `🎲 ${reason}` : DEFAULT_ROLL_TITLE;
}

export function buildRollEmbed(result: RollResult, title: string, user: User): EmbedBuilder {
    const color = result.critical === 'success' ? SimpleColor.green
        : result.critical === 'failure' ? SimpleColor.red
        : null;

    const lines = [`# ${result.total}`, `\`${result.formula.normalized}\``];
    if (result.critical === 'success') lines.push("✨ **Réussite critique !**");
    if (result.critical === 'failure') lines.push("💀 **Échec critique…**");

    const embed = EmbedManager.create(color)
        .setTitle(title)
        .setAuthor({name: user.displayName, iconURL: user.displayAvatarURL()})
        .setDescription(lines.join("\n"));

    return EmbedManager.field(embed, {name: "Détail", value: formatDetails(result.terms)});
}

function formatDetails(terms: TermResult[]): string {
    const lines = terms.map((result, index) => {
        const sign = result.term.sign === -1 ? "−" : index === 0 ? "" : "+";
        const label = `${sign}${formatTerm(result.term)}`;

        if (result.term.kind === 'constant') {
            return `${label}`;
        }

        const dice = result.dice
            .map(die => die.kept ? `${die.value}` : `~~${die.value}~~`)
            .join(", ");
        return `${label} → [${dice}] = **${Math.abs(result.subtotal)}**`;
    });

    return truncate(lines.join("\n"), FIELD_MAX_LENGTH);
}

function truncate(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
