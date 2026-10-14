import {ChatInputCommandInteraction, ContainerBuilder, SeparatorSpacingSize} from "discord.js";
import {Bot, ComponentManager} from "@spatulox/simplediscordbot";
import {LIMITS} from "../../dice/parser";
import {FILTER_FIELD_NAME} from "../../dice/format";
import {RATE_LIMIT} from "../../dice/reply";

/**
 * /info : how to write a formula (filters included) and how to read a result.
 * Ephemeral, so asking for help does not flood the channel.
 */
export async function info(interaction: ChatInputCommandInteraction) {
    try {
        await interaction.reply(ComponentManager.toInteraction(buildInfoContainer(), null, false, true))
    } catch (error) {
        Bot.log.error(`info command failed : ${error}`)
    }
}

export function buildInfoContainer(): ContainerBuilder {
    const container = ComponentManager.create({
        title: "## 🎲 Dice Roll: how to use",
        description: "Roll dice with `/roll dice:<formula>`. Add `private:True` for a secret roll that only you can see.",
        separator: SeparatorSpacingSize.Small
    })

    return ComponentManager.fields(container, [
        {
            name: "📝 Writing a formula",
            value: [
                "`1d20`: one 20-sided die (`d20` works too)",
                "`3d6`: three 6-sided dice, added together",
                "`1d20+5` / `1d20-1`: a modifier",
                "`2d6+1d4-2`: several terms, added or subtracted",
                "`d%`: one 100-sided die"
            ].join("\n")
        },
        {
            name: "🎯 Filtering dice",
            value: [
                "Put it right after a group of dice. The number that follows is a **face value**, not a number of dice:",
                "`kh` *keep high*: keeps the dice ≥ value. `4d6kh3` keeps the 3s, 4s, 5s and 6s",
                "`kl` *keep low*: keeps the dice ≤ value. `6d6kl3` on `[1] [5] [3] [3] [6] [2]` keeps `[1] [3] [3] [2]`",
                "`dh` *drop high*: removes the dice ≥ value. `3d8dh7` removes the 7s and 8s",
                "`dl` *drop low*: removes the dice ≤ value. `4d6dl2` removes the 1s and 2s",
                "`k` + comparison (`<` `<=` `>` `>=` `=`): `5d6k<3`, `6d6k=6`",
                "One filter per group. If no die matches, the group is worth 0"
            ].join("\n")
        },
        {
            name: "📊 Reading the result",
            value: [
                "**Game mat**: the dice that count, one line per group of dice",
                "**Dice total**, then the **modifiers** and the final **total**",
                "With a filter: a mini mat shows every die rolled and the total without filter,",
                `and the **${FILTER_FIELD_NAME}** section lists the dice kept (\`kh\`/\`kl\`/\`k…\`) or removed (\`dh\`/\`dl\`)`
            ].join("\n")
        },
        {
            name: "🔁 Reroll",
            value: "The **🎲 Reroll** button, next to the total, rolls the same formula again for you, with the same visibility (public or secret)."
        },
        {
            name: "⚠️ Limits",
            value: [
                `${LIMITS.formulaLength} characters and ${LIMITS.maxTerms} terms per formula`,
                `${LIMITS.dicePerTerm} dice per group, ${LIMITS.totalDice} dice in total`,
                `${LIMITS.minSides} to ${LIMITS.maxSides} sides, modifiers up to ${LIMITS.maxConstant}`,
                `${RATE_LIMIT.rolls} rolls every ${RATE_LIMIT.windowMs / 1000} seconds per person`
            ].join("\n")
        }
    ])
}
