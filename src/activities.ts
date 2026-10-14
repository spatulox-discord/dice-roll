import {RandomBotActivity} from "@spatulox/simplediscordbot";
import {ActivityType} from "discord.js";

/**
 * Activities randomly picked by Bot.setRandomActivity().
 */
export const activities: RandomBotActivity = [
    {type: ActivityType.Playing, message: "with dice 🎲"},
    {type: ActivityType.Watching, message: "for natural 20s"},
    {type: ActivityType.Listening, message: "/roll 1d20"},
    {type: ActivityType.Competing, message: "a dice rolling contest"}
];
