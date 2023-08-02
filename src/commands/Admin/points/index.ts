import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    AutocompleteInteraction,
    Channel,
    CommandInteraction,
    GuildMember,
    PermissionFlagsBits,
    User,
    userMention,
    EmbedBuilder,
    UserMention
} from 'discord.js'
import { Client, DApplicationCommand } from 'discordx'
import { injectable } from 'tsyringe'

import { generalConfig } from '@configs'
import {
    Discord,
    Slash,
    SlashChoice,
    SlashGroup,
    SlashOption,
} from '@decorators'
import { Guild, PointType, User as UserEntity } from '@entities'
import { UnknownReplyError } from '@errors'
import { Disabled, Guard, UserPermissions } from '@guards'
import { Database, Logger, PointManager } from '@services'
import { resolveGuild, simpleSuccessEmbed, syncUser, replyToInteraction, kawaiiGif, shortPointType } from '@utils/functions'
import { BotName, MelyAvatarUrl, SudoMeLyGitHubRepo } from '@constants'

@Discord()
@injectable()
@Category('Admin')
@SlashGroup({
    description: 'Manage user points',
    name: 'points',
    // root: 'config',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
})
@SlashGroup('points')
@Guard(UserPermissions(['Administrator']), Disabled)
export default class PointsAdminCommand {
    constructor(
        private db: Database,
        private pm: PointManager,
        private logger: Logger
    ) {}

    @Slash({
        name: 'add',
    })
    async addPoint(
        @SlashOption({
            name: 'user',
            type: ApplicationCommandOptionType.User,
            required: true,
        })
        guildMember: GuildMember,
        @SlashChoice({ name: 'Chat', value: 'chat_points' })
        @SlashChoice({ name: 'Voice', value: 'voice_points' })
        @SlashChoice({ name: 'MeLy', value: 'mely_points' })
        @SlashOption({
            name: 'type',
            type: ApplicationCommandOptionType.String,
            required: true,
        })
        pointType: PointType,
        @SlashOption({
            name: 'value',
            type: ApplicationCommandOptionType.Number,
            // minValue: 1,
            required: true,
        })
        pointValue: number,
        interaction: CommandInteraction,
        client: Client
    ) {
        // insert user in db if not exists
        await this.pm.add({ user: guildMember.user, type: pointType, value: pointValue })

        const pointAction = pointValue >= 0 ? "Cộng" : "Trừ";
        const color = pointValue >= 0 ? 0x57F287 : 0xED4245;
        const gifUrl = await kawaiiGif("money");
        const embed = new EmbedBuilder()
            .setAuthor({
                name: BotName,
                iconURL: MelyAvatarUrl,
                url: SudoMeLyGitHubRepo,
            })
            .setTitle(pointAction + " điểm")
            .setDescription(`
                ${pointAction} ${Math.abs(pointValue)} ${shortPointType(pointType)} ${userMention(guildMember.id)}
            `)
            .setImage(gifUrl)
            .setColor(color);

        replyToInteraction(interaction, {
            embeds: [embed]
        })
    }

    @Slash({
        name: 'reset',
    })
    async resetPoint(
        @SlashOption({
            name: 'user',
            type: ApplicationCommandOptionType.User,
        })
        guildMember: GuildMember,
        @SlashChoice({ name: 'Chat', value: 'chat_points' })
        @SlashChoice({ name: 'Voice', value: 'voice_points' })
        @SlashChoice({ name: 'MeLy', value: 'mely_points' })
        @SlashOption({
            name: 'type',
            type: ApplicationCommandOptionType.String,
        })
        pointType: PointType | undefined,
        interaction: CommandInteraction,
        client: Client
    ) {
        if (guildMember) {
            // insert user in db if not exists
            await syncUser(guildMember.user)

            const userData = await this.db.get(UserEntity).findOne({
                id: guildMember.id,
            })

            if (userData) {
                if (!pointType) {
                    userData.chat_points = 0
                    userData.voice_points = 0
                    userData.mely_points = 0
                } else {
                    userData[pointType] = 0
                }

                const content = `Reset point for ${userMention(
                    guildMember.id
                )} (${pointType})`

                this.logger.log(content, 'info', true)

                simpleSuccessEmbed(interaction, content)
            } else {
                throw new UnknownReplyError(interaction)
            }
        } else {
            const usersData = await this.db.get(UserEntity).findAll()

            if (usersData) {
                usersData.forEach((userData) => {
                    if (!pointType) {
                        userData.chat_points = 0
                        userData.voice_points = 0
                        userData.mely_points = 0
                    } else {
                        userData[pointType] = 0
                    }
                })

                const content = `Reset point for all ${usersData.length} entities (${pointType})`

                this.logger.log(content, 'info', true)

                simpleSuccessEmbed(interaction, content)
            } else {
                throw new UnknownReplyError(interaction)
            }
        }

        await this.db.get(UserEntity).flush()
    }
}
