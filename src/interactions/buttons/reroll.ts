import {ButtonInteraction} from "discord.js";
import {Bot, EmbedManager} from "@spatulox/simplediscordbot";
import {replyWithRoll} from "../../dice/reply";
import {DEFAULT_ROLL_TITLE, parseRerollId} from "../../dice/format";

/**
 * "Relancer" button under a roll : rolls the same formula again for whoever clicked,
 * keeping the title and the visibility of the original roll.
 */
export async function reroll(interaction: ButtonInteraction) {
    try {
        const payload = parseRerollId(interaction.customId)
        if (!payload) {
            await interaction.reply(EmbedManager.toInteraction(EmbedManager.error("Ce bouton n'est plus valide."), true))
            return
        }

        const title = interaction.message.embeds[0]?.title ?? DEFAULT_ROLL_TITLE
        await replyWithRoll(interaction, payload.formula, title, payload.isPrivate)
    } catch (error) {
        Bot.log.error(`reroll button failed : ${error}`)
    }
}
