import {RepliableInteraction} from "discord.js";
import {ComponentManager} from "@spatulox/simplediscordbot";
import {Time} from "@spatulox/utils";
import {isUserRateLimited, RateLimiter} from "../utils/rateLimiter";
import {DiceFormula, DiceParseError, parseFormula} from "./parser";
import {rollFormula} from "./roller";
import {buildErrorContainer, buildRollContainer} from "./format";

// Shared by /roll and the reroll button : 5 rolls per 10 seconds per user
export const RATE_LIMIT = {rolls: 5, windowMs: Time.second.SEC_10.toMilliseconds()} as const
const rateLimiter = new RateLimiter(RATE_LIMIT.rolls, RATE_LIMIT.windowMs)

/**
 * Parses, rolls and replies to the interaction with the result (Components V2) and its reroll button.
 * An invalid formula gets an ephemeral error instead.
 */
export async function replyWithRoll(
    interaction: RepliableInteraction,
    input: string,
    isPrivate: boolean
): Promise<void> {
    if (await isUserRateLimited(interaction, rateLimiter)) {
        return
    }

    let formula: DiceFormula
    try {
        formula = parseFormula(input)
    } catch (error) {
        if (error instanceof DiceParseError) {
            await interaction.reply(ComponentManager.toInteraction(buildErrorContainer(error.message), null, false, true))
            return
        }
        throw error
    }

    const result = rollFormula(formula)
    const container = buildRollContainer(result, interaction.user, isPrivate)

    await interaction.reply(ComponentManager.toInteraction(container, null, false, isPrivate))
}
