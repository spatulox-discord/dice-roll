/**
 * Parses a tabletop dice formula into terms.
 *
 * Supported : `NdS` (N defaults to 1), `d%` (= d100), constants, `+` / `-` between terms,
 * and keep / drop rules on a dice term : `kh` `kl` `dh` `dl` followed by an optional count (default 1).
 * Examples : `1d20+5`, `4d6kh3`, `2d20kl1 + 1d4 - 1`, `d%`.
 */

export const LIMITS = {
    /** Keeps the formula small enough to fit in a button customId */
    formulaLength: 80,
    dicePerTerm: 100,
    totalDice: 200,
    minSides: 2,
    maxSides: 1000,
    maxConstant: 10_000,
    maxTerms: 20
} as const;

export type KeepMode = 'kh' | 'kl' | 'dh' | 'dl';

export type KeepRule = {
    mode: KeepMode
    count: number
};

export type DiceTerm = {
    kind: 'dice'
    sign: 1 | -1
    count: number
    sides: number
    keep: KeepRule | null
};

export type ConstantTerm = {
    kind: 'constant'
    sign: 1 | -1
    value: number
};

export type Term = DiceTerm | ConstantTerm;

export type DiceFormula = {
    terms: Term[]
    /** Canonical form of the formula, e.g. "4d6kh3+2" */
    normalized: string
};

export class DiceParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DiceParseError';
    }
}

const TERM_REGEX = /([+-])?(?:(\d*)d(\d+|%)(?:(kh|kl|dh|dl)(\d*))?|(\d+))/y;

export function parseFormula(input: string): DiceFormula {
    const formula = input.replace(/\s+/g, '').toLowerCase();

    if (!formula) {
        throw new DiceParseError('La formule est vide.');
    }
    if (formula.length > LIMITS.formulaLength) {
        throw new DiceParseError(`La formule est trop longue (${LIMITS.formulaLength} caractères maximum).`);
    }

    const terms: Term[] = [];
    let totalDice = 0;
    TERM_REGEX.lastIndex = 0;

    while (TERM_REGEX.lastIndex < formula.length) {
        const start = TERM_REGEX.lastIndex;
        const match = TERM_REGEX.exec(formula);

        if (!match) {
            throw new DiceParseError(`Formule invalide près de \`${formula.slice(start)}\`. Exemple : \`2d20+3\`, \`4d6kh3\`.`);
        }

        const [, signChar, countStr, sidesStr, keepMode, keepCountStr, constantStr] = match;

        if (terms.length > 0 && !signChar) {
            throw new DiceParseError(`Il manque un \`+\` ou un \`-\` avant \`${match[0]}\`.`);
        }
        if (terms.length >= LIMITS.maxTerms) {
            throw new DiceParseError(`Trop de termes (${LIMITS.maxTerms} maximum).`);
        }

        const sign = signChar === '-' ? -1 : 1;

        if (constantStr !== undefined) {
            const value = parseInt(constantStr, 10);
            if (value > LIMITS.maxConstant) {
                throw new DiceParseError(`Le modificateur \`${value}\` est trop grand (${LIMITS.maxConstant} maximum).`);
            }
            terms.push({kind: 'constant', sign, value});
            continue;
        }

        const count = countStr ? parseInt(countStr, 10) : 1;
        const sides = sidesStr === '%' ? 100 : parseInt(sidesStr!, 10);

        if (count < 1) {
            throw new DiceParseError('Il faut lancer au moins un dé.');
        }
        if (count > LIMITS.dicePerTerm) {
            throw new DiceParseError(`Trop de dés dans \`${match[0]}\` (${LIMITS.dicePerTerm} maximum).`);
        }
        if (sides < LIMITS.minSides || sides > LIMITS.maxSides) {
            throw new DiceParseError(`Un dé doit avoir entre ${LIMITS.minSides} et ${LIMITS.maxSides} faces.`);
        }

        totalDice += count;
        if (totalDice > LIMITS.totalDice) {
            throw new DiceParseError(`Trop de dés au total (${LIMITS.totalDice} maximum).`);
        }

        let keep: KeepRule | null = null;
        if (keepMode) {
            const keepCount = keepCountStr ? parseInt(keepCountStr, 10) : 1;
            const isKeep = keepMode === 'kh' || keepMode === 'kl';

            if (isKeep && (keepCount < 1 || keepCount > count)) {
                throw new DiceParseError(`\`${match[0]}\` : on peut garder entre 1 et ${count} dé(s).`);
            }
            if (!isKeep && (keepCount < 1 || keepCount >= count)) {
                throw new DiceParseError(`\`${match[0]}\` : on ne peut pas retirer tous les dés.`);
            }
            keep = {mode: keepMode as KeepMode, count: keepCount};
        }

        terms.push({kind: 'dice', sign, count, sides, keep});
    }

    if (!terms.some(term => term.kind === 'dice')) {
        throw new DiceParseError('La formule doit contenir au moins un dé (ex. `1d20`).');
    }

    // "d6kh" becomes "1d6kh1" : the canonical form can be longer than the input
    const normalized = formatFormula(terms);
    if (normalized.length > LIMITS.formulaLength) {
        throw new DiceParseError(`La formule est trop longue (${LIMITS.formulaLength} caractères maximum).`);
    }

    return {terms, normalized};
}

export function formatTerm(term: Term): string {
    if (term.kind === 'constant') {
        return `${term.value}`;
    }
    const keep = term.keep ? `${term.keep.mode}${term.keep.count}` : '';
    return `${term.count}d${term.sides}${keep}`;
}

function formatFormula(terms: Term[]): string {
    return terms
        .map((term, index) => {
            const sign = term.sign === -1 ? '-' : index === 0 ? '' : '+';
            return `${sign}${formatTerm(term)}`;
        })
        .join('');
}
