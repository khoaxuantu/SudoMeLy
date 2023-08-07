import { Client } from 'discordx'

import { Discord, OnCustom } from '@decorators'
import { User } from '@entities'
import { injectable } from 'tsyringe'
import { Database, Logger } from '@services'
import { ChannelType, TextChannel, bold } from 'discord.js'
import { getRank, resolveDependency } from '@utils/functions'
import { EntityData } from '@mikro-orm/core'

@Discord()
@injectable()
export default class RankUpEvent {
    constructor(
        private db: Database,
        private logger: Logger
    ) {}

    // =============================
    // ========= Handlers ==========
    // =============================

    @OnCustom('rankUp')
    async rankUpHandler(oldUser: EntityData<User>, newUser: EntityData<User>) {
        if (!newUser.overall_points || !newUser.id || !oldUser.overall_points) {
            return
        }

        const oldRank = getRank(oldUser.overall_points)

        const newRank = getRank(newUser.overall_points)

        if (oldRank === newRank) {
            return
        }

        this.logger.log(`${newUser.id} reached ${newRank}`, 'info')

        const client = await resolveDependency(Client)
        const guild = await client.guilds.fetch(process.env['TEST_GUILD_ID'])
        const member = await guild.members.fetch(newUser.id)
        const channel = await guild.channels.cache.find((v) =>
            v.name.includes('spam')
        )

        const rolePattern = `>_`

        const newRankName = `${rolePattern}${newRank}`

        if (channel && channel.type === ChannelType.GuildText) {
            await channel.send({
                content: `${bold(member.displayName)} đã đạt ${bold(
                    newRank?.toString() || ''
                )}!`,
            })
        }

        const roleToRemove = await member.roles.cache.filter((r) =>
            r.name.includes(rolePattern)
        )

        if (roleToRemove) {
            await member.roles.remove(roleToRemove)
        }

        const roleToGive =
            (await guild.roles.cache.find((r) =>
                r.name.includes(`${newRankName}`)
            )) ||
            (await guild.roles.create({
                name: `${newRankName}`,
                reason: `MeLy XP System`,
            }))

        if (roleToGive) {
            await member.roles.add(roleToGive)
        }
    }
}
