import {ModuleManager} from "@spatulox/discord-module";
import {Bot} from "@spatulox/simplediscordbot";

/**
 * Registers every module of the bot and enables them.
 * The dice bot has none yet : register them here when needed, e.g.
 * `this.manager.register(new MyModule())`.
 *
 * Build it with `await RegisterModules.create()` so modules exist before
 * the interactions that may depend on them are registered.
 */
export class RegisterModules {

    private manager: ModuleManager

    private constructor() {
        this.manager = ModuleManager.createOrGetInstance(Bot.client)
    }

    static async create(): Promise<RegisterModules> {
        const instance = new RegisterModules()
        await instance.init()
        return instance
    }

    private async init() {
        if (Bot.client && Bot.client.user) {
            this.manager.enableAll()
        }
    }
}
