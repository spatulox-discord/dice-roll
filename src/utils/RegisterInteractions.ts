import {InteractionMatchType, InteractionsManager} from "@spatulox/discord-module";
import {Bot} from "@spatulox/simplediscordbot";
import {Handlers} from "./HandlersPath";
import {roll} from "../interactions/commands/roll";
import {info, INFO_PAGE_PREFIX} from "../interactions/commands/info";
import {reroll} from "../interactions/buttons/reroll";
import {infoPage} from "../interactions/buttons/infoPage";
import {REROLL_PREFIX} from "../dice/format";

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
        const rollJson = await Handlers.load('commands', 'roll');

        this.manager.registerSlash(rollJson.name, roll)

        const infoJson = await Handlers.load('commands', 'info');
        this.manager.registerSlash(infoJson.name, info)
    }

    private async button() {
        // The customId carries the formula : "dice_reroll|<p|s>|<formula>"
        this.manager.registerButton(REROLL_PREFIX, reroll, InteractionMatchType.START_WITH)
        // "info_page|<page>" : the buttons under /info
        this.manager.registerButton(INFO_PAGE_PREFIX, infoPage, InteractionMatchType.START_WITH)
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
