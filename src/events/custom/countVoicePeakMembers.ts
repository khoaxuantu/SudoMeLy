import { ArgsOf, Client, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, EventManager, Logger, Stats, Store } from '@services'
import { ChannelType, VoiceState } from 'discord.js'

@Discord()
@injectable()
export default class CountVoiceChannelPeakMembersEvent {
    constructor(
        private stats: Stats,
        private logger: Logger,
        private db: Database,
        private eventManager: EventManager,
        private store: Store
    ) {}

    // =============================
    // ========= Handlers ==========
    // =============================

    @OnCustom('countVoiceChannelPeakMembers')
    async countVoiceChannelPeakMembersHandler(
        oldState: VoiceState,
        newState: VoiceState
    ) {
        // Delete voice channel member count from local store when user leave a voice channel
        if (
            oldState.channel !== null &&
            newState.channel === null &&
            oldState.channel.type === ChannelType.GuildVoice &&
            oldState.channel.members.size <= 0
        ) {
            this.store.update('voiceChannels', (oldCountMap) => {
                oldCountMap.delete(oldState.channel!.id)
                return oldCountMap
            })
        }

        // Update peak on every voice state change event
        if (
            newState.channel &&
            newState.channel.type === ChannelType.GuildVoice
        ) {
            this.store.update('voiceChannels', (oldCountMap) => {
                if (newState.channel !== null) {
                    const channel_id = newState.channel.id
                    const channel_members_size =
                        newState.channel.members.filter((v) => !v.user.bot).size
                    const currentChannelMemberCount =
                        oldCountMap.get(channel_id)

                    if (currentChannelMemberCount) {
                        oldCountMap.set(channel_id, {
                            peakMembers: Math.max(
                                channel_members_size,
                                currentChannelMemberCount.peakMembers
                            ),
                        })
                    } else {
                        oldCountMap.set(channel_id, {
                            peakMembers: channel_members_size,
                        })
                    }
                }
                return oldCountMap
            })
        }
    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('voiceStateUpdate')
    @Guard(Maintenance)
    async countVoiceChannelPeakMembersEmitter(
        [oldState, newState]: ArgsOf<'voiceStateUpdate'>
        // client: Client
    ) {
        // Only accept private guild and user
        if (
            oldState.guild.id == process.env['TEST_GUILD_ID'] &&
            newState.guild.id == process.env['TEST_GUILD_ID'] &&
            oldState.member &&
            newState.member &&
            !oldState.member.user.bot &&
            !newState.member.user.bot
        ) {
            /**
             * @param {VoiceState} oldState - The voice state before the update
             * @param {VoiceState} newState - The voice state after the update
             */
            this.eventManager.emit(
                'countVoiceChannelPeakMembers',
                oldState,
                newState
            )
        }
    }
}
