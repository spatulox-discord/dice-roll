import {ModuleManager} from "@spatulox/discord-module";
import {Bot} from "@spatulox/simplediscordbot";
import {ExampleModule} from "../modules/ExampleModule";

/**
 * Registers every module of the bot and enables them.
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
        this.manager.register(new ExampleModule())

        if (Bot.client && Bot.client.user) {
            this.manager.enableAll()
        }
    }
}
