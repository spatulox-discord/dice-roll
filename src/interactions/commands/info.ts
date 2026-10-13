import {ChatInputCommandInteraction, EmbedBuilder} from "discord.js";
import {Bot, EmbedManager} from "@spatulox/simplediscordbot";
import {LIMITS} from "../../dice/parser";
import {FILTER_FIELD_NAME} from "../../dice/format";
import {RATE_LIMIT} from "../../dice/reply";

/**
 * /info : how to write a formula (keep / drop rules included) and how to read a result.
 * Ephemeral, so asking for help does not flood the channel.
 */
export async function info(interaction: ChatInputCommandInteraction) {
    try {
        await interaction.reply(EmbedManager.toInteraction(buildInfoEmbed(), true))
    } catch (error) {
        Bot.log.error(`info command failed : ${error}`)
    }
}

export function buildInfoEmbed(): EmbedBuilder {
    const embed = EmbedManager.create()
        .setTitle("🎲 Dice Roll : mode d'emploi")
        .setDescription("Lance des dés avec `/roll formule:<formule>`. Ajoute `prive:vrai` pour un lancer secret, visible par toi seul.")

    return EmbedManager.fields(embed, [
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
            name: "🎯 Garder ou retirer des dés",
            value: [
                "À coller juste après un groupe de dés, suivi du nombre de dés visés (1 par défaut) :",
                "`kh` *keep highest* : garde les plus hauts. `4d6kh3` garde les 3 meilleurs",
                "`kl` *keep lowest* : garde les plus bas. `2d20kl1` garde le pire",
                "`dh` *drop highest* : retire les plus hauts. `3d8dh1` retire le meilleur",
                "`dl` *drop lowest* : retire les plus bas. `4d6dl1` retire le pire",
                "Avantage : `2d20kh1`, désavantage : `2d20kl1`"
            ].join("\n")
        },
        {
            name: "📊 Lire le résultat",
            value: [
                "**Tapis de jeu** : les dés qui comptent, une ligne par groupe de dés",
                "**Total des dés**, puis les **modificateurs** et le **total** final",
                "Avec `kh` / `kl` / `dh` / `dl` : un mini tapis montre tous les dés lancés et le total sans filtre,",
                `et le champ **${FILTER_FIELD_NAME}** liste les dés gardés (\`kh\`/\`kl\`) ou retirés (\`dh\`/\`dl\`)`,
                "Sur un d20 seul (`1d20+5`, `2d20kh1`…) : 20 naturel = ✨ **réussite critique**, 1 naturel = 💀 **échec critique**"
            ].join("\n")
        },
        {
            name: "🔁 Relancer",
            value: "Le bouton **🎲 Relancer** sous un résultat relance la même formule pour toi, avec la même visibilité (public ou secret)."
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
