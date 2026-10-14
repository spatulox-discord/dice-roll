import {ContainerBuilder, User} from "discord.js";

/** Every text displayed by a Components V2 container (Discord caps their sum at 4000 characters) */
export function containerTexts(container: ContainerBuilder): string[] {
    const texts: string[] = [];
    const visit = (node: unknown) => {
        if (Array.isArray(node)) {
            node.forEach(visit);
        } else if (node && typeof node === "object") {
            const record = node as Record<string, unknown>;
            if (typeof record.content === "string") texts.push(record.content);
            Object.values(record).forEach(visit);
        }
    };
    visit(container.toJSON());
    return texts;
}

/** Just enough of a discord.js User for the builders */
export const fakeUser = {
    displayName: "Testeur_*du*_dé",
    displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png"
} as unknown as User;
