import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    type CommandInteraction,
    type GuildMember,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    User as DUser,
} from 'discord.js'
import {
    Client,
    SimpleCommand,
    SimpleCommandMessage,
    SimpleCommandOption,
    SimpleCommandOptionType,
} from 'discordx'
import { request } from 'undici'
import { Discord, Slash, SlashOption } from '@decorators'
import { injectable } from 'tsyringe'
import { Canvas, PointManager } from '@services'
import { UnknownReplyError } from '@errors'
import {
    getPalette,
    getRank,
    getRankKeys,
    getRankValues,
    numberFormat,
    hexToRgb,
    replyToInteraction,
} from '@utils/functions'
import { generalConfig } from '@configs'

@Discord()
@injectable()
@Category('Points')
export default class RankCommand {
    constructor(private pm: PointManager) {}

    @SimpleCommand({
        name: 'rank',
        description: 'Kiểm tra thứ hạng xã hội của bạn!',
    })
    async simpleRank(
        @SimpleCommandOption({
            name: 'user',
            type: SimpleCommandOptionType.User,
        })
        commandUser: GuildMember | undefined,
        command: SimpleCommandMessage
    ) {
        await command.message.channel.sendTyping()
        const user = commandUser?.user || command.message.author

        const attachment = await this.drawCanvas(user)

        await command.message.reply({
            content: attachment ? undefined : `❌ Không tìm thấy người dùng!`,
            files: attachment ? [attachment] : [],
        })
    }

