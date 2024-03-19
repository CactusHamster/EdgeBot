/*
    // First tab of url
    Client sets FIND_REQ key to a value containing a request ID and match expression.
    The first tab matching the FIND key's expression changes the FIND_RES key to its tab id.

    // Request
    Client sets REQUEST key to a request object containing the dest id, client id, message id, etc.
    To respond, the server first sets the ACK key to an acknowledge object.
    then the server sets the RESPONSE key to a response object containing the message id and client id.

    Servers ignore all requests whose dest id is not their own tab id.
    Servers ignore all requests whose age is older than their max_age parameter.

    Clients ignore all responses not sent to their ID.
    Clients ignore all responses to nonpending messages.

    Tab ID is stored in GM_saveTab("tab2tab_tabid")
*/

import { EventEmitter } from "../../eventemitter";
import { win } from "../../tampermonkey_util";
import { TAB_ID_KEY, REQUEST_KEY, RESPONSE_KEY, FIND_REQ_KEY, FIND_RES_KEY, ACK_KEY, KEEPALIVE_REQ_KEY } from "./constants";

// Various timeouts in seconds.
const FIND_REQUEST_TIMEOUT = 3;
const ACKNOWLEDGE_REQUEST_TIMEOUT = 3;
const REQUEST_TIMEOUT = 10;

type Timeout = ReturnType<typeof setTimeout>;

interface BasicRequest {
    /**
     * My unique ID.
     */
    request_id: string;
    /**
     * The tab I came from.
     */
    sender_id: string;
}
function is_basicrequest (obj: any): obj is BasicRequest {
    return "sender_id" in obj && "request_id" in obj;
}

interface BasicResponse {
    /**
     * ID of the specific request I'm responding to.
     */
    responding_to_msg: string;
    /**
     * ID of the tab I'm responding to.
     */
    responding_to_tab: string
    /**
     * ID of the tab I came from.
     */
    sent_from: string;
}
function is_basicresponse (obj: any): obj is BasicResponse {
    return "responding_to_msg" in obj && "responding_to_tab" in obj && "sent_from" in obj;
}

interface GMRequest extends BasicRequest {
    destination: string;
    sent_at: number;
    max_age: number;
    data: any;
};
function is_gm_request (obj: any):       obj is GMRequest {
    if (!is_basicrequest(obj)) return false;
    return true;
}

interface GMResponse extends BasicResponse {
    status: "OK" | "ERR";
    error_message?: string;
    data: any;
}
function is_gm_response (obj: any):      obj is GMResponse {
    if (!is_basicresponse(obj)) return false;
    return true;
}

interface GMFindRequest extends BasicRequest {
    /**
     * String to match with tab url.
     */
    match: string;
    /**
     * String represents a RegExp?
     */
    is_regex: boolean;
}
function is_gm_find_request (obj: any):  obj is GMFindRequest {
    if (!is_basicrequest(obj)) return false;
    if (typeof (obj as GMFindRequest).match !== "string") return false;
    if (typeof (obj as GMFindRequest).is_regex !== "boolean") return false;
    return true;
}

interface GMFindResponse extends BasicResponse {
    /**
     * The URL of the tab found.
     */
    href: string;
}
function is_gm_find_response (obj: any): obj is GMFindResponse {
    if (!is_basicresponse(obj)) return false;
    if (typeof (obj as GMFindResponse).href !== "string") return false;
    return true;
}

interface GMAck extends BasicResponse {}
function is_gm_ack_response (obj: any):  obj is GMAck {
    if (!is_basicresponse(obj)) return false;
    return true;
}

interface GMRequestKeepAlive extends BasicResponse {
    time_ms?: number
}
function is_gm_request_keepalive (obj: any): obj is GMRequestKeepAlive {
    if (!is_basicresponse(obj)) return false;
    return true;
}

// FindRequest pending resolution within the client.
interface _Client_PendingFindRequest {
    request_id: string;
    timeout: Timeout;
    resolve: (value: (string | null) | PromiseLike<string | null>) => void;
    // No reject() because it just resolves to null on failure.
}

