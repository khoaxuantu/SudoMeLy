import { Category } from '@discordx/utilities'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CommandInteraction,
    EmbedBuilder,
    EmbedField,
} from 'discord.js'
import { Client } from 'discordx'
import { injectable } from 'tsyringe'
dayjs.extend(relativeTime)

import { generalConfig } from '@configs'
import { Discord, Slash } from '@decorators'
import { Guard } from '@guards'
import { Stats } from '@services'
import {
    getColor,
    getTscordVersion,
    isValidUrl,
    replyToInteraction,
    timeAgo,
} from '@utils/functions'

import packageJson from '../../../package.json'

const links = [
    {
        label: 'TOS',
        url: generalConfig.links.tos,
    },
    { label: 'Github', url: generalConfig.links.gitRemoteRepo },
]

@Discord()
@injectable()
@Category('General')
export default class InfoCommand {
    constructor(private stats: Stats) {}

    @Slash({
        name: 'info',
        description: 'Lấy thông tin của bot!',
    })
    @Guard()
    async info(
        interaction: CommandInteraction,
        client: Client,
        { localize }: InteractionData
    ) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTitle(client.user!.tag)
            .setThumbnail(client.user!.displayAvatarURL())
            .setColor(getColor('primary'))
            .setDescription(packageJson.description)

        const fields: EmbedField[] = []

        /**
         * Uptime field
         */
        const uptime = timeAgo(new Date(Date.now() - client.uptime!))
        fields.push({
            name: 'Uptime',
            value: uptime,
            inline: true,
        })

        /**
         * Totals field
         */
        const totalStats = await this.stats.getTotalStats()
        fields.push({
            name: 'Totals',
            value: `**${totalStats.TOTAL_GUILDS}** guilds\n**${totalStats.TOTAL_USERS}** users\n**${totalStats.TOTAL_COMMANDS}** commands`,
            inline: true,
        })

        /**
         * Bot version field
         */
        fields.push({
            name: 'Bot version',
            value: `v${packageJson.version}`,
            inline: true,
        })

        /**
         * Framework/template field
         */
        fields.push({
            name: 'Framework/template',
            value: `[TSCord](https://github.com/barthofu/tscord) (*v${getTscordVersion()}*)`,
            inline: true,
        })

        /**
         * Libraries field
         */
        fields.push({
            name: 'Libraries',
            value: `[discord.js](https://discord.js.org/) (*v${packageJson.dependencies[
                'discord.js'
            ].replace(
                '^',
                ''
            )}*)\n[discordx](https://discordx.js.org/) (*v${packageJson.dependencies[
                'discordx'
            ].replace('^', '')}*)`,
            inline: true,
        })

        // add the fields to the embed
        embed.addFields(fields)

        /**
         * Define links buttons
         */
        const buttons = links
            .map((link) => {
                const url = link.url.split('_').join('')
                if (isValidUrl(url)) {
                    return new ButtonBuilder()
                        .setLabel(link.label)
                        .setURL(url)
                        .setStyle(ButtonStyle.Link)
                } else {
                    return null
                }
            })
            .filter((link) => link) as ButtonBuilder[]
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...buttons
        )

        // finally send the embed
        replyToInteraction(interaction, {
            embeds: [embed],
            components: [row],
        })
    }
}
