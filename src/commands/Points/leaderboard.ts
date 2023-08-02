import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    EmbedBuilder,
    type CommandInteraction,
    type GuildMember,
    type Message,
    APIEmbedField,
    codeBlock,
    userMention,
    AttachmentBuilder,
    bold,
    inlineCode,
} from 'discord.js'
import { Client, SimpleCommand, SimpleCommandMessage } from 'discordx'

import { Discord, Slash, SlashChoice, SlashOption } from '@decorators'
import { injectable } from 'tsyringe'
import { PointType, User } from '@entities'
import { Database, leaderboardGenerator } from '@services'
import { UnknownReplyError } from '@errors'
import {
    getRank,
    numberFormat,
    replyToInteraction,
    resolveGuild,
} from '@utils/functions'
import { QueryOrder } from '@mikro-orm/core'
import { LeaderboardData } from '@services/imageGenerators/leaderboard'

@Discord()
@injectable()
@Category('Points')
export default class LbCommand {
    constructor(private db: Database) {}

    @Slash({
        name: 'leaderboard',
        description: 'Xem ai đang đứng top nào?',
    })
    async lbSlash(
        @SlashChoice({ name: 'Chat', value: 'chat_points' })
        @SlashChoice({ name: 'Voice', value: 'voice_points' })
        @SlashChoice({ name: 'MeLy', value: 'mely_points' })
        @SlashOption({
            name: 'type',
            type: ApplicationCommandOptionType.String,
            description: 'Type of Point',
        })
        pointType: PointType | undefined,
        interaction: CommandInteraction,
        client: Client,
        { localize }: InteractionData
    ) {
        const guild = await resolveGuild(interaction)

        let orderOption: { [key: string]: number } = {}
        orderOption[`${pointType || 'overall_points'}`] = -1

        const usersData = await this.db.get(User).find(
            {},
            {
                orderBy: [orderOption],
                limit: 10,
            }
        )

        if (usersData && usersData.length && guild) {
            const data = usersData
                .filter(
                    (v) =>
                        v[pointType || 'overall_points'] !== undefined &&
                        v[pointType || 'overall_points']! > 0
                )
                .map((v, i) => {
                    return `${inlineCode(`i=${i}`)} ${userMention(v.id)}: ${bold(
                        numberFormat(v[pointType || 'overall_points'])
                    )}`
                })

            const embed = new EmbedBuilder()
                .setTitle(
                    `🏆 Leaderboard${
                        pointType
                            ? ` (${pointType
                                  .split('_')
                                  .map((t) => t.charAt(0))
                                  .join('')
                                  .toUpperCase()})`
                            : ''
                    } 🏆`
                )
                .setColor('Random')
                .setDescription(`${data.join('\n')}`)

            replyToInteraction(interaction, {
                embeds: [embed],
            })
        } else {
            throw new UnknownReplyError(interaction)
        }
    }

    @SimpleCommand({ aliases: ['lb'], name: 'leaderboard' })
    async exportLeaderboard(command: SimpleCommandMessage) {
        const guild = command.message.guild

        if (!guild) {
            command.message.reply({
                content: '❌ Not in guild!',
            })
            return
        }

        const repliedMsg = await command.message.reply({
            content: 'Generating...',
            allowedMentions: {
                users: [],
            },
        })

        const topUsers = await this.db
            .get(User)
            .createQueryBuilder()
            .select(['id', 'overall_points'])
            .orderBy({ overall_points: QueryOrder.DESC })
            .limit(5)

        const guildMembers = await guild.members.fetch({
            user: topUsers.map((usr) => usr.id),
        })

        const data: LeaderboardData[] = topUsers.map((user) => {
            const guildMember = guildMembers.get(user.id)
            return {
                id: user.id,
                OP: user.overall_points || 0,
                username: guildMember?.user.username || '',
                avatar: guildMember?.user.displayAvatarURL() || '',
                title: getRank(user.overall_points || 0) || 'unknown',
            }
        })

        repliedMsg.edit({
            content: '',
            files: [
                new AttachmentBuilder(
                    await leaderboardGenerator.generate(data),
                    { name: 'image.png' }
                ),
            ],
            allowedMentions: {
                users: [],
            },
        })
    }
}
