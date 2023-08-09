import numeral from 'numeral'

/**
 * Generate random int in range
 * @param min min number
 * @param max max number
 * @returns int number
 */
export function getRandomInt(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
}

export function numberFormat(input: any, format: string = '0[.][00]a') {
    return numeral(input).format(format)
}

export function checkRank(overall_points: number) {
    const ranksArray = Object.values(RanksPoint).filter(
        (v) => !isNaN(parseInt(v.toString()))
    ) as number[]
    return ranksArray.some((v) => overall_points == v)
}

export function getRankKeys() {
    return Object.values(RanksPoint).filter((v) =>
        isNaN(parseInt(v.toString()))
    ) as string[]
}

export function getRankValues() {
    return Object.values(RanksPoint).filter(
        (v) => !isNaN(parseInt(v.toString()))
    ) as number[]
}

/**
    Return keyof Enum Ranks
*/
export function getRank(overall_points: number) {
    if (overall_points < 0) return null
    return getRankKeys().reverse()[
        getRankValues()
            .reverse()
            .findIndex((v: number) => Math.floor(overall_points) >= v)
    ]
}

export function getRankV2(overall_points: number): RanksNames {
    if (overall_points >= RanksPoint.Challenger) {
        return RanksNames.Challenger
    }
    if (overall_points >= RanksPoint.Grandmaster) {
        return RanksNames.Grandmaster
    }
    if (overall_points >= RanksPoint.Master) {
        return RanksNames.Master
    }
    if (overall_points >= RanksPoint.Diamond) {
        return RanksNames.Diamond
    }
    if (overall_points >= RanksPoint.Platinum) {
        return RanksNames.Platinum
    }
    if (overall_points >= RanksPoint.Gold) {
        return RanksNames.Gold
    }
    if (overall_points >= RanksPoint.Silver) {
        return RanksNames.Silver
    }
    if (overall_points >= RanksPoint.Bronze) {
        return RanksNames.Bronze
    }

    return RanksNames.Iron
}

export enum RanksNames {
    Iron,
    Bronze,
    Silver,
    Gold,
    Platinum,
    Diamond,
    Master,
    Grandmaster,
    Challenger,
}

export enum RanksPoint {
    Iron = 0,
    Bronze = 100,
    Silver = 1_000,
    Gold = 5_000,
    Platinum = 10_000,
    Diamond = 20_000,
    Master = 100_000,
    Grandmaster = 1_000_000,
    Challenger = 1_000_000_000,
}

export type KeyOfRanks = keyof typeof RanksPoint
