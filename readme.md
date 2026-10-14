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
npx dim web
```

The **web UI** of `dim` (preferred) opens in your browser: pick the **Global** scope, then deploy `roll` and `info`
from the **To deploy** list.

Prefer the terminal? `npx dim` starts the same tool as a CLI: **Manage Interactions** → **Command Manager** →
**Global** → deploy `roll` and `info`.

See [Deploying the commands](#deploying-the-commands) for details.

### Step 3: Start the bot

```bash
docker compose up -d --build
```

That's it: try `/roll dice:1d20+5` or `/info` on Discord. The container restarts on its own when it crashes
and when Docker starts; to start Docker with the machine, see [With Docker](#with-docker-starts-with-the-machine).

Prefer to start and stop the bot yourself (from Docker Desktop for instance)? Use the manual compose file instead:
it only creates the container, without starting it, and Docker never restarts it on its own:

```bash
docker compose -f docker-compose.manual.yml create --build
docker start dice-roll
```

See [With Docker (manual start)](#with-docker-manual-start) for details.

## Usage

```
/roll dice:<formula> [private:<True|False>]
/info
```

`/info` shows (privately) how to use the bot: notation, filters, how to read a result, and the limits.

| Formula | Meaning |
|---|---|
| `1d20+5` | one d20, plus 5 |
| `d20` | same as `1d20` |
| `3d6+1d4-2` | several terms, added or subtracted |
| `d%` | one d100 |
| `2d20kh1` / `2d20kl1` | advantage / disadvantage: keeps the highest / lowest of two d20 |
| `4d6kh3` | keeps the **3 highest** dice (*keep highest*), `kl` keeps the lowest |
| `4d6dl1` | drops the **lowest** die (*drop lowest*), `dh` drops the highest |
| `4d6<=3` | counts the dice showing **3 or less** as successes (roll under) |
| `6d10>=8` | counts the dice showing **8 or more** as successes (dice pools) |

- After `kh` / `kl` / `dh` / `dl`, the number is a **number of dice** (1 by default: `2d20kh` = `2d20kh1`).
- After a comparison (`<`, `<=`, `>`, `>=`, `=`), the number is a **face value**: the group is worth the
  **number of successes**, and the total of their faces is shown too. Modifiers add to the successes
  (`6d10>=8+1`). If no die succeeds, the group is worth 0.
- One filter (keep or count) per group of dice.

The result is a **Components V2** message: who rolled, a table of the roll, the **Filters** section when the
roll has a filter, and the **🎲 Reroll** button. For `2d20kh1+1d4+3`:

````
-# 🎲 Rolled by Spatulox
```
╔══════════════════════╗
║    2d20kh1+1d4+3     ║
╠══════╤════════╤══════╣
║ dice │ rolls  │ sum  ║
╟──────┼────────┼──────╢
║ 2d20 │ 15 (7) │ [15] ║
║ +1d4 │ 3      │ [3]  ║
║ mod  │        │  +3  ║
╟──────┴────────┼──────╢
║ total         │ [21] ║
╚═══════════════╧══════╝
```
Filters
`2d20kh1` keeps the highest die
-# (n) = not counted
[🎲 Reroll]
````

- One row per group of dice: its rolls and its sum. A `dice` column is added when there are several groups,
  a `mod` row for the modifiers, and a `total` row when there is more than one row.
- Dice that do not count (dropped by `kh`/`kl`/`dh`/`dl`, or failed in a success count) are between parentheses.
- For a success count, the sum column shows the number of successes and the total of their faces: `[3] total = 6`.
- Long rolls wrap over several lines. On huge rolls that do not fit in a Discord message, the rolls are replaced
  with `…` and the sums stay.
- **`private`** makes a secret roll: only you see the result.
- The **🎲 Reroll** button rolls the same formula again for whoever clicks it, with the same visibility.
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
npx dim web   # web UI (preferred)
npx dim       # same tool, as a CLI
```

In the web UI, pick the **Global** scope and deploy `roll` and `info` from the **To deploy** list (or `roll_dev`
and `info_dev` when `DISCORD_BOT_DEV=true`). After a change in a JSON file, the command shows up in the
**To update** list. In the CLI: **Manage Interactions** → **Command Manager** → **Global**.

`dim` writes the id Discord assigned into the JSON file: commit it, updates rely on it. The web UI is only
served on `127.0.0.1`, and stops with the command (Ctrl+C).

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

### With Docker (manual start)

To start and stop the bot yourself (from Docker Desktop for instance), without Docker restarting it on its own:

```bash
docker compose -f docker-compose.manual.yml create --build
```

- Builds the image and creates the `dice-roll` container **without starting it** (`restart: "no"`).
- Start / stop it with the ▶ / ■ buttons of Docker Desktop, or `docker start dice-roll` / `docker stop dice-roll`.
- Both compose files use the same container: switching from one to the other replaces it, so the bot never runs
  twice.

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
    format.ts               result message in Components V2 (table of the roll) + "Reroll" button
    reply.ts                parse + roll + reply (shared by /roll and the button)
    *.test.ts               tests
  test/components.ts        test helpers for Components V2
  interactions/
    commands/roll.ts        /roll handler
    commands/info.ts        /info handler (how to use)
    buttons/reroll.ts       button handler (customId `dice_reroll|<p|s>|<formula>`)
  utils/                    HandlersPath, RegisterInteractions, RegisterModules, rateLimiter
Dockerfile
docker-compose.yml          auto-restart (starts with Docker)
docker-compose.manual.yml   created only, started by hand
```
