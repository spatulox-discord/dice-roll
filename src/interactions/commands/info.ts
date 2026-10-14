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
            name: "🎯 Keeping the best or worst dice",
            value: [
                "Right after a group of dice, followed by a **number of dice** (1 by default):",
                "`kh` *keep highest*: `4d6kh3` keeps the 3 highest dice",
                "`kl` *keep lowest*: `4d6kl3` keeps the 3 lowest dice",
                "`dh` *drop highest*: `3d8dh1` drops the highest die",
                "`dl` *drop lowest*: `4d6dl1` drops the lowest die",
                "Advantage: `2d20kh1`, disadvantage: `2d20kl1`"
            ].join("\n")
        },
        {
            name: "✅ Counting successes",
            value: [
                "Right after a group of dice, a comparison (`<` `<=` `>` `>=` `=`) and a **face value**:",
                "every die matching it is a success, and the group is worth the **number of successes**",
                "`4d6<=3`: counts the dice showing 3 or less (roll under)",
                "`6d10>=8`: counts the dice showing 8 or more (dice pools)",
                "The total of the faces of the successes is shown too (`total = …`), modifiers add to the successes",
                "One filter (keep or count) per group of dice"
            ].join("\n")
        },
        {
            name: "📊 Reading the result",
            value: [
                "A table with the formula, one row per group of dice: the **rolls** and their **sum** (or successes)",
                "A `mod` row for the modifiers, and a `total` row when there is more than one row",
                "Dice that do not count (dropped, or failed) are between parentheses: `15 (7)`",
                `The **${FILTER_FIELD_NAME}** section explains each filter of the roll`
            ].join("\n")
        },
        {
            name: "🔁 Reroll",
            value: "The **🎲 Reroll** button, under the result, rolls the same formula again for you, with the same visibility (public or secret)."
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
