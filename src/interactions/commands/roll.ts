import {ChatInputCommandInteraction} from "discord.js";
import {Bot} from "@spatulox/simplediscordbot";
import {replyWithRoll} from "../../dice/reply";
import {rollTitle} from "../../dice/format";

/**
 * /roll formule:<string> raison:<string?> prive:<boolean?>
 */
export async function roll(interaction: ChatInputCommandInteraction) {
    try {
        const formula = interaction.options.getString("formule", true)
        const reason = interaction.options.getString("raison")
        const isPrivate = interaction.options.getBoolean("prive") ?? false

        await replyWithRoll(interaction, formula, rollTitle(reason), isPrivate)
    } catch (error) {
        Bot.log.error(`roll command failed : ${error}`)
    }
}
