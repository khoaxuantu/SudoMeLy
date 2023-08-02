import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    EmbedBuilder,
    type CommandInteraction,
    type GuildMember,
    type Message,
    APIEmbedField,
    codeBlock,
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
import { User } from '@entities'
import { Canvas, Database, Logger } from '@services'
import { UnknownReplyError } from '@errors'
import numeral from 'numeral'
import {
    getRank,
    getRankKeys,
    getRankValues,
    numberFormat,
    replyToInteraction,
    syncUser,
} from '@utils/functions'
import { generalConfig } from '@configs'

// Pass the entire Canvas object because you'll need access to its width and context
const applyText = (canvas: Canvas.Canvas, text: string) => {
    const context = canvas.getContext('2d')

    // Declare a base size of the font
    let fontSize = 50

    do {
        // Assign the font to the context and decrement it so it can be measured again
        context.font = `${(fontSize -= 10)}px Open Sans`
        // Compare pixel width of the text to the canvas minus the approximate avatar size
    } while (context.measureText(text).width > canvas.width - 450)

    // Return the result to use in the actual canvas
    return context.font
}

@Discord()
@injectable()
@Category('Points')
export default class RankCommand {
    constructor(
        private db: Database,
        private logger: Logger
    ) {}

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
        const user = commandUser?.user || command.message.author

        const attachment = await this.drawCanvas(user)

        command.message.reply({
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
        await syncUser(user)

        const userData = await this.db.get(User).findOne({ id: user.id })

        if (!userData) return null
        const currentRankPos =
            (
                await this.db.get(User).findAndCount(
                    {
                        overall_points: {
                            $gt: userData.overall_points || 0,
                        },
                    },
                    { orderBy: { overall_points: -1 } }
                )
            )[1] + 1

        const rank = getRank(userData.overall_points || 0)
        const currentPoints = userData.overall_points || 0
        const getRequiredPoints = () => {
            const rankKeys = getRankKeys()

            if (rank == rankKeys[rankKeys.length - 1]) {
                return 0
            }

            const nextIndex =
                rankKeys.findIndex((v) => v == rank) + 1 >= rankKeys.length
                    ? 0
                    : rankKeys.findIndex((v) => v == rank) + 1
            const nextRankPoints = getRankValues()[nextIndex]
            return nextRankPoints
        }
        const requiredPoints = getRequiredPoints()
        const currentColor = currentRankPos > 3 ? '#fc0356' : '#ffdd00'

        const width = 700,
            height = 200
        const canvas = Canvas.createCanvas(width, height)
        const ctx = canvas.getContext('2d')

        // Layer 1st
        ctx.strokeStyle = 'rgba(0,0,0,0)'
        ctx.fillStyle = '#222222'
        // ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
        ctx.roundRect(0, 0, canvas.width, canvas.height, 20)
        ctx.stroke()
        ctx.fill()

        // Layer 2nd
        ctx.strokeStyle = 'rgba(0, 0, 0, 0)'
        ctx.fillStyle = '#111111'
        ctx.beginPath()
        ctx.roundRect(20, 20, canvas.width - 20 * 2, canvas.height - 20 * 2, 20)
        ctx.stroke()
        ctx.fill()

        // Current Rank Position
        ctx.font = '24pt Open Sans'
        ctx.textAlign = 'right'
        ctx.fillStyle = currentColor
        ctx.fillText(
            `#${currentRankPos}`,
            canvas.width / 1.07,
            60
        )

        // Current Rank
        ctx.font = 'bold 14pt Open Sans'
        ctx.fillStyle = '#aaaaaa'
        ctx.fillText(
            (rank || '').toUpperCase() +
                ` (${numberFormat(currentPoints)}/${numberFormat(
                    requiredPoints
                )})`,
            canvas.width / 1.07,
            canvas.height / 1.8
        )

        // Username
        ctx.font = applyText(canvas, user.username)
        ctx.textAlign = 'left'
        ctx.fillStyle = 'white'
        ctx.fillText(user.username, canvas.width / 4, canvas.height / 1.8)

        // // XP Text
        // ctx.font = applyText(canvas, command.message.author.username)
        // ctx.fillStyle = 'white'
        // ctx.fillText(
        //     command.message.author.username,
        //     canvas.width / 4,
        //     canvas.height / 1.8
        // )

        // XP Bar
        // Total bar
        ctx.beginPath()
        ctx.lineWidth = 10
        ctx.strokeStyle = '#333333'
        ctx.fillStyle = '#333333'
        ctx.roundRect(181, 130, 470, 20, 50)
        ctx.stroke()
        ctx.fill()
        // Child bar
        const percentage = Math.floor((currentPoints / requiredPoints) * 100)
        const roundedPercent = Math.round(percentage)
        let i
        for (i = 0; i < roundedPercent; i++) {
            ctx.beginPath()
            ctx.lineWidth = 10
            ctx.strokeStyle = currentColor
            ctx.fillStyle = currentColor
            ctx.arc(190 + i * 4.54, 140, 10, 0, Math.PI * 2, true)
            ctx.stroke()
            ctx.fill()
        }

        // Avatar
        // Pick up the pen
        ctx.beginPath()
        // Start the arc to form a circle
        ctx.arc(100, 100, 60, 0, Math.PI * 2, true)
        // Put the pen down
        ctx.closePath()
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
}
