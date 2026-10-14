import dotenv from "dotenv";

// Loaded before importing the framework: BotEnv reads process.env at import time.
dotenv.config({path: "./.env"});

import {Bot, BotConfig, Time} from "@spatulox/simplediscordbot"
import {Events} from "discord.js";
import {client} from "./client";
import {activities} from "./activities";
import {CHANNELS} from "./constantes";
import {RegisterInteraction} from "./utils/RegisterInteractions";
import {RegisterModules} from "./utils/RegisterModules";

async function main() {
    const config: BotConfig = {
        log: {
            info: {channelId: CHANNELS.log, console: true, discord: false},
            error: {channelId: CHANNELS.error, console: true, discord: false},
            warn: {channelId: CHANNELS.error, console: true, discord: false},
            debug: {channelId: CHANNELS.error, console: true, discord: false}
        }
    };

    const bot = new Bot(client, config);

    // The client is built with captureRejections : a rejected listener (a handler that throws,
    // an interaction with no handler...) is re-emitted as an "error" event, and Node kills the
    // process when nobody listens to it
    bot.client.on(Events.Error, (error) => {
        Bot.log.error(`Discord client error : ${error}`)
    })
    process.on("unhandledRejection", (reason) => {
        Bot.log.error(`Unhandled rejection : ${reason}`)
    })

    bot.client.once(Events.ClientReady, async () => {
        try {
            // Modules first : an interaction may need a module instance
            await RegisterModules.create()
            await RegisterInteraction.create()

            Bot.setRandomActivity(activities, Time.hour.HOUR_01.toMilliseconds())
        } catch (error) {
            Bot.log.error(`Failed to start the bot : ${error}`)
        }
    })

    // The login gave up (no network yet at boot, bad token...) : exit so Docker restarts the bot
    if (!await bot.started) {
        process.exit(1)
    }
}
main().catch((error) => {
    console.error(`Failed to start the bot : ${error}`)
    process.exit(1)
})
