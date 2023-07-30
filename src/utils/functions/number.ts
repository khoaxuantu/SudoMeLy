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

export function checkRank(overall_points: number) {
    const ranksArray = Object.values(Ranks).filter(
        (v) => !isNaN(parseInt(v.toString()))
    ) as number[]
    return ranksArray.some((v) => overall_points == v)
}

export function getRankKeys() {
    return Object.values(Ranks).filter((v) =>
        isNaN(parseInt(v.toString()))
    ) as string[]
}

export function getRankValues() {
    return Object.values(Ranks).filter(
        (v) => !isNaN(parseInt(v.toString()))
    ) as number[]
}

export function getRank(overall_points: number) {
    if (overall_points < 0) return null
    return getRankKeys().reverse()[
        getRankValues()
            .reverse()
            .findIndex((v: number) => Math.floor(overall_points) >= v)
    ]
}

export enum Ranks {
    Enjoyer = 0,
    Intern = 100,
    Fresher = 1_000,
    Junior = 5_000,
    Senior = 10_000,
    Vip = 15_000,
    Master = 100_000,
    Challenger = 1_000_000,
    Gigachad = 1_000_000_000,
}
