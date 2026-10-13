import {RandomBotActivity} from "@spatulox/simplediscordbot";
import {ActivityType} from "discord.js";

/**
 * Activities randomly picked by Bot.setRandomActivity().
 */
export const activities: RandomBotActivity = [
    {type: ActivityType.Playing, message: "aux dés 🎲"},
    {type: ActivityType.Watching, message: "les 20 naturels"},
    {type: ActivityType.Listening, message: "/roll 1d20"},
    {type: ActivityType.Competing, message: "un concours de 1 critiques"}
];
