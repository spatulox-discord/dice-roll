import {User} from "discord.js";

export {containerTexts} from "../dice/format";

/** Just enough of a discord.js User for the builders */
export const fakeUser = {
    displayName: "Testeur_*du*_dé",
    displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png"
} as unknown as User;
