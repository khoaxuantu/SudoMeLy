import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    AutocompleteInteraction,
    Channel,
    CommandInteraction,
    PermissionFlagsBits,
} from 'discord.js'
import { Client, DApplicationCommand } from 'discordx'
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
    description: 'Config reply channels',
    name: 'reply_channels',
    root: 'config',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
})
@SlashGroup('reply_channels', 'config')
@Guard(UserPermissions(['Administrator']), Disabled)
export default class ThreadReplyConfigCommand {
    constructor(private db: Database) {}

    @Slash({
        name: 'add',
    })
    async addChannel(
        @SlashOption({
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            required: true,
        })
        channel: Channel,
        interaction: CommandInteraction,
        client: Client
    ) {
        const guild = resolveGuild(interaction),
            guildData = await this.db
                .get(Guild)
                .findOne({ id: guild?.id || '' })

        if (guildData) {
            if (guildData.reply_channel_ids === null) {
                guildData.reply_channel_ids = new Array<string>()
            }

            guildData.reply_channel_ids.push(channel.id)

            replyToInteraction(interaction, {
                content: `Added ${channel}`,
            })
        } else {
            throw new UnknownReplyError(interaction)
        }

        this.db.get(Guild).flush()
    }

    @Slash({
        name: 'remove',
    })
    async rmChannel(
        @SlashOption({
            name: 'channel',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: async function (
                this: ThreadReplyConfigCommand,
                interaction: AutocompleteInteraction,
                cmd: DApplicationCommand
            ) {
                const focusedOption = interaction.options.getFocused(true)

                const { guild } = interaction,
                    guildData = await this.db
                        .get(Guild)
                        .findOne({ id: guild?.id || '' })

                if (
                    guildData &&
                    guildData.reply_channel_ids != null &&
                    !!guild
                ) {
                    // const channels = await guild.channels.cache.filter((v, k) =>
                    //     guildData.reply_channel_ids.includes(k)
                    // )

                    await interaction.respond(
                        guildData.reply_channel_ids
                            .filter((v) => v.includes(focusedOption.value))
                            .map((v) => ({
                                name:
                                    guild.channels.cache.find((c) => c.id === v)
                                        ?.name || v,
                                value: v,
                            }))
                    )
                } else {
                    await interaction.respond([])
                }
            },
        })
        channel_id: string,
        interaction: CommandInteraction,
        client: Client
    ) {
        const guild = resolveGuild(interaction),
            guildData = await this.db
                .get(Guild)
                .findOne({ id: guild?.id || '' })

        if (guildData && guildData.reply_channel_ids !== null) {
            guildData.reply_channel_ids = guildData.reply_channel_ids.filter(
                (v) => v !== channel_id
            )

            replyToInteraction(interaction, {
                content: `Removed ${
                    guild?.channels.cache.find((v) => v.id === channel_id) ||
                    channel_id
                }`,
            })
        } else {
            throw new UnknownReplyError(interaction)
        }

        this.db.get(Guild).flush()
    }
}
