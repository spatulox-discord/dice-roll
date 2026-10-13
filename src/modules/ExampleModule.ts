import {Module, ModuleEventsMap} from "@spatulox/discord-module";
import {Bot} from "@spatulox/simplediscordbot";
import {Events, Message} from "discord.js";

/**
 * A module groups a feature and its Discord event handlers.
 * Handlers declared in `events` are bound by the ModuleManager and stop firing
 * as soon as the module is disabled from the ModuleUI panel.
 */
export class ExampleModule extends Module {

    name: string = "Example Module"
    description: string = "Logs every message sent by a human"

    get events(): ModuleEventsMap {
        return {
            [Events.MessageCreate]: (message: Message) => this.onMessage(message)
        }
    }

    private onMessage(message: Message) {
        if (message.author.bot) return
        Bot.log.debug(`${message.author.username} : ${message.content}`)
    }
}
