import {RateLimiter} from "discord.js-rate-limiter"
import {CommandInteraction, MessageFlags} from "discord.js"

/**
 * Replies (ephemerally) and returns true when the user is rate limited,
 * so a command can early-return on it.
 */
export async function isUserRateLimited(
    interaction: CommandInteraction,
    rateLimiter: RateLimiter,
    milliseconds: number
): Promise<boolean> {
    if (!rateLimiter.take(interaction.user.id)) {
        return false
    }

    await interaction.reply({
        content: `Command used too often, try again in ${milliseconds / 1000} seconds :)`,
        flags: MessageFlags.Ephemeral
    })
    return true
}
