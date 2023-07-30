import { ArgsOf, Client, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, EventManager, Logger, Stats, Store } from '@services'
import { ChannelType, Message, MessageType, VoiceState } from 'discord.js'
import { getRandomInt, resolveGuild, syncUser } from '@utils/functions'
import { Guild, Point, User } from '@entities'

@Discord()
@injectable()
export default class VoicePointEvent {
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

    @OnCustom('voicePoint')
    async voicePointHandler(oldState: VoiceState, newState: VoiceState) {
        const userId = oldState.id || newState.id

        const inVoiceChannel =
            oldState.channel !== null && newState.channel !== null

        const sameChannel =
            inVoiceChannel && oldState.channel === newState.channel

        const switchChannel =
            inVoiceChannel && oldState.channel !== newState.channel

        if (newState.member && oldState.member) {
            syncUser(oldState.member.user || newState.member.user)
        }

        const user = await this.db.get(User).findOne({ id: userId })

        if (!user) {
            return
        }

        const now = new Date()

        const resetUserVoicePointsState = () => {
            user.joinedVoiceTime = null
            user.onMicTime = null
            user.onStreamTime = null
            user.onVideoTime = null
        }

        const addVoicePoints = async (value: number) => {
            await this.db.get(User).addPoints(userId, [
                {
                    type: 'voice_points',
                    value: value,
                },
            ])
        }

        // User join a voice
        if (oldState.channel === null && newState.channel !== null) {
            // Start count in voice duration for user
            if (newState.mute === false) user.onMicTime = now
            user.joinedVoiceTime = now
        }

        // User turn off their mic
        if (sameChannel && oldState.mute === false && newState.mute === true) {
            if (user.onMicTime) {
                const countInVoiceTime = this.calcVoiceDuration(user.onMicTime)

                const countMember = this.store
                    .get('voiceChannels')
                    .get(oldState.channel.id)

                if (countMember && countInVoiceTime > 0) {
                    const points = Math.floor(
                        (countInVoiceTime * countMember.peakMembers) / 5
                    )

                    await addVoicePoints(points)
                }
            }

            user.onMicTime = null
        }

        // User turn off their stream
        if (
            sameChannel &&
            oldState.streaming === true &&
            newState.streaming === false
        ) {
            // streamTime: + time / 10 -> tròn xuống.
            if (user.onStreamTime) {
                const points = Math.floor(
                    this.calcVoiceDuration(user.onStreamTime)
                )

                await addVoicePoints(points)
            }

            user.onStreamTime = null
        }

        // User turn off their video
        if (
            sameChannel &&
            oldState.selfVideo === true &&
            newState.selfVideo === false
        ) {
            // onVideo: + time / 10-> tròn xuống.
            if (user.onVideoTime) {
                const points = Math.floor(
                    this.calcVoiceDuration(user.onVideoTime) / 10
                )

                await addVoicePoints(points)
            }

            user.onVideoTime = null
        }

        // User turn on their mic after mute
        if (sameChannel && oldState.mute === true && newState.mute === false) {
            user.onMicTime = now
        }

        // User turn on their stream
        if (
            sameChannel &&
            oldState.streaming === false &&
            newState.streaming === true
        ) {
            user.onStreamTime = now
        }

        // User turn on their video
        if (
            sameChannel &&
            oldState.selfVideo === false &&
            newState.selfVideo === true
        ) {
            user.onVideoTime = now
        }

        // User leave a voice
        if (oldState.channel !== null && newState.channel === null) {
            let points = 0

            // 1 hour in any voice = 1 VP
            if (user.joinedVoiceTime) {
                const countInVoiceTime = this.calcVoiceDuration(
                    user.joinedVoiceTime
                )

                points += Math.floor(countInVoiceTime / 12)
            }

            // onMicTime: + time * max(mem) / 5 -> tròn xuống
            if (user.joinedVoiceTime && user.onMicTime) {
                const countMember = this.store
                    .get('voiceChannels')
                    .get(oldState.channel.id)

                if (countMember) {
                    const calcPoints = Math.floor(
                        (this.calcVoiceDuration(user.onMicTime) *
                            countMember.peakMembers) /
                            5
                    )

                    points += calcPoints
                }
            }

            // streamTime: + time / 10 -> tròn xuống.
            if (user.joinedVoiceTime && user.onStreamTime) {
                const calcPoints = Math.floor(
                    this.calcVoiceDuration(user.onStreamTime) / 10
                )

                points += calcPoints
            }

            // onVideo: + time / 10-> tròn xuống.
            if (user.joinedVoiceTime && user.onVideoTime) {
                const calcPoints = Math.floor(
                    this.calcVoiceDuration(user.onVideoTime) / 10
                )
                points += calcPoints
            }

            await addVoicePoints(points)

            // Reset all props
            resetUserVoicePointsState()
        }

        await this.db.get(User).flush()
    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('voiceStateUpdate')
    @Guard(Maintenance)
    async voiceEmitter(
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
            this.eventManager.emit('voicePoint', oldState, newState)
        }
    }

    calcVoiceDuration(before: Date, after: Date = new Date()) {
        // 5 mins each
        return Math.floor((after.getTime() - before.getTime()) / (5 * 60_000))
    }
}
