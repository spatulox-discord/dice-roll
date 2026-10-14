import {RateLimiter} from "discord.js-rate-limiter"
import {MessageFlags, RepliableInteraction} from "discord.js"

/**
 * Replies (ephemerally) and returns true when the user is rate limited,
 * so a command can early-return on it.
 */
export async function isUserRateLimited(
    interaction: RepliableInteraction,
    rateLimiter: RateLimiter,
    milliseconds: number
): Promise<boolean> {
    if (!rateLimiter.take(interaction.user.id)) {
        return false
    }

    await interaction.reply({
        content: `Slow down! Try again in ${milliseconds / 1000} seconds :)`,
        flags: MessageFlags.Ephemeral
    })
    return true
}
