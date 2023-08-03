import { ArgsOf, Client, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { GuildOnly, Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import {
    Database,
    PointManager,
    EventManager,
    Logger,
    Stats,
    Store,
} from '@services'
import { VoiceState } from 'discord.js'
import { NotBot } from '@discordx/utilities'

@Discord()
@injectable()
export default class VoicePointEvent {
    constructor(
        private eventManager: EventManager,
        private pm: PointManager,
        private store: Store
    ) {}

    // =============================
    // ========= Handlers ==========
    // =============================

    @OnCustom('voicePoint')
    async voicePointHandler(oldState: VoiceState, newState: VoiceState) {
        await this.pm.voiceAdd(oldState, newState)
    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('voiceStateUpdate')
    @Guard(NotBot)
    async voiceEmitter(
        [oldState, newState]: ArgsOf<'voiceStateUpdate'>
        // client: Client
    ) {
        if (this.store.get('maintaining')) {
            return
        }

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
}
