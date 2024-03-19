declare const logger: (...data: string[]) => void;
declare const GM_log: (message: string) => void;
export function log (...data: string[]) {
    if (typeof GM_log !== undefined) {
        GM_log(data.join(" | "));
    } else if (typeof console !== "undefined" && "log" in console && typeof console.log !== "undefined") {
        console.log(...data);
    } else if (typeof logger !== "undefined") {
        logger(...data);
    }
}

declare const unsafeWindow: any;
export function from_unsafe_window (key: string): any | null { return (typeof unsafeWindow !== "undefined" ? unsafeWindow[key] : (window as any)[key]) ?? null; }
export const doc: Document = from_unsafe_window("document") ?? window.document;
export const win: Window = typeof unsafeWindow == "undefined" ? window : unsafeWindow;

export function get_tab_async (): Promise<any> {
    return new Promise((resolve, reject) => GM_getTab(resolve))
}

export interface GMRequestOptions {
    url: string,
    method?: "GET" | "HEAD" | "POST",
    headers?: { [key: string]: string },
    data?: string | Blob | File | Object | Array<any> | FormData | URLSearchParams,
    redirect?: "follow" | "error" | "manual",
    cookie?: string,
    binary?: boolean,
    nocache?: boolean,
    revalidate?: boolean,
    timeout?: number,
    context?: any,
    responseType?: "arraybuffer" | "blob" | "json" | "stream",
    overrideMimeType?: string,
    anonymous?: boolean,
    fetch?: boolean,
    user?: string,
    password?: string,
    onabort?: () => any,
    onerror?: () => any,
    onloadstart?: () => any,
    onprogress?: () => any,
    onreadystatechange?: () => any,
    ontimeout?: () => any,
    onload?: () => any,
}
export interface GMResponse {
    finalUrl: string,
    readyState: number,
    status: number,
    statusText: string,
    responseHeaders: { [ key: string ]: string },
    response: any,
    responseXML: any,
    responseText: string
}