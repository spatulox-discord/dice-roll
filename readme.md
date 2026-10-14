# Dice Roll 🎲

Discord dice roller bot, built on
[SimpleDiscordBot](https://github.com/spatulox-discord/SimpleDiscordBot) and the
[DiscordBotTemplate](https://github.com/Spatulox/DiscordBotTemplate).

| Package | Role |
|---|---|
| [`@spatulox/simplediscordbot`](https://www.npmjs.com/package/@spatulox/simplediscordbot) | `Bot` (auto-login + logs), `ComponentManager` (Components V2), `ButtonManager`… |
| [`@spatulox/discord-module`](https://www.npmjs.com/package/@spatulox/discord-module) | `InteractionsManager`: routes `/roll`, `/info` and the "Reroll" button |
| [`@spatulox/discord-interaction-manager`](https://www.npmjs.com/package/@spatulox/discord-interaction-manager) | `dim` CLI: deploys the commands to Discord |
| [`@spatulox/utils`](https://www.npmjs.com/package/@spatulox/utils) | `Time` (rate limit durations) |

## Quick start

### Step 0: Create the bot on the Discord Dev Portal

Resources:

- [Discord Dev Portal](https://discord.com/developers/applications)
- [Youtube video about the dev portal](https://youtu.be/zrNloK9b1ro)

1. **New Application**, give it a name.
2. **Bot** tab → **Reset Token** → copy the token. Keep it secret: anyone with it controls your bot.
   No privileged intent is needed, leave them off.
3. **Installation** tab → in the default install settings, add the `applications.commands` and `bot`
   scopes, then open the install link to add the bot to your server (or to your account, for a user install).

### Step 1: Fill in the `.env`

```bash
git clone https://github.com/spatulox-discord/dice-roll.git
cd dice-roll
cp .env.example .env
```

Then put your token in `.env`, that's the only required value:

```dotenv
DISCORD_BOT_TOKEN=the-token-from-step-0
```

### Step 2: Deploy the commands (once)

```bash
npm install
npx dim
```

**Manage Interactions** → **Command Manager** → **Global** → deploy `roll` and `info`.
See [Deploying the commands](#deploying-the-commands) for details.

### Step 3: Start the bot

```bash
docker compose up -d --build
```

That's it: try `/roll dice:1d20+5` or `/info` on Discord. The container restarts on its own when it crashes
and when Docker starts; to start Docker with the machine, see [With Docker](#with-docker-starts-with-the-machine).

## Usage

```
/roll dice:<formula> [private:<True|False>]
/info
```

`/info` shows (privately) how to use the bot: notation, face value filters (`kh3`, `kl3`, `dh3`, `dl3`, `k<3`…),
how to read a result, and the limits.

| Formula | Meaning |
|---|---|
| `1d20+5` | one d20, plus 5 |
| `d20` | same as `1d20` |
| `3d6+1d4-2` | several terms, added or subtracted |
| `d%` | one d100 |
| `6d6kl3` | keeps the dice showing **3 or less** (*keep low*) |
| `4d6kh3` | keeps the dice showing **3 or more** (*keep high*) |
| `4d6dl2` | removes the dice showing **2 or less** (*drop low*) |
| `3d8dh7` | removes the dice showing **7 or more** (*drop high*) |
| `5d6k<3` | keeps the dice whose face is < 3 (also `<=`, `>`, `>=`, `=`) |

Filters apply to the **face value** of each die, not to a number of dice: `6d6kl3` on
`[1] [5] [3] [3] [6] [2]` keeps `[1] [3] [3] [2]`, the 4 dice showing 3 or less. The number of kept dice
therefore changes from one roll to the next, and can be zero: the group is then worth 0. One filter per
group of dice, and the value is required (`kh` alone is rejected).

The result is a **Components V2** message: a header with the formula and the avatar of whoever rolled, then
the **game mat** (the dice that count, one line per term), then the dice total, the modifiers and the final
total, with the **🎲 Reroll** button next to it. When a group of dice has a filter, a mini mat below shows
every die rolled and the total without filter:

````
### 🎲 2d20kh10+1d4+3                         [avatar]
-# Rolled by Spatulox
─────────────────────────
```
2d20kh10  [15]
+1d4      [ 3]
```
Dice total: 18
Modifiers: +3
# Total: 21                                 [🎲 Reroll]
─────────────────────────
-# All dice, no filter:
-# 2d20  [15] [ 7]
-# +1d4  [ 3]
-# Total without filter: 28
─────────────────────────
Dice matching filter
2d20kh10 keeps dice ≥ 10 → [15]
````

The **Dice matching filter** section explains each filter and lists the dice it targets: the dice kept by
`kh` / `kl` / `k…`, the dice removed by `dh` / `dl`.

- **`private`** makes a secret roll: only you see the result.
- The **🎲 Reroll** button, next to the total, rolls the same formula again for whoever clicks it, with the same visibility.
- Limits: 80 characters, 100 dice per term, 200 dice in total, 2 to 1000 sides, 20 terms.
  Each user can roll 5 times every 10 seconds.

## Setup

```bash
npm install
cp .env.example .env
```

Then fill in `.env`:

| Variable | Value |
|---|---|
| `DISCORD_BOT_TOKEN` | the bot token ([Developer Portal](https://discord.com/developers/applications) → Bot) |
| `DISCORD_BOT_DEV` | optional: `true` = `/roll_dev` and `/info_dev` (`handlers/commands_dev/`). Absent = `/roll` and `/info` (`handlers/commands/`) |

The command files live in `handlers/`, the default folder of `dim`: no `DISCORD_INTERACTION_FOLDER` needed.

The bot only uses the `Guilds` intent: no privileged intent to enable in the portal.

## Deploying the commands

```bash
npx dim
```

**Manage Interactions** → **Command Manager** → **Global** → deploy `roll` and `info` (or `roll_dev` and `info_dev`
when `DISCORD_BOT_DEV=true`). `dim` writes the id Discord assigned into the JSON file: commit it, updates rely on it.

The commands are declared for both a server install **and** a user install (`integration_types: [0, 1]`). They can
be used in servers, in DMs with the bot and in group DMs (`contexts: [0, 1, 2]`).

## Running the bot

### Locally (development)

```bash
npm run dev     # nodemon: recompiles and restarts on every change in src/
npm start       # build, then run dist/
npm test        # parser, dice engine and message tests (node:test)
```

> Always run from the repository root: `.env` and `handlers/` are resolved from the current directory.

### With Docker (starts with the machine)

```bash
docker compose up -d --build
```

- `restart: unless-stopped`: the container restarts when it crashes and when Docker starts.
- If connecting to Discord fails (for instance the network is not ready yet at boot), the bot exits with code 1
  and Docker restarts it.
- To start Docker with the machine (Linux):

  ```bash
  sudo systemctl enable docker
  ```

  On Windows / macOS, enable "Start Docker Desktop when you sign in": the bot then starts when you log in.

Useful commands:

```bash
docker compose logs -f       # follow the logs
docker compose up -d --build # rebuild after a change
docker compose down          # stop
```

## Layout

```
handlers/
  commands/                 roll.json, info.json (prod), deployed by `dim`
  commands_dev/             roll_dev, info_dev (dev)
src/
  index.ts                  entry point: builds the Bot and registers the interactions
  client.ts                 discord.js client (Guilds intent)
  dice/
    parser.ts               formula → terms (+ limits and errors)
    roller.ts               rolls (crypto.randomInt), filters
    format.ts               result message in Components V2 (game mat) + "Reroll" button
    reply.ts                parse + roll + reply (shared by /roll and the button)
    *.test.ts               tests
  test/components.ts        test helpers for Components V2
  interactions/
    commands/roll.ts        /roll handler
    commands/info.ts        /info handler (how to use)
    buttons/reroll.ts       button handler (customId `dice_reroll|<p|s>|<formula>`)
  utils/                    HandlersPath, RegisterInteractions, RegisterModules, rateLimiter
Dockerfile
docker-compose.yml
```
