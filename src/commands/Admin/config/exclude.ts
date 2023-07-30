import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    AutocompleteInteraction,
    Channel,
    CommandInteraction,
    PermissionFlagsBits,
    Role,
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
    description: 'Config exclude',
    name: 'exclude',
    root: 'config',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
})
@SlashGroup('exclude', 'config')
@Guard(UserPermissions(['Administrator']), Disabled)
export default class ExcludeCommand {
    constructor(private db: Database) {}

    @Slash({
        name: 'channel_add',
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
            if (guildData.excluded_channels === null) {
                guildData.excluded_channels = new Array<string>()
            }

            guildData.excluded_channels.push(channel.id)

            replyToInteraction(interaction, {
                content: `Added ${channel}`,
            })
        } else {
            throw new UnknownReplyError(interaction)
        }

        await this.db.get(Guild).flush()
    }

    @Slash({
        name: 'role_add',
    })
    async addRole(
        @SlashOption({
            name: 'role',
            type: ApplicationCommandOptionType.Role,
            required: true,
        })
        role: Role,
        interaction: CommandInteraction,
        client: Client
    ) {
        const guild = resolveGuild(interaction),
            guildData = await this.db
                .get(Guild)
                .findOne({ id: guild?.id || '' })

        if (guildData) {
            if (guildData.excluded_roles === null) {
                guildData.excluded_roles = new Array<string>()
            }

            guildData.excluded_roles.push(role.id)

            replyToInteraction(interaction, {
                content: `Added ${role}`,
            })
        } else {
            throw new UnknownReplyError(interaction)
        }

        await this.db.get(Guild).flush()
    }

    @Slash({
        name: 'channel_remove',
    })
    async rmChannel(
        @SlashOption({
            name: 'channel',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: async function (
                this: ExcludeCommand,
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
                    guildData.excluded_channels != null &&
                    !!guild
                ) {
                    // const channels = await guild.channels.cache.filter((v, k) =>
                    //     guildData.reply_channel_ids.includes(k)
                    // )

                    await interaction.respond(
                        guildData.excluded_channels
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

        if (guildData && guildData.excluded_channels !== null) {
            guildData.excluded_channels = guildData.excluded_channels.filter(
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

        await this.db.get(Guild).flush()
    }

    @Slash({
        name: 'role_remove',
    })
    async rmRole(
        @SlashOption({
            name: 'role',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: async function (
                this: ExcludeCommand,
                interaction: AutocompleteInteraction,
                cmd: DApplicationCommand
            ) {
                const focusedOption = interaction.options.getFocused(true)

                const { guild } = interaction,
                    guildData = await this.db
                        .get(Guild)
                        .findOne({ id: guild?.id || '' })

                if (guildData && guildData.excluded_roles != null && !!guild) {
                    // const channels = await guild.channels.cache.filter((v, k) =>
                    //     guildData.reply_channel_ids.includes(k)
                    // )

                    await interaction.respond(
                        guildData.excluded_roles
                            .filter((v) => v.includes(focusedOption.value))
                            .map((v) => ({
                                name:
                                    guild.roles.cache.find((c) => c.id === v)
                                        ?.name || v,
                                value: v,
                            }))
                    )
                } else {
                    await interaction.respond([])
                }
            },
        })
        role_id: string,
        interaction: CommandInteraction,
        client: Client
    ) {
        const guild = resolveGuild(interaction),
            guildData = await this.db
                .get(Guild)
                .findOne({ id: guild?.id || '' })

        if (guildData && guildData.excluded_roles !== null) {
            guildData.excluded_roles = guildData.excluded_roles.filter(
                (v) => v !== role_id
            )

            replyToInteraction(interaction, {
                content: `Removed ${
                    guild?.roles.cache.find((v) => v.id === role_id) || role_id
                }`,
            })
        } else {
            throw new UnknownReplyError(interaction)
        }

        await this.db.get(Guild).flush()
    }
}
