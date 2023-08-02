import { Category } from '@discordx/utilities'
import {
    ActionRowBuilder,
    APISelectMenuOption,
    CommandInteraction,
    EmbedBuilder,
    Guild as DGuild,
    inlineCode,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js'
import {
    Client,
    MetadataStorage,
    SelectMenuComponent,
    SimpleCommand,
    SimpleCommandMessage,
} from 'discordx'

import { Discord, Slash } from '@decorators'
import {
    chunkArray,
    getColor,
    getRankKeys,
    getRankValues,
    replyToInteraction,
    resolveDependency,
    resolveGuild,
    validString,
} from '@utils/functions'
import { TranslationFunctions } from 'src/i18n/i18n-types'
import { generalConfig } from '@configs'

@Discord()
@Category('General')
export default class HelpCommand {
    private readonly _categories: Map<string, CommandCategory[]> = new Map()

    constructor() {
        this.loadCategories()
    }

    @Slash({
        name: 'help',
        description: 'Nhận trợ giúp về bot!',
    })
    async help(
        interaction: CommandInteraction,
        client: Client,
        { localize }: InteractionData
    ) {
        const guild = resolveGuild(interaction)
        if (!guild) return
        const embed = await this.getEmbed({
            client,
            currentGuild: guild,
            locale: localize,
        })

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel('Điều khoản/điều kiện sử dụng dịch vụ')
                .setURL(generalConfig.links.tos)
        )

        replyToInteraction(interaction, {
            embeds: [embed],
            components: [row],
        })
    }

    private async getEmbed({
        client,
        currentGuild,
        category = '',
        pageNumber = 0,
        locale,
    }: {
        client: Client
        currentGuild: DGuild
        category?: string
        pageNumber?: number
        locale: TranslationFunctions
    }): Promise<EmbedBuilder> {
        const commands = this._categories.get(category)

        // default embed
        if (!commands) {
            const embed = new EmbedBuilder()
                .setTitle(locale.COMMANDS.HELP.EMBED.TITLE().toUpperCase())
                .setURL(generalConfig.links.invite)
                .setThumbnail(client.user?.displayAvatarURL() || null)
                .setColor(getColor('primary'))

            const applicationCommands = [
                ...(currentGuild
                    ? (await currentGuild.commands.fetch()).values()
                    : []),
                ...(await client.application!.commands.fetch()).values(),
            ]

            for (const category of this._categories) {
                // Hide admin category
                if (category[0].includes('Admin')) {
                    continue
                }

                const commands = category[1].map((cmd) => {
                    return (
                        '</' +
                        (cmd.group ? cmd.group + ' ' : '') +
                        (cmd.subgroup ? cmd.subgroup + ' ' : '') +
                        cmd.name +
                        ':' +
                        applicationCommands.find(
                            (acmd) =>
                                acmd.name == (cmd.group ? cmd.group : cmd.name)
                        )!.id +
                        '>'
                    )
                })

                embed.addFields([
                    {
                        name: category[0],
                        value: commands.join(', '),
                    },
                ])
            }

            return embed
        }

        // specific embed
        const chunks = chunkArray(commands, 24),
            maxPage = chunks.length,
            resultsOfPage = chunks[pageNumber]

        const embed = new EmbedBuilder()
            .setTitle(locale.COMMANDS.HELP.EMBED.CATEGORY_TITLE({ category }))
            .setFooter({
                text: `Page ${pageNumber + 1} of ${maxPage}`,
            })

        if (!resultsOfPage) return embed

        for (const item of resultsOfPage) {
            const applicationCommands = [
                ...(currentGuild
                    ? (await currentGuild.commands.fetch()).values()
                    : []),
                ...(await client.application!.commands.fetch()).values(),
            ]

            const { description } = item
            const fieldValue = validString(description)
                ? description
                : 'No description'
            const name =
                '</' +
                (item.group ? item.group + ' ' : '') +
                (item.subgroup ? item.subgroup + ' ' : '') +
                item.name +
                ':' +
                applicationCommands.find(
                    (acmd) => acmd.name == (item.group ? item.group : item.name)
                )!.id +
                '>'

            embed.addFields([
                {
                    name: name,
                    value: fieldValue,
                    inline: resultsOfPage.length > 5,
                },
            ])
        }

        return embed
    }

    loadCategories(): void {
        const commands: CommandCategory[] = MetadataStorage.instance
            .applicationCommandSlashesFlat as CommandCategory[]

        for (const command of commands) {
            const { category } = command
            if (!category || !validString(category)) continue

            if (this._categories.has(category)) {
                this._categories.get(category)?.push(command)
            } else {
                this._categories.set(category, [command])
            }
        }
    }
}
