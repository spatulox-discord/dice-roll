import {MessageFlags, RepliableInteraction} from "discord.js"

/**
 * Sliding window : at most `limit` actions per `windowMs` for each user.
 */
export class RateLimiter {
    private readonly hits = new Map<string, number[]>()

    constructor(private readonly limit: number, private readonly windowMs: number) {
    }

    /**
     * Records an action of the user and returns 0, or returns how many
     * milliseconds they must wait when they are over the limit.
     */
    take(userId: string, now: number = Date.now()): number {
        const recent = (this.hits.get(userId) ?? []).filter(time => now - time < this.windowMs)

        if (recent.length >= this.limit) {
            this.hits.set(userId, recent)
            return recent[0]! + this.windowMs - now
        }
        recent.push(now)
        this.hits.set(userId, recent)
        return 0
    }
}

/**
 * Replies (ephemerally) and returns true when the user is rate limited,
 * so a command can early-return on it.
 */
export async function isUserRateLimited(
    interaction: RepliableInteraction,
    rateLimiter: RateLimiter
): Promise<boolean> {
    const waitMs = rateLimiter.take(interaction.user.id)
    if (waitMs === 0) {
        return false
    }

    await interaction.reply({
        content: `Slow down! Try again in ${Math.ceil(waitMs / 1000)} seconds :)`,
        flags: MessageFlags.Ephemeral
    })
    return true
}
