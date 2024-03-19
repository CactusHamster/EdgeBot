import { EventEmitter } from "../../eventemitter";
/**
 * Options when creating an HttpEventSource.
 */
interface HttpEventSourceOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "TRACE";
    headers?: Map<string, string> | { [key: string]: string };
    body?: string | any;
    cross_origin?: boolean;
}
/**
 * Implementation of EventSource that uses methods and headers.
 */
export class HttpEventSource extends EventEmitter<"error" | "message" | "open" | string> {
    url: string;
    current_data_index: number = 0;
    readyState: number = 0;
    constructor (url: string | URL, options: HttpEventSourceOptions) {
        super();
        this.url = typeof url === "string" ? url : url.href;
        this.initialize(url, options);
    }

    private last_incomplete_event_block: string | null = null;
    private on_data (data: string) {
        /*
            Whether the block is complete or not.
        */
        let is_complete = data.endsWith("\n\n");
        // Blocks of events. Each block should be lines of the same kind of event.
        let blocks = data.split("\n\n");
        for (let block_index = 0; block_index < blocks.length; block_index++) {
            let block = blocks[block_index];
            // Add the last incomplete block to the first block of this packet.
            if (block_index === 0 && this.last_incomplete_event_block !== null) {
                block = this.last_incomplete_event_block + block;
            }
            // If it's the last block, skip it because it's either empty or incomplete and will be added to the next block.
            if (block_index === blocks.length - 1) {
                if (!is_complete) this.last_incomplete_event_block = block;
                else this.last_incomplete_event_block = null;
                continue;
            }
            let lines = block.split("\n");
            let event_name: string | null = null;
            let event_data_strips = [];
            for (let line of lines) {
                let colon_index = line.indexOf(":");
                // to heck with the stupid Suckless "sTaNdArds" >:3
                if (colon_index === -1) {
                    console.warn(`Failed to find colon in line. (line: ${line.slice(0, 15)})`);
                    continue;
                }
                let event_name_strip = line.slice(0, colon_index);
                let data_strip = line.slice(colon_index + 2);
                if (event_name === null) event_name = event_name_strip;
                else if (event_name !== event_name_strip) {
                    console.warn(`Unexpected event name change in line. Expected name "${event_name}" and got "${event_name_strip}".`);
                    continue;
                }
                event_data_strips.push(data_strip);
            }
            let event_data = event_data_strips.join("\n");
            if (event_name !== null) this._emit(event_name, event_data);
        }
    }
    async initialize(url: string | URL, options?: HttpEventSourceOptions): Promise<void> {
        // Use a TamperMonkey/GreaseMonkey request if cross_origin is enabled.
        if (options?.cross_origin) return new Promise((resolve, reject) => {
            if (typeof options === "undefined") options = {};
            if (typeof options.method !== "undefined" && options.method !== "GET" && options.method !== "POST" && options.method !== "HEAD") throw new Error(`Unsupported method for cross-origin request ${options.method}.`);
            let abort_handle: Tampermonkey.AbortHandle<void>;
            const is_stream_supported = (GM_xmlhttpRequest as any).RESPONSE_TYPE_STREAM;
            const stream_decoder = new TextDecoderStream("utf-8");
            const request_options: Tampermonkey.Request<any> = {
                url: url instanceof URL ? url.href : url,
                method: options.method ?? "GET",
                headers: options.headers instanceof Map ? Object.fromEntries(options.headers) : (options.headers ?? {}),
                data: options.body,
                // fetch: true,
                responseType: 'stream',
                onerror: reject,
                onreadystatechange: async (response) => {
                    const { readyState: ready_state, responseHeaders: response_headers, status, statusText: status_text, response: readable_stream } = response;
                    if (ready_state === 2 /* HEADERS_RECEIVED */) {
                        if (!(readable_stream instanceof ReadableStream)) throw new Error("Response is not an instance of ReadableStream.");
                        const text_stream = readable_stream.pipeThrough(stream_decoder);
                        const reader = text_stream.getReader();
                        while (true) {
                            let result = await reader.read();
                            if (result.done === true) break;
                            else if (typeof result.value !== "undefined") this.on_data(result.value);
                        }
                    }
                }
            }
            abort_handle = GM_xmlhttpRequest(request_options);
            
        });
        else return new Promise((resolve, reject) => {
            // Make typescript happy
            if (typeof options === "undefined") options = {};
            // New request~!
            const request = new XMLHttpRequest();
            // Process data as it is received.
            let progress_listener = (progress: ProgressEvent<XMLHttpRequestEventTarget>) => {
                let data = (request.responseText ?? "").substring(this.current_data_index, progress.loaded);
                this.current_data_index += progress.loaded;
                this.on_data(data);
            }
            request.addEventListener("progress", progress_listener);
            // Open the XMLHttpRequest.
            request.open(options.method ?? "GET", url);
            // Add the headers.
            if (typeof options.headers !== "undefined") {
                if (options.headers instanceof Map) options.headers.forEach((value, name) => request.setRequestHeader(name, value));
                else for (let header_name in options.headers) request.setRequestHeader(header_name, options.headers[header_name]);
            }
            // Resolve/reject based on load or error events.
            let load_listener = (event: ProgressEvent<XMLHttpRequestEventTarget>) => {
                // I'm optimistic, so success comes before error :3
                request.removeEventListener("progress", progress_listener);
                request.removeEventListener("load", load_listener);
                request.removeEventListener("error", error_listener);
                this._emit("_done", void(0));
                resolve();
            };
            let error_listener = (event: ProgressEvent<XMLHttpRequestEventTarget>) => {
                request.removeEventListener("progress", progress_listener);
                request.removeEventListener("load", load_listener);
                request.removeEventListener("error", error_listener);
                reject(event);
            };
            request.addEventListener("error", error_listener, { once: true });
            request.addEventListener("load", load_listener, { once: true });
            // Send any body data, end the request.
            if (typeof options.body !== "undefined") {
                let body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
                // Finish up~!
                request.send(body);
            } else {
                // Finish up~!
                request.send(null);
            }
            // All done!
        });
    }
}