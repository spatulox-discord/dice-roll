import {MessageFlags, RepliableInteraction} from "discord.js"

/**
 * Sliding window : at most `limit` actions per `windowMs` for each user.
 */
export class RateLimiter {
    private readonly hits = new Map<string, number[]>()
    private lastSweep = 0

    constructor(private readonly limit: number, private readonly windowMs: number) {
    }

    /** Number of users still remembered */
    get size(): number {
        return this.hits.size
    }

    /**
     * Records an action of the user and returns 0, or returns how many
     * milliseconds they must wait when they are over the limit.
     */
    take(userId: string, now: number = Date.now()): number {
        this.forgetIdleUsers(now)
        const recent = (this.hits.get(userId) ?? []).filter(time => now - time < this.windowMs)

        if (recent.length >= this.limit) {
            this.hits.set(userId, recent)
            return recent[0]! + this.windowMs - now
        }
        recent.push(now)
        this.hits.set(userId, recent)
        return 0
    }

    /** At most once per window : drops the users whose last action left the window */
    private forgetIdleUsers(now: number): void {
        if (now - this.lastSweep < this.windowMs) {
            return
        }
        this.lastSweep = now
        for (const [userId, times] of this.hits) {
            if (now - times[times.length - 1]! >= this.windowMs) {
                this.hits.delete(userId)
            }
        }
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
