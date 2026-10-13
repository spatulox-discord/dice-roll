import {ChatInputCommandInteraction} from "discord.js";
import {RateLimiter} from "discord.js-rate-limiter";
import {Bot, EmbedManager, Time} from "@spatulox/simplediscordbot";
import {isUserRateLimited} from "../../utils/rateLimiter";

const timeToWait = Time.second.SEC_20.toMilliseconds()
const rateLimiter = new RateLimiter(1, timeToWait)

export async function example(interaction: ChatInputCommandInteraction) {
    if (await isUserRateLimited(interaction, rateLimiter, timeToWait)) {
        return
    }

    try {
        const name = interaction.options.getString("name") ?? interaction.user.username
        await interaction.reply({embeds: [EmbedManager.success(`Hello ${name} !`)]})
    } catch (error) {
        Bot.log.error(`example command failed : ${error}`)
    }
}
