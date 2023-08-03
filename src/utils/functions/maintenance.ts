import { Data } from '@entities'
import { Database, Store } from '@services'
import { resolveDependency } from '@utils/functions'
import { Client } from 'discordx'

/**
 * Get the maintenance state of the bot.
 */
export const isInMaintenance = async (): Promise<boolean> => {
    const db = await resolveDependency(Database)
    const dataRepository = db.get(Data)
    const maintenance = await dataRepository.get('maintenance')

    return maintenance
}

/**
 * Set the maintenance state of the bot.
 */
export const setMaintenance = async (maintenance: boolean) => {
    const db = await resolveDependency(Database)
    const store = await resolveDependency(Store)
    const dataRepository = db.get(Data)
    await dataRepository.set('maintenance', maintenance)
    await store.set("maintaining", maintenance)
}

/**
 * Set the maintaining bot status.
 */
export const setMaintainingStatus = async () => {
    const maintenance = await isInMaintenance();
    const client = await resolveDependency(Client)
    if (maintenance) {
        client.user?.setPresence({
            activities: [{ name: 'Maintaining...' }],
            status: 'dnd',
        })
        return
    }
}
