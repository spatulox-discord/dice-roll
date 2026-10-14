import {RepliableInteraction} from "discord.js";
import {Bot, ComponentManager, SimpleColor} from "@spatulox/simplediscordbot";

/**
 * Last resort answer when a handler fails : without it, Discord only shows
 * "The application did not respond" to the user.
 */
export async function replyUnexpectedError(interaction: RepliableInteraction): Promise<void> {
    if (interaction.replied || interaction.deferred) {
        return
    }
    const container = ComponentManager.create({
        title: "### ❌ Something went wrong",
        description: "Please try again in a moment.",
        color: SimpleColor.error
    })
    try {
        await interaction.reply(ComponentManager.toInteraction(container, null, false, true))
    } catch (error) {
        Bot.log.error(`Failed to answer the error : ${error}`)
    }
}
