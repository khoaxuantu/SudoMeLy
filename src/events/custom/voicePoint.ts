import { ArgsOf, Client, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, PointManager, EventManager, Logger, Stats, Store } from '@services'
import { VoiceState } from 'discord.js'

@Discord()
@injectable()
export default class VoicePointEvent {
    constructor(    
        private eventManager: EventManager,
        private pm: PointManager
    ) {}

    // =============================
    // ========= Handlers ==========
    // =============================

    @OnCustom('voicePoint')
    async voicePointHandler(oldState: VoiceState, newState: VoiceState) {
        await this.pm.voiceAdd(oldState, newState);
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
