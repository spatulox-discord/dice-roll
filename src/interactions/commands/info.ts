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
        title: "## 🎲 Dice Roll : mode d'emploi",
        description: "Lance des dés avec `/roll formule:<formule>`. Ajoute `prive:vrai` pour un lancer secret, visible par toi seul.",
        separator: SeparatorSpacingSize.Small
    })

    return ComponentManager.fields(container, [
        {
            name: "📝 Écrire une formule",
            value: [
                "`1d20` : un dé à 20 faces (`d20` suffit)",
                "`3d6` : trois dés à 6 faces, additionnés",
                "`1d20+5` / `1d20-1` : un modificateur",
                "`2d6+1d4-2` : plusieurs termes, additionnés ou soustraits",
                "`d%` : un dé à 100 faces"
            ].join("\n")
        },
        {
            name: "🎯 Filtrer les dés",
            value: [
                "À coller juste après un groupe de dés. Le nombre qui suit est une **valeur de face**, pas un nombre de dés :",
                "`kh` *keep high* : garde les dés ≥ valeur. `4d6kh3` garde les 3, 4, 5 et 6",
                "`kl` *keep low* : garde les dés ≤ valeur. `6d6kl3` sur `[1] [5] [3] [3] [6] [2]` garde `[1] [3] [3] [2]`",
                "`dh` *drop high* : retire les dés ≥ valeur. `3d8dh7` retire les 7 et les 8",
                "`dl` *drop low* : retire les dés ≤ valeur. `4d6dl2` retire les 1 et les 2",
                "`k` + comparateur (`<` `<=` `>` `>=` `=`) : `5d6k<3`, `6d6k=6`",
                "Un seul filtre par groupe. Si aucun dé ne correspond, le groupe vaut 0"
            ].join("\n")
        },
        {
            name: "📊 Lire le résultat",
            value: [
                "**Tapis de jeu** : les dés qui comptent, une ligne par groupe de dés",
                "**Total des dés**, puis les **modificateurs** et le **total** final",
                "Avec un filtre : un mini tapis montre tous les dés lancés et le total sans filtre,",
                `et le champ **${FILTER_FIELD_NAME}** liste les dés gardés (\`kh\`/\`kl\`/\`k…\`) ou retirés (\`dh\`/\`dl\`)`
            ].join("\n")
        },
        {
            name: "🔁 Relancer",
            value: "Le bouton **🎲 Relancer**, à côté du total, relance la même formule pour toi, avec la même visibilité (public ou secret)."
        },
        {
            name: "⚠️ Limites",
            value: [
                `${LIMITS.formulaLength} caractères et ${LIMITS.maxTerms} termes par formule`,
                `${LIMITS.dicePerTerm} dés par groupe, ${LIMITS.totalDice} dés au total`,
                `De ${LIMITS.minSides} à ${LIMITS.maxSides} faces, modificateurs jusqu'à ${LIMITS.maxConstant}`,
                `${RATE_LIMIT.rolls} lancers toutes les ${RATE_LIMIT.windowMs / 1000} secondes par personne`
            ].join("\n")
        }
    ])
}
