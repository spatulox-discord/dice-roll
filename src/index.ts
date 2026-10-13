import dotenv from "dotenv";

// Loaded before importing the framework: BotEnv reads process.env at import time.
dotenv.config({path: "./.env"});

import {Bot, BotConfig, Time} from "@spatulox/simplediscordbot"
import {Events} from "discord.js";
import {ModuleUI} from "@spatulox/discord-module";
import {client} from "./client";
import {activities} from "./activities";
import {CHANNELS} from "./constantes";
import {RegisterInteraction} from "./utils/RegisterInteractions";
import {RegisterModules} from "./utils/RegisterModules";

async function main() {
    const config: BotConfig = {
        botName: "My Bot",
        log: {
            info: {channelId: CHANNELS.log, console: true, discord: false},
            error: {channelId: CHANNELS.error, console: true, discord: false},
            warn: {channelId: CHANNELS.error, console: true, discord: false},
            debug: {channelId: CHANNELS.error, console: true, discord: false}
        }
    };

    const bot = new Bot(client, config);
    bot.client.once(Events.ClientReady, async () => {
        try {
            // Modules first : an interaction may need a module instance
            await RegisterModules.create()
            await RegisterInteraction.create()
            new ModuleUI(client, CHANNELS.module_ui)

            Bot.setRandomActivity(activities, Time.hour.HOUR_01.toMilliseconds())
        } catch (error) {
            Bot.log.error(`Failed to start the bot : ${error}`)
        }
    })
}
main()
