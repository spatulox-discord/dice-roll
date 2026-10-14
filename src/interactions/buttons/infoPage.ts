import {ButtonInteraction} from "discord.js";
import {Bot, ComponentManager} from "@spatulox/simplediscordbot";
import {buildInfoContainer, parseInfoPageId} from "../commands/info";

/**
 * Buttons under /info : shows the page of the clicked button, in place.
 */
export async function infoPage(interaction: ButtonInteraction) {
    try {
        const pageId = parseInfoPageId(interaction.customId) ?? undefined
        await interaction.update(ComponentManager.toInteractionUpdate(buildInfoContainer(pageId), null, false))
    } catch (error) {
        Bot.log.error(`info page button failed : ${error}`)
    }
}
