/**
 * Parses a tabletop dice formula into terms.
 *
 * Supported : `NdS` (N defaults to 1), `d%` (= d100), constants, `+` / `-` between terms,
 * and one filter per dice term :
 * - `kh` / `kl` / `dh` / `dl` + an optional number of dice (default 1) : keeps / drops the N highest / lowest dice,
 *   e.g. `2d20kh1` (advantage), `4d6kh3`, `4d6dl1`
 * - `<` `<=` `>` `>=` or `=` + a face value : counts the dice matching it as successes, e.g. `4d6<=3`, `6d10>=8`
 * Examples : `1d20+5`, `2d20kh1 + 1d4 - 1`, `6d10>=8+1`, `d%`.
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

export type CompareOperator = '<' | '<=' | '>' | '>=' | '=';

/** Keeps (kh / kl) or drops (dh / dl) the `count` highest / lowest dice, the others count for nothing */
export type KeepFilter = {
    type: 'keep'
    mode: KeepMode
    count: number
};

/** Counts the dice whose face matches `operator value` : the term is worth the number of successes */
export type SuccessFilter = {
    type: 'success'
    operator: CompareOperator
    value: number
};

export type DiceFilter = KeepFilter | SuccessFilter;

export type DiceTerm = {
    kind: 'dice'
    sign: 1 | -1
    count: number
    sides: number
    filter: DiceFilter | null
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

const TERM_REGEX = /([+-])?(?:(\d*)d(\d+|%)(?:(kh|kl|dh|dl)(\d*)|(<=|>=|<|>|=)(\d+))?|(\d+))/y;

export function parseFormula(input: string): DiceFormula {
    const formula = input.replace(/\s+/g, '').toLowerCase();

    if (!formula) {
        throw new DiceParseError('The formula is empty.');
    }
    if (formula.length > LIMITS.formulaLength) {
        throw new DiceParseError(`The formula is too long (${LIMITS.formulaLength} characters max).`);
    }

    const terms: Term[] = [];
    let totalDice = 0;
    TERM_REGEX.lastIndex = 0;

    while (TERM_REGEX.lastIndex < formula.length) {
        const start = TERM_REGEX.lastIndex;
        const match = TERM_REGEX.exec(formula);

        if (!match) {
            throw new DiceParseError(`Invalid formula near \`${formula.slice(start)}\`. Example: \`2d20+3\`, \`4d6kh3\`.`);
        }

        const [, signChar, countStr, sidesStr, keepMode, keepCountStr, operator, operatorValue, constantStr] = match;

        if (terms.length > 0 && !signChar) {
            throw new DiceParseError(`Missing a \`+\` or a \`-\` before \`${match[0]}\`.`);
        }
        if (terms.length >= LIMITS.maxTerms) {
            throw new DiceParseError(`Too many terms (${LIMITS.maxTerms} max).`);
        }

        const sign = signChar === '-' ? -1 : 1;

        if (constantStr !== undefined) {
            const value = parseInt(constantStr, 10);
            if (value > LIMITS.maxConstant) {
                throw new DiceParseError(`The modifier \`${value}\` is too big (${LIMITS.maxConstant} max).`);
            }
            terms.push({kind: 'constant', sign, value});
            continue;
        }

        const count = countStr ? parseInt(countStr, 10) : 1;
        const sides = sidesStr === '%' ? 100 : parseInt(sidesStr!, 10);

        if (count < 1) {
            throw new DiceParseError('You must roll at least one die.');
        }
        if (count > LIMITS.dicePerTerm) {
            throw new DiceParseError(`Too many dice in \`${match[0]}\` (${LIMITS.dicePerTerm} max).`);
        }
        if (sides < LIMITS.minSides || sides > LIMITS.maxSides) {
            throw new DiceParseError(`A die must have between ${LIMITS.minSides} and ${LIMITS.maxSides} sides.`);
        }

        totalDice += count;
        if (totalDice > LIMITS.totalDice) {
            throw new DiceParseError(`Too many dice in total (${LIMITS.totalDice} max).`);
        }

        let filter: DiceFilter | null = null;
        if (keepMode) {
            const keepCount = keepCountStr ? parseInt(keepCountStr, 10) : 1;
            const keeps = keepMode === 'kh' || keepMode === 'kl';

            if (keeps && (keepCount < 1 || keepCount > count)) {
                throw new DiceParseError(`\`${match[0]}\`: you can keep between 1 and ${count} dice.`);
            }
            if (!keeps && (keepCount < 1 || keepCount >= count)) {
                throw new DiceParseError(`\`${match[0]}\`: you cannot drop every die.`);
            }
            filter = {type: 'keep', mode: keepMode as KeepMode, count: keepCount};
        } else if (operator) {
            const success: SuccessFilter = {type: 'success', operator: operator as CompareOperator, value: parseInt(operatorValue!, 10)};
            if (!Array.from({length: sides}, (_, face) => face + 1).some(face => matchesValue(face, success))) {
                throw new DiceParseError(`\`${match[0]}\`: no face of a d${sides} can match this comparison.`);
            }
            filter = success;
        }

        terms.push({kind: 'dice', sign, count, sides, filter});
    }

    if (!terms.some(term => term.kind === 'dice')) {
        throw new DiceParseError('The formula must contain at least one die (e.g. `1d20`).');
    }

    // "d6kh1" becomes "1d6kh1" : the canonical form can be longer than the input
    const normalized = formatFormula(terms);
    if (normalized.length > LIMITS.formulaLength) {
        throw new DiceParseError(`The formula is too long (${LIMITS.formulaLength} characters max).`);
    }

    return {terms, normalized};
}

export function formatTerm(term: Term): string {
    if (term.kind === 'constant') {
        return `${term.value}`;
    }
    return `${term.count}d${term.sides}${term.filter ? formatFilter(term.filter) : ''}`;
}

export function formatFilter(filter: DiceFilter): string {
    return filter.type === 'keep' ? `${filter.mode}${filter.count}` : `${filter.operator}${filter.value}`;
}

/** True when a die showing `face` is a success */
export function matchesValue(face: number, {operator, value}: SuccessFilter): boolean {
    switch (operator) {
        case '<':
            return face < value;
        case '<=':
            return face <= value;
        case '>':
            return face > value;
        case '>=':
            return face >= value;
        case '=':
            return face === value;
    }
}

function formatFormula(terms: Term[]): string {
    return terms
        .map((term, index) => {
            const sign = term.sign === -1 ? '-' : index === 0 ? '' : '+';
            return `${sign}${formatTerm(term)}`;
        })
        .join('');
}
