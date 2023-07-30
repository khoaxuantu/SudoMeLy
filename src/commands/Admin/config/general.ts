import { Category } from '@discordx/utilities'
import {
    APIEmbedField,
    ApplicationCommandOptionType,
    Channel,
    CommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
} from 'discord.js'
import { Client } from 'discordx'
import { injectable } from 'tsyringe'

import { generalConfig } from '@configs'
import { Discord, Slash, SlashGroup, SlashOption } from '@decorators'
import { Guild } from '@entities'
import { UnknownReplyError } from '@errors'
import { Disabled, Guard, UserPermissions } from '@guards'
import { Database } from '@services'
import {
    replyToInteraction,
    resolveGuild,
    simpleSuccessEmbed,
} from '@utils/functions'

@Discord()
@injectable()
@Category('Admin')
@SlashGroup({
    description: 'Manage general configs',
    name: 'config',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
})
@SlashGroup('config')
export default class GeneralConfigCommand {
    constructor(private db: Database) {}

    @Slash({
        name: 'general',
    })
    @Guard(UserPermissions(['Administrator']), Disabled)
    async configGuild(
        @SlashOption({
            name: 'prefix',
            type: ApplicationCommandOptionType.String,
        })
        prefix: string | undefined,
        @SlashOption({
            name: 'nickname_request_channel',
            type: ApplicationCommandOptionType.Channel,
        })
        nicknameChannel: Channel | undefined,
        @SlashOption({
            name: 'greeting_channel',
            type: ApplicationCommandOptionType.Channel,
        })
        greetingChannel: Channel | undefined,
        interaction: CommandInteraction,
        client: Client,
        { localize }: InteractionData
    ) {
        const guild = resolveGuild(interaction),
            guildData = await this.db
                .get(Guild)
                .findOne({ id: guild?.id || '' })

        if (guildData) {
            guildData.prefix = prefix || guildData.prefix || null
            guildData.nickname_request_channel_id =
                nicknameChannel?.id ||
                guildData.nickname_request_channel_id ||
                null
            guildData.greeting_channel_id =
                greetingChannel?.id || guildData.greeting_channel_id || null

            const fields: APIEmbedField[] = [
                {
                    name: 'Prefix',
                    value:
                        guildData.prefix || generalConfig.simpleCommandsPrefix,
                },
                {
                    name: 'Nickname',
                    value: guildData.nickname_request_channel_id
                        ? `<#${guildData.nickname_request_channel_id}>`
                        : '`null`',
                },
                {
                    name: 'Greeting',
                    value: guildData.greeting_channel_id
                        ? `<#${guildData.greeting_channel_id}>`
                        : '`null`',
                },
            ]

            const embed = new EmbedBuilder()
                .setTitle('CONFIG')
                .addFields(fields)

            replyToInteraction(interaction, { embeds: [embed] })
        } else {
            throw new UnknownReplyError(interaction)
        }

        await this.db.get(Guild).flush()
    }
}
