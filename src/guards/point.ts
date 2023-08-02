import {
    CommandInteraction,
    ContextMenuCommandInteraction,
    User as DUser,
} from 'discord.js'
import { GuardFunction, SimpleCommandMessage } from 'discordx'

import {
    replyToInteraction,
    resolveChannel,
    resolveDependency,
    resolveGuild,
    resolveUser,
    simpleErrorEmbed,
} from '@utils/functions'
import { Database } from '@services'
import { PointType, User } from '@entities'
import { Loaded } from '@mikro-orm/core'

/**
 * Cost user an amount of points to do next func
 */
export const Point = (
    pointCost: number,
    pointType: PointType = 'mely_points'
) => {
    const guard: GuardFunction<
        CommandInteraction | ContextMenuCommandInteraction
    > = async (arg, client, next) => {
        const user = resolveUser(arg)

        if (!user || !(user instanceof DUser)) {
            return replyToInteraction(arg, {
                content: 'Something went wrong :(',
                ephemeral: true,
            })
        }

        const db = await resolveDependency(Database),
            userData = await db.get(User).findOne({ id: user.id })

        if (!userData) {
            return simpleErrorEmbed(arg, `You are not in our db :(`, true)
        }

        if (userData[pointType] < pointCost) {
            return simpleErrorEmbed(
                arg,
                `You don't have enough ${pointCost} ${pointType
                    .split('_')
                    .map((t) => t.charAt(0))
                    .join('')
                    .toUpperCase()}!`,
                true
            )
        }

        await db
            .get(User)
            .addPoints(user.id, [{ type: pointType, value: pointCost * -1 }])

        await db.get(User).flush()

        next()
    }
    return guard
}
