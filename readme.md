# Dice Roll 🎲

Bot Discord de lancer de dés, basé sur
[SimpleDiscordBot](https://github.com/spatulox-discord/SimpleDiscordBot) et le
[DiscordBotTemplate](https://github.com/Spatulox/DiscordBotTemplate).

| Package | Rôle |
|---|---|
| [`@spatulox/simplediscordbot`](https://www.npmjs.com/package/@spatulox/simplediscordbot) | `Bot` (login automatique + logs), `ComponentManager` (Components V2), `ButtonManager`… |
| [`@spatulox/discord-module`](https://www.npmjs.com/package/@spatulox/discord-module) | `InteractionsManager` : route `/roll` et le bouton « Relancer » |
| [`@spatulox/discord-interaction-manager`](https://www.npmjs.com/package/@spatulox/discord-interaction-manager) | CLI `dim` : déploie la commande `/roll` sur Discord |
| [`@spatulox/utils`](https://www.npmjs.com/package/@spatulox/utils) | `Time` (durées du rate limit) |

## Utilisation

```
/roll formule:<formule> [prive:<vrai|faux>]
/info
```

`/info` affiche (en privé) le mode d'emploi : notation, filtres par valeur de face (`kh3`, `kl3`, `dh3`, `dl3`, `k<3`…), lecture du résultat et limites.

| Formule | Signification |
|---|---|
| `1d20+5` | un d20, plus 5 |
| `d20` | équivalent à `1d20` |
| `3d6+1d4-2` | plusieurs termes, additionnés ou soustraits |
| `d%` | un d100 |
| `6d6kl3` | garde les dés qui font **3 ou moins** (*keep low*) |
| `4d6kh3` | garde les dés qui font **3 ou plus** (*keep high*) |
| `4d6dl2` | retire les dés qui font **2 ou moins** (*drop low*) |
| `3d8dh7` | retire les dés qui font **7 ou plus** (*drop high*) |
| `5d6k<3` | garde les dés dont la face est < 3 (aussi `<=`, `>`, `>=`, `=`) |

Les filtres portent sur la **valeur de la face** de chaque dé, pas sur un nombre de dés : `6d6kl3` sur
`[1] [5] [3] [3] [6] [2]` garde `[1] [3] [3] [2]`, soit les 4 dés qui font 3 ou moins. Le nombre de dés
gardés varie donc d'un lancer à l'autre, et peut être nul : le groupe vaut alors 0. Un seul filtre par
groupe de dés, et la valeur est obligatoire (`kh` seul est refusé).

Le résultat est un message en **Components V2** : un en-tête avec la formule et l'avatar de celui qui lance,
puis le **tapis de jeu** (les dés qui comptent, une ligne par terme), puis le total des dés, les modificateurs
et le total final, avec le bouton **🎲 Relancer** à côté. Quand un groupe de dés a un filtre, un mini tapis
en dessous montre tous les dés lancés et le total sans filtre :

````
### 🎲 2d20kh10+1d4+3                         [avatar]
-# Lancé par Spatulox
─────────────────────────
```
2d20kh10  [15]
+1d4      [ 3]
```
Total des dés : 18
Modificateurs : +3
# Total : 21                              [🎲 Relancer]
─────────────────────────
-# Tous les dés, sans filtre :
-# 2d20  [15] [ 7]
-# +1d4  [ 3]
-# Total sans filtre : 28
─────────────────────────
Dés correspondant au filtre
2d20kh10 garde les dés ≥ 10 → [15]
````

Le champ **Dés correspondant au filtre** explique chaque filtre et liste les dés qu'il vise : les dés gardés
pour `kh` / `kl` / `k…`, les dés retirés pour `dh` / `dl`.

- **`prive`** fait un lancer secret : seul toi vois le résultat.
- Le bouton **🎲 Relancer**, à côté du total, relance la même formule pour celui qui clique, avec la même visibilité.
- Limites : 80 caractères, 100 dés par terme, 200 dés au total, de 2 à 1000 faces, 20 termes.
  Chaque utilisateur peut faire 5 lancers par tranche de 10 secondes.

## Installation

```bash
npm install
cp .env.example .env
```

Puis remplis `.env` :

| Variable | Valeur |
|---|---|
| `DISCORD_BOT_TOKEN` | le token du bot ([Developer Portal](https://discord.com/developers/applications) → Bot) |
| `DISCORD_BOT_DEV` | `true` = commande `/roll_dev` (`handler/commands_dev/`), sinon `/roll` (`handler/commands/`) |
| `DISCORD_INTERACTION_FOLDER` | `./handler` (à laisser) |

Le bot n'utilise que l'intent `Guilds` : aucun intent privilégié à activer dans le portail.

## Déployer la commande `/roll`

```bash
npx dim
```

**Manage Interactions** → **Command Manager** → **Global** → déploie `roll` et `info` (ou `roll_dev` et `info_dev` si
`DISCORD_BOT_DEV=true`). `dim` écrit l'ID attribué par Discord dans le JSON : commite-le, les mises à jour
s'appuient dessus.

La commande est déclarée pour une installation sur un serveur **et** sur ton compte
(`integration_types: [0, 1]`). Elle est utilisable sur les serveurs, en MP avec le bot et dans les MP de groupe
(`contexts: [0, 1, 2]`).

## Lancer le bot

### En local (développement)

```bash
npm run dev     # nodemon : recompile et relance à chaque modification de src/
npm start       # build puis lancement de dist/
npm test        # tests du parseur et du moteur de dés (node:test)
```

> Lance toujours depuis la racine du repo : `.env` et `handler/` sont résolus depuis le dossier courant.

### Avec Docker (démarrage automatique avec le PC)

```bash
docker compose up -d --build
```

- `restart: unless-stopped` : le conteneur redémarre s'il plante et quand Docker démarre.
- Si la connexion à Discord échoue (par exemple réseau pas encore prêt au boot), le bot s'arrête avec le code 1
  et Docker le relance.
- Pour que Docker démarre avec la machine (Linux) :

  ```bash
  sudo systemctl enable docker
  ```

  Sous Windows/macOS, active « Start Docker Desktop when you sign in » : le bot démarre alors à l'ouverture de session.

Commandes utiles :

```bash
docker compose logs -f       # suivre les logs
docker compose up -d --build # reconstruire après une modification
docker compose down          # arrêter
```

## Structure

```
handler/
  commands/                 roll.json, info.json (prod), déployés par `dim`
  commands_dev/             roll_dev, info_dev (dev)
src/
  index.ts                  point d'entrée : crée le Bot et enregistre les interactions
  client.ts                 client discord.js (intent Guilds)
  dice/
    parser.ts               formule → termes (+ limites et erreurs)
    roller.ts               tirage (crypto.randomInt), filtres
    format.ts               message du résultat en Components V2 (tapis de jeu) + bouton « Relancer »
    reply.ts                parse + tire + répond (partagé par /roll et le bouton)
    *.test.ts               tests
  test/components.ts        aides de test pour les Components V2
  interactions/
    commands/roll.ts        handler de /roll
    commands/info.ts        handler de /info (mode d'emploi)
    buttons/reroll.ts       handler du bouton (customId `dice_reroll|<p|s>|<formule>`)
  utils/                    HandlersPath, RegisterInteractions, RegisterModules, rateLimiter
Dockerfile
docker-compose.yml
```
