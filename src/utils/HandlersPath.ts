import {BotEnv, FileManager} from "@spatulox/simplediscordbot";

/**
 * Every handler json file available under handler/<category>/.
 * Add an entry here when you add a new json file, otherwise load() throws.
 */
const HANDLERS_PATHS: Record<HandlerCategory, readonly string[]> = {
    commands: [
        'example'
    ],
    context_menu: [
        'example'
    ]
} as const;

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
 * Paths are resolved from the current working directory : always run the bot
 * from the repository root.
 */
export class Handlers {

    private static get path(): string {
        return BotEnv.dev ? "_dev" : ""
    }

    private static handlerExists(category: HandlerCategory, handler: string): boolean {
        return HANDLERS_PATHS[category].includes(handler);
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

        const path = `./handler/${category}${this.path}/${handler}.json`;

        try {
            const data = await FileManager.readJsonFile(path)
            jsonCache[cacheKey] = data;
            return data;
        } catch (error) {
            throw new Error(`Failed to load ${path}: ${error}`);
        }
    }
}
