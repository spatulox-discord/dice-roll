import {ButtonInteraction} from "discord.js";
import {Bot, EmbedManager} from "@spatulox/simplediscordbot";
import {replyWithRoll} from "../../dice/reply";
import {parseRerollId} from "../../dice/format";

/**
 * "Relancer" button under a roll : rolls the same formula again for whoever clicked,
 * keeping the visibility of the original roll.
 */
export async function reroll(interaction: ButtonInteraction) {
    try {
        const payload = parseRerollId(interaction.customId)
        if (!payload) {
            await interaction.reply(EmbedManager.toInteraction(EmbedManager.error("Ce bouton n'est plus valide."), true))
            return
        }

        await replyWithRoll(interaction, payload.formula, payload.isPrivate)
    } catch (error) {
        Bot.log.error(`reroll button failed : ${error}`)
    }
}
