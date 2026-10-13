import {RepliableInteraction} from "discord.js";
import {RateLimiter} from "discord.js-rate-limiter";
import {EmbedManager} from "@spatulox/simplediscordbot";
import {Time} from "@spatulox/utils";
import {isUserRateLimited} from "../utils/rateLimiter";
import {DiceFormula, DiceParseError, parseFormula} from "./parser";
import {rollFormula} from "./roller";
import {buildRerollRow, buildRollEmbed} from "./format";

// Shared by /roll and the reroll button : 5 rolls per 10 seconds per user
export const RATE_LIMIT = {rolls: 5, windowMs: Time.second.SEC_10.toMilliseconds()} as const
const rateLimiter = new RateLimiter(RATE_LIMIT.rolls, RATE_LIMIT.windowMs)

/**
 * Parses, rolls and replies to the interaction with the result embed and a reroll button.
 * An invalid formula gets an ephemeral error instead.
 */
export async function replyWithRoll(
    interaction: RepliableInteraction,
    input: string,
    isPrivate: boolean
): Promise<void> {
    if (await isUserRateLimited(interaction, rateLimiter, RATE_LIMIT.windowMs)) {
        return
    }

    let formula: DiceFormula
    try {
        formula = parseFormula(input)
    } catch (error) {
        if (error instanceof DiceParseError) {
            await interaction.reply(EmbedManager.toInteraction(EmbedManager.error(error.message), true))
            return
        }
        throw error
    }

    const result = rollFormula(formula)
    const embed = buildRollEmbed(result, interaction.user)

    await interaction.reply({
        ...EmbedManager.toInteraction(embed, isPrivate),
        components: [buildRerollRow(formula.normalized, isPrivate)]
    })
}
