import { Category } from '@discordx/utilities'
import {
    userMention,
    type ButtonInteraction,
    type CommandInteraction,
    type Message,
    type StringSelectMenuInteraction,
    PublicThreadChannel,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ApplicationCommandOptionType,
    GuildMember,
    UserSelectMenuBuilder,
    UserSelectMenuInteraction,
    User as DUser,
    ApplicationCommandType,
    PermissionFlagsBits,
    MessageContextMenuCommandInteraction,
} from 'discord.js'
import { ButtonComponent, Client, Guard, SelectMenuComponent } from 'discordx'

import { ContextMenu, Discord, Slash, SlashOption } from '@decorators'
import {
    replyToInteraction,
    resolveChannel,
    sendForm,
    simpleErrorEmbed,
    simpleSuccessEmbed,
    syncUser,
} from '@utils/functions'
import { injectable } from 'tsyringe'
import {
    AuthorOnly,
    Disabled,
    GuildOnly,
    Maintenance,
    UserPermissions,
} from '@guards'
import { Database, Logger } from '@services'
import { Guild, User } from '@entities'

const questionEmoji = '❔'
const markedEmoji = '✅'

@Discord()
@injectable()
@Category('General')
export default class QnaCommand {
    constructor(
        private logger: Logger,
        private db: Database
    ) {}

    @Slash({
        name: 'solve',
        description: 'Giải quyết xong vấn đề',
    })
    @Guard(GuildOnly)
    async solve(
        @SlashOption({
            name: 'by',
            type: ApplicationCommandOptionType.User,
            description: 'Ai đã giúp bạn giải quyết vấn đề?',
        })
        guildMember: GuildMember | undefined,
        interaction: CommandInteraction,
        client: Client
    ) {
        await interaction.deferReply({ ephemeral: true })
        const channel = resolveChannel(interaction)

        if (!channel || channel.type !== ChannelType.PublicThread) {
            await simpleErrorEmbed(
                interaction,
                `Hãy dùng lệnh này trong một thread!`
            )
            return
        }

        const startMessage = await channel.fetchStarterMessage()

        if (!startMessage) {
            await simpleErrorEmbed(
                interaction,
                `Thread này không có tin nhắn bắt đầu!`
            )
            return
        }

        const guildData = await this.db
            .get(Guild)
            .findOne({ id: interaction.guildId || '' })

        if (!guildData) {
            await simpleErrorEmbed(interaction, `Hình như có gì đó sai sai`)
            return
        }

        if (
            !guildData.supporting_channel_ids?.includes(channel.parentId || '')
        ) {
            await simpleErrorEmbed(interaction, `Kênh này không được hỗ trợ!`)
            return
        }

        if (startMessage.reactions.resolve(questionEmoji)?.me) {
            await simpleErrorEmbed(
                interaction,
                `Đang chờ chủ thread chọn người đã giúp đỡ...`
            )
            return
        }

        if (startMessage.reactions.resolve(markedEmoji)?.me) {
            await simpleErrorEmbed(interaction, `Đã giải quyết!`)
            return
        }

        const asker = await channel.fetchOwner()

        if (!asker) {
            await simpleErrorEmbed(
                interaction,
                `Thread này không có tin nhắn bắt đầu!`
            )
            return
        }

        if (asker.id !== interaction.user.id) {
            await simpleErrorEmbed(
                interaction,
                `Bạn không phải là người hỏi!`
            )
            return
        }

        if (!guildMember) {
            await sendForm(channel)
        } else {
            if (guildMember.user.bot) {
                await simpleErrorEmbed(
                    interaction,
                    `❌ Người dùng này là bot!`
                )
                return
            }

            if (!channel.members.cache.has(guildMember.id)) {
                await simpleErrorEmbed(
                    interaction,
                    `The user you mentioned is not in this thread!`
                )
                return
            }

            syncUser(guildMember.user)

            // là người giúp giải quyết: +5
            await this.db.get(User).addPoints(guildMember.id, [
                {
                    type: 'mely_points',
                    value: 5,
                },
            ])

            channel.send({
                content: `Đã cộng 5 MP cho ${userMention(
                    guildMember.id
                )} vì đã giúp giải quyết vấn đề!`,
            })

            await startMessage.reactions.removeAll()
            await startMessage.react(markedEmoji)
        }

        await simpleSuccessEmbed(interaction, `Đã gửi!`)
    }

    @ButtonComponent({ id: 'qna-cancel' })
    @Guard(AuthorOnly)
    async QnaCancelButton(interaction: ButtonInteraction) {
        const channel = resolveChannel(interaction)
        const startMessage = await channel?.messages.fetch(
            interaction.message.reference?.messageId || ''
        )

        if (startMessage) {
            await startMessage.reactions.removeAll()
            await startMessage.react(markedEmoji)
        }

        await interaction.update({
            content:
                'Người giúp đỡ bạn không có trong danh sách? Liên hệ Admin nhá! <3',
            components: [],
            embeds: [],
        })
    }

    @SelectMenuComponent({
        id: 'qna-select',
    })
    @Guard(AuthorOnly)
    async QnaSelect(interaction: UserSelectMenuInteraction, client: Client) {
        const answerer = interaction.users.first()

        if (!interaction.channel?.isThread()) {
            await interaction.reply({
                content: 'Lỗi loại kênh',
                ephemeral: true,
            })
            return
        }

        const asker = await interaction.channel.fetchOwner()

        if (answerer) {
            if (
                !asker ||
                answerer.id === asker.id ||
                answerer.bot ||
                !interaction.channel.members.cache.has(answerer.id)
            ) {
                await interaction.reply({
                    content: 'Người dùng không hợp lệ!',
                    ephemeral: true,
                })
                return
            }

            syncUser(answerer)

            // là người giúp giải quyết: +5
            await this.db.get(User).addPoints(answerer.id, [
                {
                    type: 'mely_points',
                    value: 5,
                },
            ])

            const startMessage = await interaction.channel.fetchStarterMessage()

            if (startMessage) {
                await startMessage.reactions.removeAll()
                await startMessage.react(markedEmoji)
            }
        }

        await interaction.update({
            content: `Đã cộng 5 MP cho ${userMention(
                answerer?.id || ''
            )} vì đã giúp giải quyết vấn đề!`,
            components: [],
            embeds: [],
        })
    }

    @ContextMenu({
        name: 'Mark as solved',
        type: ApplicationCommandType.Message,
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
    })
    @Guard(UserPermissions(['Administrator']))
    async markAsSolved(interaction: MessageContextMenuCommandInteraction) {
        await interaction.targetMessage.react(markedEmoji)
        await interaction.reply({
            ephemeral: true,
            content: 'Marked!',
        })
    }
}
