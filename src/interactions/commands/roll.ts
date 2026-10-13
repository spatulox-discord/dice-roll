import {ChatInputCommandInteraction} from "discord.js";
import {Bot} from "@spatulox/simplediscordbot";
import {replyWithRoll} from "../../dice/reply";

/**
 * /roll formule:<string> prive:<boolean?>
 */
export async function roll(interaction: ChatInputCommandInteraction) {
    try {
        const formula = interaction.options.getString("formule", true)
        const isPrivate = interaction.options.getBoolean("prive") ?? false

        await replyWithRoll(interaction, formula, isPrivate)
    } catch (error) {
        Bot.log.error(`roll command failed : ${error}`)
    }
}
