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
import { Discord, Slash, SlashOption } from '@decorators'
import { Guild } from '@entities'
import { UnknownReplyError } from '@errors'
import { Disabled, Guard, UserPermissions } from '@guards'
import { Database } from '@services'
import { resolveGuild, simpleSuccessEmbed } from '@utils/functions'

@Discord()
@injectable()
@Category('Admin')
export default class PrefixCommand {
    constructor(private db: Database) {}

    @Slash({
        name: 'config',
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
    })
    @Guard(UserPermissions(['Administrator']), Disabled)
    async configGuild(
        @SlashOption({
            name: 'prefix',
            type: ApplicationCommandOptionType.String,
        })
        prefix: string | undefined,
        @SlashOption({
            name: 'nickname_channel',
            type: ApplicationCommandOptionType.Channel,
        })
        nicknameChannel: Channel | undefined,
        @SlashOption({
            name: 'greeting_channel',
            type: ApplicationCommandOptionType.Channel,
        })
        greetingChannel: Channel | undefined,
        @SlashOption({
            name: 'introduction_channel',
            type: ApplicationCommandOptionType.Channel,
        })
        introductionChannel: Channel | undefined,
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
            guildData.nickname_channel_id =
                nicknameChannel?.id || guildData.nickname_channel_id || null
            guildData.greeting_channel_id =
                greetingChannel?.id || guildData.greeting_channel_id || null
            this.db.get(Guild).persistAndFlush(guildData)

            const fields: APIEmbedField[] = [
                {
                    name: 'Prefix',
                    value:
                        guildData.prefix || generalConfig.simpleCommandsPrefix,
                },
                {
                    name: 'Nickname',
                    value: guildData.nickname_channel_id
                        ? `<#${guildData.nickname_channel_id}>`
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

            interaction.followUp({ embeds: [embed] })
        } else {
            throw new UnknownReplyError(interaction)
        }
    }
}