// Request pending resolution within the client.
interface _Client_PendingRequest {
    request_id: string;
    destination_id: string;
    resolve: (value: TabResponse | PromiseLike<TabResponse>) => void;
    reject: (reason?: string | TabResponse) => void;
    /**
     * Timeout set to reject the promise if not acknowledged in time.
     */
    acknowledge_timeout: Timeout;
    /**
     * Timeout set to reject the promise if not responded to in time.
     */
    response_timeout: Timeout;
    /**
     * Whether the request has been acknowledged or not.
     */
    acknowledged: boolean;
    /**
     * Method to refresh the timeout.
     */
    refresh_response_timeout: (time_ms?: number) => void;
}

/**
 * Object emitted by TabServer on requests.
 */
export interface TabRequest {
    data: any;
    sender_id: string;
    responded_to: boolean;
    _respond_raw: (data: any, status: "OK" | "ERR") => void;
    respond: (data: any) => void;
    keep_alive: (time_ms?: number) => void;
    error: (reason: string) => void;
}
/**
 * Object returned by TabClient.request().
 */
export interface TabResponse extends GMResponse {};

/**
 * Returns the ID of the current tab, using its GM tab storage.
 * @param tab_storage The tab object, provided by GM_getTab().
 */
function get_tab_id (tab_storage: any): string {
    // Set a tab ID if none is set already.
    if (typeof tab_storage[TAB_ID_KEY] !== "string") tab_storage[TAB_ID_KEY] = Date.now().toString(16);
    return tab_storage[TAB_ID_KEY];
}

