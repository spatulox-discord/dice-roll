import {ButtonInteraction} from "discord.js";
import {Bot, ComponentManager} from "@spatulox/simplediscordbot";
import {replyWithRoll} from "../../dice/reply";
import {buildErrorContainer, parseRerollId} from "../../dice/format";

/**
 * "Relancer" button under a roll : rolls the same formula again for whoever clicked,
 * keeping the visibility of the original roll.
 */
export async function reroll(interaction: ButtonInteraction) {
    try {
        const payload = parseRerollId(interaction.customId)
        if (!payload) {
            await interaction.reply(ComponentManager.toInteraction(buildErrorContainer("Ce bouton n'est plus valide."), null, false, true))
            return
        }

        await replyWithRoll(interaction, payload.formula, payload.isPrivate)
    } catch (error) {
        Bot.log.error(`reroll button failed : ${error}`)
    }
}
