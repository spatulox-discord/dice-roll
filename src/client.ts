import {Client, GatewayIntentBits} from 'discord.js';

// Slash commands and buttons only need the Guilds intent (no privileged intent to enable)
export const client = new Client({ intents: [
    GatewayIntentBits.Guilds
    ]
});
