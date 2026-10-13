import {InteractionsManager} from "@spatulox/discord-module";
import {Bot} from "@spatulox/simplediscordbot";
import {Handlers} from "./HandlersPath";
import {example} from "../interactions/commands/example";

/**
 * Wires every interaction handler to its Discord name.
 *
 * Build it with `await RegisterInteraction.create()` so registration is done
 * before the bot starts receiving interactions.
 */
export class RegisterInteraction {

    private manager: InteractionsManager

    private constructor() {
        this.manager = InteractionsManager.createOrGetInstance(Bot.client)
    }

    static async create(): Promise<RegisterInteraction> {
        const instance = new RegisterInteraction()
        await instance.slash()
        await instance.button()
        await instance.context_menu()
        await instance.modal()
        await instance.select_menu()
        return instance
    }

    private async slash() {
        const exampleJson = await Handlers.load('commands', 'example');

        this.manager.registerSlash(exampleJson.name, example)
    }

    private async button() {
        // this.manager.registerButton("my_button_id", myButtonHandler)
    }

    private async context_menu() {
        // const exampleJson = await Handlers.load('context_menu', 'example');
        // this.manager.registerMessageContextMenus(exampleJson.name, myContextMenuHandler)
    }

    private async modal() {
        // this.manager.registerModal("my_modal_title", myModalHandler)
    }

    private async select_menu() {
        // this.manager.registerSelectMenu("my_select_id", mySelectMenuHandler)
    }
}
