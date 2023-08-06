import { ColorResolvable } from "discord.js"
import { colorPalettes, colorsConfig } from "@configs"

/**
 * Get a color from the config
 * @param colorResolver The color to resolve
 * @returns
 */
export const getColor = (colorResolver: keyof typeof colorsConfig) => {

    return colorsConfig[colorResolver] as ColorResolvable
}

// https://stackoverflow.com/a/21648508/14660191
export const hexToRgb = (
    hex: string
): [red: number, green: number, blue: number] | null => {
    let c: any
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('')
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]]
        }
        c = '0x' + c.join('')
        return [(c >> 16) & 255, (c >> 8) & 255, c & 255]
    }
    return null
}

export const getPalette = (name: string = 'default') => {
    return (
        colorPalettes.find((p) => p.pName === name)?.colors ||
        colorPalettes.find((p) => p.pName === 'default')!.colors
    )
}