    @Slash({
        name: 'rank',
        description: 'Kiểm tra thứ hạng xã hội của bạn!',
    })
    async rank(
        @SlashOption({
            name: 'user',
            type: ApplicationCommandOptionType.User,
        })
        guildMember: GuildMember | undefined,
        interaction: CommandInteraction,
        client: Client,
        { localize }: InteractionData
    ) {
        await interaction.deferReply()
        const user = guildMember?.user || interaction.user

        const attachment = await this.drawCanvas(user)

        if (attachment) {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(generalConfig.links.tos)
                    .setLabel('TOS')
            )

            replyToInteraction(interaction, {
                files: [attachment],
                components: [row],
            })
        } else {
            throw new UnknownReplyError(interaction)
        }
    }

    async drawCanvas(user: DUser) {
        // insert user in db if not exists
        const userData = await this.pm.getUserData(user)

        if (!userData) return null
        const top = await this.pm.getTop({
            user: null,
            type: 'overall_points',
            value: userData.overall_points,
        })

        const applyText = (
            canvas: Canvas.Canvas,
            text: string,
            fontStyle: string = '',
            baseFontSize: number = 50,
            fontFamily: string = 'Open Sans',
            fontUnit: string = 'px',
            fontScaleSize: number = 10,
            compareWidth: number = 450
        ) => {
            const context = canvas.getContext('2d')

            let fontSize = baseFontSize

            do {
                context.font = `${
                    fontStyle ? `${fontStyle} ` : ''
                }${(fontSize -= fontScaleSize)}${fontUnit} ${fontFamily}`
            } while (
                context.measureText(text).width >
                canvas.width - compareWidth
            )

            return context.font
        }

        const rank = getRank(userData.overall_points || 0)
        const currentPoints = userData.overall_points || 0
        const getRequiredPoints = () => {
            const rankKeys = getRankKeys()

            if (rank == rankKeys[rankKeys.length - 1]) {
                return null
            }
            const rankValues = getRankValues()

            const currentIndex = rankKeys.findIndex((v) => v == rank)

            const nextIndex =
                rankKeys.findIndex((v) => v == rank) + 1 >= rankKeys.length
                    ? 0
                    : rankKeys.findIndex((v) => v == rank) + 1

            const currentRankPoints = rankValues[currentIndex]
            const nextRankPoints = rankValues[nextIndex]

            return {
                currentRankPoints,
                nextRankPoints,
            }
        }
        const requiredPoints = getRequiredPoints()
        const currentDisplayPoints = requiredPoints
            ? currentPoints - requiredPoints.currentRankPoints
            : -1
        const neededDisplayPoints = requiredPoints
            ? requiredPoints.nextRankPoints - requiredPoints.currentRankPoints
            : -1

        // Colors
        const palette = getPalette(rank || 'default')
        const primaryColor = `${palette.find((c) => c.name === 'primary')
            ?.code}`
        const secondaryColor = `${palette.find((c) => c.name === 'secondary')
            ?.code}`
        const pTextColor = `${palette.find((c) => c.name === 'text')?.code}`
        const sTextColor = `${this.hexToRgbA(pTextColor, 0.5)}`
        const barColor = `${palette.find((c) => c.name === 'bar')?.code}`
        const emptyBarColor = `${this.hexToRgbA(barColor, 0.2)}`

        /**
         * @Canvas
         */
        const width = 700,
            height = 200
        const canvas = Canvas.createCanvas(width, height)
        const ctx = canvas.getContext('2d')

        // Layer 1st
        ctx.strokeStyle = `rgba(0,0,0,0)`
        ctx.fillStyle = secondaryColor
        // ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
        ctx.roundRect(0, 0, canvas.width, canvas.height, 20)
        ctx.stroke()
        ctx.fill()

        // Layer 2nd
        // ctx.strokeStyle = `rgba(0,0,0,0)`
        // ctx.fillStyle = primaryColor
        // ctx.beginPath()
        // ctx.roundRect(20, 20, canvas.width - 20 * 2, canvas.height - 20 * 2, 20)
        // ctx.stroke()
        // ctx.fill()

        // Current Rank Position
        ctx.font = '24pt Open Sans'
        ctx.textAlign = 'right'
        ctx.fillStyle = pTextColor
        ctx.fillText(`#${top}`, canvas.width / 1.07, 60)

        // Current Rank
        ctx.font = 'bold 14pt Open Sans'
        ctx.fillStyle = sTextColor
        ctx.fillText(
            (rank || '').toUpperCase(),
            canvas.width / 1.07,
            canvas.height / 1.8
        )

        // Username
        ctx.font = applyText(canvas, user.username)
        ctx.textAlign = 'left'
        ctx.fillStyle = pTextColor
        ctx.fillText(user.username, canvas.width / 4, canvas.height / 1.8)

        // XP Bar
        // Total bar
        ctx.beginPath()
        // ctx.lineWidth = 10
        ctx.strokeStyle = 'rgba(0,0,0,0)'
        ctx.fillStyle = emptyBarColor
        ctx.roundRect(canvas.width / 4, canvas.height / 1.6, 480, 30, 50)
        ctx.stroke()
        ctx.fill()

        // Child bar
        const percentage =
            requiredPoints === null
                ? 100
                : Math.floor((currentDisplayPoints / neededDisplayPoints) * 100)
        const roundedPercent = Math.round(percentage)
        for (let i = 0; i < roundedPercent; i++) {
            ctx.beginPath()
            ctx.lineWidth = 10
            ctx.strokeStyle = barColor
            ctx.fillStyle = barColor
            ctx.arc(190 + i * 4.54, 140, 10, 0, Math.PI * 2, true)
            ctx.stroke()
            ctx.fill()
        }

        // XP Text
        // head
        ctx.font = 'bold 14pt Open Sans'
        ctx.fillStyle = pTextColor
        ctx.fillText(
            currentDisplayPoints >= 0 ? numberFormat(currentDisplayPoints) : '>',
            canvas.width / 3.8,
            canvas.height / 1.36
        )
        // tail
        ctx.font = 'bold 14pt Open Sans'
        ctx.textAlign = 'right'
        ctx.fillStyle = pTextColor
        ctx.fillText(
            neededDisplayPoints >= 0 ? numberFormat(neededDisplayPoints) : '<',
            canvas.width / 1.0835,
            canvas.height / 1.36
        )

        // Avatar
        // Pick up the pen
        ctx.lineWidth = 10
        ctx.strokeStyle = barColor
        ctx.beginPath()
        // Start the arc to form a circle
        ctx.arc(100, 100, 60, 0, Math.PI * 2, true)
        // Put the pen down
        ctx.closePath()
        ctx.stroke()
        // Clip off the region you drew on
        ctx.clip()
        // Using undici to make HTTP requests for better performance
        const { body } = await request(
            user.displayAvatarURL({ extension: 'jpg' })
        )
        const avatar = await Canvas.loadImage(await body.arrayBuffer())
        // Move the image downwards vertically and constrain its height to 200, so that it's square
        ctx.drawImage(avatar, 40, 40, 120, 120)

        // Use the helpful Attachment class structure to process the file for you
        const attachment = new AttachmentBuilder(await canvas.encode('png'), {
            name: 'point.png',
        })

        return attachment
    }

    private hexToRgbA(hex: string, alpha: number) {
        const rgb = hexToRgb(hex)
        if (!rgb) return hex

        return 'rgba(' + rgb.join(',') + ',' + alpha + ')'
    }
}
