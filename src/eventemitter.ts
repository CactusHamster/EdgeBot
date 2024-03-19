type callback = (data: any) => any;
export class EventEmitter<event_name_t extends string> {
    private listeners: Map<event_name_t, ((value: any) => any)[]> = new Map();
    /**
     * Runs a callback when the event is emitted.
     */
    on (event_name: event_name_t, callback: callback): void {
        let listeners = this.listeners.get(event_name);
        if (typeof listeners === "undefined" || listeners === null) {
            listeners = [];
            this.listeners.set(event_name, listeners);
        }
        listeners.push(callback);
    }
    /**
     * Removes a callback from event listeners.
     * @param event_name
     * @param callback
     */
    off (event_name: event_name_t, callback: callback): void {
        let listeners = this.listeners.get(event_name);
        if (typeof listeners !== "undefined")  {
            let index = listeners.indexOf(callback);
            if (index !== -1) listeners.splice(index, 1);
        }
    }
    /**
     * Emit an event.
    */
    _emit (event_name: event_name_t, data: any) {
        let listeners = this.listeners.get(event_name);
        if (Array.isArray(listeners)) {
            for (let listener of listeners) listener(data);
        }
    }
}