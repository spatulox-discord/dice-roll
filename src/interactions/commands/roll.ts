import {ChatInputCommandInteraction} from "discord.js";
import {Bot} from "@spatulox/simplediscordbot";
import {replyWithRoll} from "../../dice/reply";

/**
 * /roll dice:<string> private:<boolean?>
 */
export async function roll(interaction: ChatInputCommandInteraction) {
    try {
        const formula = interaction.options.getString("dice", true)
        const isPrivate = interaction.options.getBoolean("private") ?? false

        await replyWithRoll(interaction, formula, isPrivate)
    } catch (error) {
        Bot.log.error(`roll command failed : ${error}`)
    }
}
