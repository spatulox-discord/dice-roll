import {RandomBotActivity} from "@spatulox/simplediscordbot";
import {ActivityType} from "discord.js";

/**
 * Activities randomly picked by Bot.setRandomActivity().
 */
export const activities: RandomBotActivity = [
    {type: ActivityType.Playing, message: "with the Discord API"},
    {type: ActivityType.Watching, message: "the server"},
    {type: ActivityType.Listening, message: "your commands"},
    {type: ActivityType.Competing, message: "a template competition"}
];
