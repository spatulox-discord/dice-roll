# Discord Bot Template

[![discord.js](https://img.shields.io/github/package-json/dependency-version/Spatulox/DiscordBotTemplate/discord.js?logo=discord&logoColor=white&label=discord.js)](https://discord.js.org/)
[![simplediscordbot](https://img.shields.io/github/package-json/dependency-version/Spatulox/DiscordBotTemplate/@spatulox%2Fsimplediscordbot?label=simplediscordbot)](https://github.com/spatulox-discord/SimpleDiscordBot)

A ready-to-use Discord bot template built on
[SimpleDiscordBot](https://github.com/spatulox-discord/SimpleDiscordBot).

The framework handles login, logging, modules, interactions and command
deployment, so this repository only contains what is specific to *your* bot.

| Package | Role |
|---|---|
| [`@spatulox/simplediscordbot`](https://www.npmjs.com/package/@spatulox/simplediscordbot) | `Bot` (auto-login + logs), `EmbedManager`, `GuildManager`, `Time`, `FileManager`, `DiscordRegex`… |
| [`@spatulox/discord-module`](https://www.npmjs.com/package/@spatulox/discord-module) | `Module` / `ModuleManager` / `ModuleUI` (toggleable features) and `InteractionsManager` |
| `dim` (bundled with the two above) | Interactive CLI that **generates** the `handler/*.json` interactions and deploys them to Discord |

The full documentation lives in the [wiki](../../wiki).

## Compatibility

| Template | discord.js | `@spatulox/simplediscordbot` | Node |
|---|---|---|---|
| current | 14.x | 4.x | >= 18.17 |

The badges above read `package.json` straight from the repository, so they
always show what this branch actually depends on — nothing to keep in sync by
hand.

A new discord.js major means a new template major. The
[releases](../../releases) say what changed, and each one is tagged:
`git checkout <tag>` gets you back the state that worked with the previous
major.

### Upgrading from `@spatulox/simplediscordbot` 3.x

Only `DISCORD_BOT_DEV=true` (or `1`) enables the dev mode now — with 3.x, any
non-empty value did, `false` included. Check your `.env` before deploying. The other
breaking changes (`toInteractionEdit()` replaced by `toInteractionUpdate()`,
`GuildManager.searchMember(guildId, memberId)`…) are listed in the
[SimpleDiscordBot changelog](https://github.com/spatulox-discord/SimpleDiscordBot/blob/master/CHANGELOG.md).

## Setup

```bash
npm install
cp .env.example .env   # then fill DISCORD_BOT_TOKEN and DISCORD_BOT_CLIENTID
```

Then fill the channel and guild ids in `src/constantes.ts`.

## Run

```bash
npm run dev     # nodemon + ts-node, restarts on every .ts change
npm start       # build then run dist/
```

> Always run from the repository root : the `.env` and `handler/` paths are
> resolved from the current working directory.

## Manage the slash commands / context menus

```bash
npx dim
```

`dim` ([DiscordInteractionManager](https://github.com/spatulox-discord/DiscordInteractionManager))
is an interactive CLI. **You never have to write the json by hand** — it
generates it for you:

```
💠 Discord Interaction Manager CLI
════════════════════════════════════════
1. Manage Interactions      -> deploy / update / delete / list
2. Generate Files           -> create a slash command or a context menu json
3. Help
4. Exit
```

- **Generate Files** walks you through name, description, options, permissions
  and scope, then writes the json into the right folder.
- **Manage Interactions** deploys it to Discord, and writes the id Discord
  assigned back into the file — commit that, it is what later updates target.
- Listing can also pull the commands already registered on Discord back down
  into json files, under `generated_commands/`.

### Where the files go

`dim` reads and writes `<DISCORD_INTERACTION_FOLDER>/<category>` and appends
`_dev` when `DISCORD_BOT_DEV=true` — exactly the convention
`src/utils/HandlersPath.ts` uses to read them back at runtime.

Its default folder is `./handlers`; this template sets
`DISCORD_INTERACTION_FOLDER=./handler` in `.env` to keep the singular name used
by the rest of the project. Change either one, change both.

### The fields it manages

| Field | Who fills it |
|---|---|
| `name`, `description`, `options`, `contexts`… | you, through the generator |
| `command_scope` | you, at generation time — `"global"` or `"guild"` |
| `default_member_permissions_string` | you — an array of discord.js `PermissionFlagsBits` keys, e.g. `["ModerateMembers"]`, empty for everyone |
| `default_member_permissions` | `dim`, computed from the field above |
| `id` | `dim`, after the first deploy — a string when global, a `{guildId: id}` map when guild-scoped |

> Changing the scope of an existing interaction needs **both** `command_scope`
> and `id` edited to the matching shape. A plain update will not do it.

## Dev vs prod

`DISCORD_BOT_DEV` drives two things at once:

- `handler/commands_dev/` and `handler/context_menu_dev/` are loaded instead of
  `handler/commands/` and `handler/context_menu/`. The `_dev` files declare a
  different `name`, so your dev bot and your prod bot can live on Discord side
  by side.
- `src/constantes.ts` returns the DEV ids instead of the PROD ones.

Only `DISCORD_BOT_DEV=true` (or `1`) means dev. Anything else — `false`, `0`,
empty, absent — means production. The bot and the `dim` CLI follow the same
rule.

## Layout

```
handler/                  interaction manifests, generated + deployed by `dim`
  commands/               slash commands (prod)
  commands_dev/           slash commands (dev), different `name`
  context_menu/           context menus (prod)
  context_menu_dev/       context menus (dev)
src/
  index.ts                entry point : builds the Bot and registers everything
  client.ts               the discord.js Client and its intents
  constantes.ts           channel / guild ids, switched on DISCORD_BOT_DEV
  activities.ts           activities randomly displayed by the bot
  interactions/           the code behind each interaction
    commands/ context-menu/ modal/ selectmenu/ buttons/
  modules/                toggleable features listening to Discord events
  utils/
    HandlersPath.ts       loads handler json, dev/prod aware
    RegisterInteractions.ts  maps interaction names -> functions
    RegisterModules.ts    registers and enables the modules
    rateLimiter.ts        per-user rate limit helper
```

## Add a slash command

1. `npx dim` -> **Generate Files** -> slash command. It writes
   `handler/commands/mycommand.json` for you. Run it once with
   `DISCORD_BOT_DEV=true` and once with `false` to get the `_dev` twin, giving the
   dev one a different `name`.
2. Add `'mycommand'` to `HANDLERS_PATHS.commands` in `src/utils/HandlersPath.ts`
   — it is a typed whitelist, `Handlers.load` throws for anything missing.
3. Write the handler in `src/interactions/commands/mycommand.ts`.
4. Register it in `RegisterInteraction.slash()`:
   ```ts
   const json = await Handlers.load('commands', 'mycommand');
   this.manager.registerSlash(json.name, mycommand)
   ```
5. `npx dim` -> **Manage Interactions** to deploy it to Discord.

Buttons, modals and select menus follow the same pattern, minus the json
(their name is the `customId` you set). `InteractionMatchType.START_WITH`
lets one handler serve every `customId` sharing a prefix.

## Add a module

Extend `Module` (or `ModuleWithCache` for persistent state), declare the
Discord events it listens to, and register it in `RegisterModules.init()`.
Modules can be enabled/disabled live from the `ModuleUI` panel posted in the
`module_ui` channel — see `src/modules/ExampleModule.ts`.

## Multi-bot

The `feat/multi-bot` branch holds the same template arranged for several bots
running side by side from one repository, with a shared `src/share/` folder.
