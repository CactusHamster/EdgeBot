import { TAB_ID_KEY, BROADCAST_KEY } from "./constants"
export namespace Broadcast {
    export interface BroadcastOptions {
        /**
         * GM_getTab() object. Used to find Tab ID.
         */
        tab_obj: any;
        /**
         * Broadcast payload. Must consist of primitive, stringifiable values.
         */
        payload: any;
    }
    export interface Broadcast {
        sender_id?: string;
        sender_href: string;
        payload: any;
    }
    export function is_broadcast (obj: any) {
        if (typeof obj !== "object") return false;
        else if (typeof obj.sender_href !== "string") return false;
        return true;
    }
    interface PendingBroadcast {
        resolve: (broadcast:Broadcast|PromiseLike<Broadcast>) => void;
        reject: (reason:string) => void;
        test?: string | RegExp;
    }
    let pending: PendingBroadcast[] = [];
    GM_addValueChangeListener(BROADCAST_KEY, (_1, _2, received, _3) => {
        // Attempt to parse data.
        try { received = JSON.parse(received); }
        catch (e) {
            return;
            /* NOTREACHED */
        }
        if (!is_broadcast(received)) {
            return;
            /* NOTREACHED */
        }
        // Fire broadcast to listeners.
        pending.forEach((p) => {
            if (typeof p.test === "undefined") p.resolve(received)
            else {
                if (typeof p.test === "string") {
                    if (p.test === received.sender_href) p.resolve(received);
                }
                else {
                    if (p.test.test(received.sender_href)) p.resolve(received);
                }
            }
        });
    });
    /**
     * Waits for the next broadcast.
     * @param options 
     */
    export async function broadcast (options: BroadcastOptions): Promise<void> {
        let payload: Broadcast = {
            sender_id: options.tab_obj?.[TAB_ID_KEY],
            sender_href: window.location.href,
            payload: options.payload
        };
        GM_setValue(BROADCAST_KEY, JSON.stringify(payload));
    }
    export async function wait_for_broadcast (test?: string | RegExp): Promise<Broadcast> {
        return new Promise((resolve, reject) => pending.push({ resolve, reject, test }) );
    }
}
