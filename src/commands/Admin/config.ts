import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    Channel,
    CommandInteraction,
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
            localizationSource: 'COMMANDS.CONFIG.OPTIONS.PREFIX',
            type: ApplicationCommandOptionType.String,
        })
        prefix: string | undefined,
        @SlashOption({
            name: 'nickname_channel',
            localizationSource: 'COMMANDS.CONFIG.OPTIONS.NICKNAME_CHANNEL',
            type: ApplicationCommandOptionType.Channel,
        })
        nicknameChannel: Channel | undefined,
        @SlashOption({
            name: 'greeting_channel',
            type: ApplicationCommandOptionType.Channel,
            localizationSource: 'COMMANDS.CONFIG.OPTIONS.GREETING_CHANNEL',
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
            guildData.nickname_channel_id =
                nicknameChannel?.id || guildData.nickname_channel_id || null
            guildData.greeting_channel_id =
                greetingChannel?.id || guildData.greeting_channel_id || null
            this.db.get(Guild).persistAndFlush(guildData)

            simpleSuccessEmbed(
                interaction,
                localize['COMMANDS']['CONFIG']['EMBED']['DESCRIPTION']({
                    prefix:
                        guildData.prefix || generalConfig.simpleCommandsPrefix,
                    nickname: guildData.nickname_channel_id
                        ? `<#${guildData.nickname_channel_id}>`
                        : '`null`',
                    greeting: guildData.greeting_channel_id
                        ? `<#${guildData.greeting_channel_id}>`
                        : '`null`',
                })
            )
        } else {
            throw new UnknownReplyError(interaction)
        }
    }
}