function gen_id () {
    // silly :3
    return Math.random().toString(16) + Date.now().toString(16);
}
export class TabServer extends EventEmitter<"request"> {
    tab_id: string;
    constructor (tab_storage: any) {
        super();
        this.tab_id = get_tab_id(tab_storage);
        GM_addValueChangeListener(REQUEST_KEY, (_1,_2,request,_3) => this.onvaluechange_request(request));
        GM_addValueChangeListener(FIND_REQ_KEY, (_1,_2,find_request,_3) => this.onvaluechange_request_find(find_request));
    }
    private acknowledge_request (request: GMRequest): void {
        const payload: GMAck = {
            responding_to_msg: request.request_id,
            responding_to_tab: request.sender_id,
            sent_from: this.tab_id
        }
        GM_setValue(ACK_KEY, JSON.stringify(payload));
    }
    /**
     * Handle client requests.
     * @param request 
     */
    onvaluechange_request (request: any): void {
        try { request = JSON.parse(request); }
        catch (e) { return; }
        if (!is_gm_request(request)) return;
        if (request.destination !== this.tab_id || Date.now() - request.max_age > request.sent_at) return;
        this.acknowledge_request(request);
        let tab_id = this.tab_id;
        let request_id = request.request_id;
        let request_tab_id = request.sender_id;
        let pretty_request: TabRequest = {
            responded_to: false,
            data: request.data,
            sender_id: request.sender_id,
            keep_alive: (time_ms?: number) => {
                let payload: GMRequestKeepAlive = {
                    responding_to_msg: request_id,
                    responding_to_tab: request_tab_id,
                    sent_from: this.tab_id,
                    time_ms: time_ms
                }
                GM_setValue(KEEPALIVE_REQ_KEY, JSON.stringify(payload));
            },
            _respond_raw: function (data: any, status: "OK" | "ERR") {
                if (this.responded_to === true) throw new Error("Request already responded to.");
                this.responded_to = true;
                let payload: GMResponse = {
                    status: status,
                    sent_from: tab_id,
                    responding_to_msg: request_id,
                    responding_to_tab: request_tab_id,
                    data: data
                }
                GM_setValue(RESPONSE_KEY, JSON.stringify(payload));
            },
            respond: function (data: any): void { this._respond_raw(typeof data === "object" ? JSON.stringify(data) : data, "OK"); },
            error: function (reason: string): void { this._respond_raw(reason, "ERR"); }
        }
        this._emit("request", pretty_request);
    }
    /**
     * Handle clients resolving our URL to our tab ID.
     * @param find_request Object sent from client containing match parameters.
     */
    onvaluechange_request_find (find_request: any): void {
        try { find_request = JSON.parse(find_request) }
        catch (e) { return; }
        if (!is_gm_find_request(find_request)) return;
        // Test if this tab's URL matches.
        let match: string | RegExp = find_request.match;
        if (find_request.is_regex) {
            let split = match.split("/");
            match = new RegExp(split[1] ?? "", split[2] ?? "");
            if (!match.test(win.location.href)) return;
        } else {
            if (window.location.href !== match) return;
        }
        // Tell the client we matched.
        const payload: GMFindResponse = {
            sent_from: this.tab_id,
            responding_to_msg: find_request.request_id,
            responding_to_tab: find_request.sender_id,
            href: window.location.href
        }
        GM_setValue(FIND_RES_KEY, JSON.stringify(payload));
    }
}
export class TabClient {
    tab_id: string;
    pending_requests: _Client_PendingRequest[]          = [];
    pending_find_requests: _Client_PendingFindRequest[] = [];
    constructor (tab_storage: any) {
        this.tab_id = get_tab_id(tab_storage);
        GM_addValueChangeListener(ACK_KEY, (_1,_2,ack_response,_3) => this.onvaluechange_ack(ack_response));
        GM_addValueChangeListener(RESPONSE_KEY, (_1,_2,response,_3) => this.onvaluechange_response(response));
        GM_addValueChangeListener(FIND_RES_KEY, (_1,_2,find_response,_3) => this.onvaluechange_resolve_find(find_response));
        GM_addValueChangeListener(KEEPALIVE_REQ_KEY, (_1,_2,keepalive_obj,_3) => this.onvaluechange_request_keepalive(keepalive_obj));
    }
    onvaluechange_ack (ack_response: any): void {
        try { ack_response = JSON.parse(ack_response) }
        catch (e) { return; }
        if (!is_gm_ack_response(ack_response) || ack_response.responding_to_tab !== this.tab_id) return;
        let resolved = this.pending_requests.find(req => req.request_id === ack_response.responding_to_msg);
        if (typeof resolved === "undefined") return;
        clearTimeout(resolved.acknowledge_timeout);
    }
    onvaluechange_response (response: any): void {
        try { response = JSON.parse(response) }
        catch (e) { return; }
        if (!is_gm_response(response) || response.responding_to_tab !== this.tab_id) return;
        let resolved_i = this.pending_requests.findIndex(req => req.request_id === response.responding_to_msg);
        if (resolved_i === -1) return;
        let resolved = this.pending_requests[resolved_i];
        clearTimeout(resolved.response_timeout);
        clearTimeout(resolved.acknowledge_timeout);
        const fancy_response: TabResponse = response;
        if (response.status === "OK") resolved.resolve(fancy_response);
        else resolved.reject(fancy_response);
    }
    onvaluechange_resolve_find (find_response: any): void {
        try { find_response = JSON.parse(find_response) }
        catch (e) { return; }
        if (!is_gm_find_response(find_response) || find_response.responding_to_tab !== this.tab_id) return;
        let resolved_i = this.pending_find_requests.findIndex(r => r.request_id === find_response.responding_to_msg);
        if (resolved_i === -1) return;
        let resolved = this.pending_find_requests[resolved_i];
        this.pending_find_requests.splice(resolved_i, 1);
        clearTimeout(resolved.timeout);
        resolved.resolve(find_response.sent_from);
    }
    onvaluechange_request_keepalive (keepalive_request: any): void {
        try { keepalive_request = JSON.parse(keepalive_request); }
        catch (e) { return; }
        if (!is_gm_request_keepalive(keepalive_request) || keepalive_request.responding_to_tab !== this.tab_id) return;
        let resolved = this.pending_requests.find(req => req.request_id === keepalive_request.responding_to_msg);
        if (typeof resolved === "undefined") return;
        resolved.refresh_response_timeout(keepalive_request.time_ms);
    }
    request (tab_id: string, data?: any): Promise<TabResponse> {
        const request_id = gen_id();
        let payload: GMRequest = {
            data: data ?? null,
            destination: tab_id,
            request_id: request_id,
            sender_id: this.tab_id,
            sent_at: Date.now(),
            max_age: REQUEST_TIMEOUT * 1000
        };
        GM_setValue(REQUEST_KEY, JSON.stringify(payload));
        return new Promise((resolve, reject) => {
            // Reject if not acknowledged in time.
            const acknowledge_timeout = setTimeout(() => {
                let index = this.pending_requests.findIndex(req => req.request_id === request_id);
                if (index !== -1) {
                    let req = this.pending_requests[index];
                    if (req.acknowledged === false) {
                        clearTimeout(req.response_timeout);
                        this.pending_requests.splice(index, 1);
                        req.reject("Request not accepted.");
                    }
                }
            }, ACKNOWLEDGE_REQUEST_TIMEOUT * 1000);
            // Reject if not responded to in time.
            const on_timeout = () => {
                let index = this.pending_requests.findIndex(req => req.request_id === request_id);
                if (index !== -1) {
                    let req = this.pending_requests[index];
                    clearTimeout(req.acknowledge_timeout);
                    this.pending_requests.splice(index, 1);
                    req.reject("Request timed out.");
                }
            }
            const begin_response_timeout = (time_ms: number = REQUEST_TIMEOUT * 1000) => setTimeout(on_timeout, time_ms);
            function refresh_response_timeout (this: _Client_PendingRequest, time_ms?: number) {
                clearInterval(this.response_timeout);
                this.response_timeout = begin_response_timeout(time_ms);
            }
            // Push request to stack for resolution.
            const pending: _Client_PendingRequest = {
                acknowledged: false,
                destination_id: tab_id,
                resolve: resolve,
                reject: reject,
                request_id: request_id,
                acknowledge_timeout: acknowledge_timeout,
                response_timeout: begin_response_timeout(),
                refresh_response_timeout: refresh_response_timeout,
            }
            this.pending_requests.push(pending);
        });
    }
    /**
     * Get the ID of the first matching tab.
     * @param match String/RegExp to match with.
     * @returns 
     */
    first_tab_of_url (match: string | RegExp): Promise<string | null> {
        const id = gen_id();
        const is_regex = match instanceof RegExp;
        if (match instanceof RegExp) match = match.toString();
        const payload: GMFindRequest = {
            request_id: id,
            match: match,
            sender_id: this.tab_id,
            is_regex: is_regex
        }
        GM_setValue(FIND_REQ_KEY, JSON.stringify(payload));
        return new Promise((resolve, reject) => {
            // Return null if find request takes too long.
            let timeout = setTimeout(() => {
                let index = this.pending_find_requests.findIndex(req => req.request_id === payload.request_id);
                let req = this.pending_find_requests[index];
                if (index !== -1) {
                    this.pending_find_requests.splice(index, 1);
                    req.resolve(null);
                }
            }, FIND_REQUEST_TIMEOUT * 1000);
            const pending: _Client_PendingFindRequest = {
                timeout: timeout,
                request_id: id,
                resolve: resolve
            }
            this.pending_find_requests.push(pending);
        });
    }
}

/**
 * Finds the first tab of the URL, and opens it if it does not exist.
 */
export async function create_tab_if_not_exists (tab_client: TabClient, url: string, match?: string | RegExp): Promise<string> {
    let tab_id: string | null = null;
    while (tab_id === null) {
        tab_id = await tab_client.first_tab_of_url(match ?? url);
        if (tab_id === null) {
            GM_openInTab(url, { active: false, insert: true });
            await new Promise(r => setTimeout(r, 3 * 1000));
        }
    }
    return tab_id
}