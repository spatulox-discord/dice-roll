import {BotEnv} from "@spatulox/simplediscordbot";

/**
 * Discord IDs used by the bot.
 * Every value switches on the DISCORD_BOT_DEV env var, so the dev bot and the
 * prod bot can run against different servers without touching the code.
 *
 * Regexes and the zero-width SPACE constant live in `DiscordRegex`
 * (exported by @spatulox/simplediscordbot) : import it instead of redefining them.
 */

const DEV_CHANNELS = {
    log: "your-dev-log-channel-id",
    error: "your-dev-error-channel-id",
    module_ui: "your-dev-module-panel-channel-id"
} as const;

const PROD_CHANNELS = {
    log: "your-log-channel-id",
    error: "your-error-channel-id",
    module_ui: "your-module-panel-channel-id"
} as const;

export const CHANNELS = BotEnv.dev ? DEV_CHANNELS : PROD_CHANNELS;

export const GUILD_ID = BotEnv.dev ? "your-dev-guild-id" : "your-guild-id";
