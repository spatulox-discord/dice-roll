import path from "node:path";
import {BotEnv, FileManager} from "@spatulox/simplediscordbot";

// dist/utils/ -> <repo>/handlers, whatever the directory the bot is started from
const HANDLERS_DIR = path.resolve(__dirname, "../../handlers");

/**
 * Every handler json file available under handlers/<category>/.
 * Add an entry here when you add a new json file, otherwise load() throws.
 */
const HANDLERS_PATHS = {
    commands: [
        'roll',
        'info'
    ],
    context_menu: []
} as const satisfies Record<HandlerCategory, readonly string[]>;

type HandlerKey = UnionFromArray<ConcatArrays<typeof HANDLERS_PATHS>>;

type UnionFromArray<T extends readonly string[]> = T[number];
type ConcatArrays<T extends Record<string, readonly string[]>> = { [K in keyof T]: T[K] }[keyof T];

export type HandlerCategory = 'commands' | 'context_menu';

type JsonData = {
    name: string
};
const jsonCache: Partial<Record<string, JsonData>> = {};

/**
 * Loads handler json files dynamically, based on the "DISCORD_BOT_DEV" env var.
 */
export class Handlers {

    private static get path(): string {
        return BotEnv.dev ? "_dev" : ""
    }

    private static handlerExists(category: HandlerCategory, handler: string): boolean {
        return (HANDLERS_PATHS[category] as readonly string[]).includes(handler);
    }

    /**
     * Load a handler with cache
     * Usage: Handlers.load('commands', 'example')
     */
    public static async load(category: HandlerCategory, handler: HandlerKey): Promise<JsonData> {
        const cacheKey = `${category}/${handler}`;

        if (jsonCache[cacheKey]) {
            return jsonCache[cacheKey]!;
        }

        if (!this.handlerExists(category, handler)) {
            throw new Error(`Handler ${category}.${handler} not found in HANDLERS_PATHS var, plz update HANDLERS_PATHS`);
        }

        const filePath = path.join(HANDLERS_DIR, `${category}${this.path}`, `${handler}.json`);

        // readJsonFile does not throw : it logs and returns false on a missing or invalid file
        const data = await FileManager.readJsonFile(filePath)
        if (!data || typeof data.name !== "string") {
            throw new Error(`Failed to load ${filePath} : missing file or no "name" field`);
        }
        jsonCache[cacheKey] = data;
        return data;
    }
}
