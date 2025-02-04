import { apiConfig, websocketConfig } from '@configs'
import { Store as RxStore } from 'rxeta'
import { singleton } from 'tsyringe'

interface State {
    authorizedAPITokens: string[]
    ready: {
        bot: boolean | null
        api: boolean | null
        websocket: boolean | null
    }
    voiceChannels: Map<string, { peakMembers: number }>
    maintaining: boolean
}

const initialState: State = {
    authorizedAPITokens: [],
    ready: {
        bot: false,
        api: apiConfig.enabled ? false : null,
        websocket: websocketConfig.enabled ? false : null,
    },
    voiceChannels: new Map(),
    maintaining: false
}

@singleton()
export class Store extends RxStore<State> {
    constructor() {
        super(initialState)
    }
}
