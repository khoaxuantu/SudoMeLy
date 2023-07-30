import { Category } from '@discordx/utilities'
import {
    ChannelType,
    CommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    StringSelectMenuInteraction,
    ChannelSelectMenuBuilder,
    ChannelSelectMenuInteraction,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction,
} from 'discord.js'
import {
    SelectMenuComponent,
    ButtonComponent,
} from 'discordx'
import { injectable } from 'tsyringe'

import { Discord, Slash, SlashGroup, SlashOption } from '@decorators'
import { Guild } from '@entities'
import { Disabled, Guard, UserPermissions } from '@guards'
import { Database } from '@services'
import { replyToInteraction } from '@utils/functions'

enum GuildChannelField {
    excluded_channels = 'excluded_channels',
    normal_chat_channel_ids = 'normal_chat_channel_ids',
    supporting_channel_ids = 'supporting_channel_ids',
    club_channel_ids = 'club_channel_ids',
    sharing_channel_ids = 'sharing_channel_ids',
    nickname_request_channel_id = 'nickname_request_channel_id',
    greeting_channel_id = 'greeting_channel_id',
    reply_channel_ids = 'reply_channel_ids',
    log_channel_id = 'log_channel_id',
}

interface ChannelSelectMenuMetadata {
    metadataString: string
    guildChannelField: GuildChannelField
    channelType: ChannelType
    maxValues: number
}

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
        name: 'channels',
    })
    @Guard(UserPermissions(['Administrator']), Disabled)
    async channels(interaction: CommandInteraction) {
        replyToInteraction(interaction, {
            components: [this.renderChannelTypeMenu()],
        })
    }

    private renderChannelTypeMenu = () => {
        return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setMaxValues(1)
                .setCustomId('config-channels-menu')
                .setPlaceholder('Config Channels')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Normal Chat')
                        .setValue(
                            GuildChannelField.normal_chat_channel_ids +
                                `|${ChannelType.GuildText}|10`
                        ),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Supporting')
                        .setValue(
                            GuildChannelField.supporting_channel_ids +
                                `|${ChannelType.GuildForum}|2`
                        ),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Club')
                        .setValue(
                            GuildChannelField.club_channel_ids +
                                `|${ChannelType.GuildForum}|2`
                        ),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Sharing')
                        .setValue(
                            GuildChannelField.sharing_channel_ids +
                                `|${ChannelType.GuildForum}|2`
                        ),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Nickname Request')
                        .setValue(
                            GuildChannelField.nickname_request_channel_id +
                                `|${ChannelType.GuildText}|1`
                        ),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Greeting')
                        .setValue(
                            GuildChannelField.greeting_channel_id +
                                `|${ChannelType.GuildText}|1`
                        ),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Reply')
                        .setValue(
                            GuildChannelField.reply_channel_ids +
                                `|${ChannelType.GuildText}|10`
                        ),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Log')
                        .setValue(
                            GuildChannelField.log_channel_id +
                                `|${ChannelType.GuildText}|1`
                        )
                )
        )
    }

    private async resolveMetadata(
        metadataString: string,
    ): Promise<ChannelSelectMenuMetadata> {
        const data = metadataString.split('|');
        const guildChannelField = data[0] as GuildChannelField;
        const channelType = Number(data[1]) as ChannelType;
        const maxValues = Number(data[2]);
        return {
            metadataString,
            guildChannelField,
            channelType,
            maxValues,
        }
    }

    private renderChannelEmbed(metadata: ChannelSelectMenuMetadata, selectedChannelIds: string | string[] | null) {
        let description: string = "Rỗng";
        if (selectedChannelIds) {
            if (typeof selectedChannelIds === 'string') {
                description = `<#${selectedChannelIds}>`;
            } else if (selectedChannelIds.length) {
                description = selectedChannelIds.map(id => `<#${id}>`).join('\n')
            }
        }
        return new EmbedBuilder()
            .setAuthor({
                name: "Mê lỳ",
                iconURL: "https://avatars.githubusercontent.com/u/88936664?s=200&v=4",
                url: 'https://github.com/mely-apps/SudoMeLy',
            })
            .setTitle(
                'Config ' +
                metadata.guildChannelField.split('_').slice(0, -1).join(' ')
            )
            .setDescription(description)
            .setTimestamp(new Date())
    }

    @Guard(UserPermissions(['Administrator']), Disabled)
    @SelectMenuComponent({
        id: 'config-channels-menu',
    })
    async selectChannelType(interaction: StringSelectMenuInteraction) {
        const guild = interaction.guild;
        const guildData = await this.db
            .get(Guild)
            .findOne({ id: guild?.id || '' })
        if (guildData) {
            const metadata = await this.resolveMetadata(interaction.values[0]);
            const embed = this.renderChannelEmbed(metadata, guildData[metadata.guildChannelField]);
            interaction.update({
                embeds: [embed],
                components: [
                    this.renderChannelSelectionMenu(metadata),
                    this.renderButton(),
                ],
            })
        }
    }

    private renderButton() {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('back-button')
                .setLabel('Trở về')
                .setStyle(ButtonStyle.Primary)
        )
    }

    @Guard(UserPermissions(['Administrator']), Disabled)
    @ButtonComponent({
        id: 'back-button',
    })
    async backToChannelTypeMenu(interaction: ButtonInteraction) {
        interaction.update({
            content: "",
            embeds: [],
            components: [this.renderChannelTypeMenu()],
        })
    }

    private renderChannelSelectionMenu(
        metadata: ChannelSelectMenuMetadata
    ) {
        return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(metadata.metadataString)
                .setChannelTypes([metadata.channelType])
                .setPlaceholder(metadata.guildChannelField.split('_').slice(0, -1).join(' '))
                .setMaxValues(metadata.maxValues)
        )
    }

    @Guard(UserPermissions(['Administrator']))
    @SelectMenuComponent({
        id: /\w+_channels?(_ids?)?/g,
    })
    async updateChannels(interaction: ChannelSelectMenuInteraction) {
        const metadata = await this.resolveMetadata(interaction.customId);
        // save data to db here...
        const guild = interaction.guild;
        await this.db
            .get(Guild)
            .findOne({ id: guild?.id || '' })
            .then(async (guildData) => {
                if (guildData && interaction.values) {
                    if (metadata.maxValues === 1) {
                        guildData[metadata.guildChannelField] = interaction.values[0] as string & string[];
                    } else {
                        const existingChannels = guildData[metadata.guildChannelField] || [];
                        const savingChannels = interaction.values
                            .concat(existingChannels)
                            .filter(id => !(existingChannels.includes(id) && interaction.values.includes(id)))
                        guildData[metadata.guildChannelField] = savingChannels as string & string[];
                    }
                    await this.db.get(Guild).flush()
                    interaction.update({
                        content: "Cập nhật thành công",
                        embeds: [this.renderChannelEmbed(metadata, guildData[metadata.guildChannelField])],
                    })
                }
            })
    }
}
