import { EventEmitter } from "../../eventemitter";
import { Conversation, ConversationList, FullConversation, GptAuth, GptResponse, Session } from "./api_types";
import { HttpEventSource } from "./httpeventsource";
import { Broadcast } from "../tab/broadcast";
import { win } from "../../tampermonkey_util";

const CONVERSATION_TITLE = "EDGENUITY_ANSWERS"
const LOCALSTORAGE_AUTH_KEY = "gpt_auth";

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
//    ^ the thing we all need

function is_gpt_auth (credentials: any): credentials is GptAuth {
    if (typeof credentials !== "object" || credentials === null) return false;
    if (typeof credentials.token !== "string") return false;
    return true;
}

/**
 * Internal. Pending API request.
 */
// interface _PendingApiRequest {
//     resolve: (value: Tampermonkey.Response<any> | PromiseLike<Tampermonkey.Response<any>>) => void;
//     reject: (reason?: any) => void;
//     options: ChatGptApiHandler.API_OPTIONS;
//     path: string;
//     attempts: number;
// }
// enum _PendingRequestStatus {
//     success,
//     need_auth,
//     need_refresh,
//     error
// }
class _QueueList {
	queue: { action?: () => any, resolve: (value: any) => any }[] = [];
	enqueue<T> (action: () => T | PromiseLike<T>): Promise<T> {
		//Represents a queued operation.
		/*Queued operations can be:
		  -A delay. (nothing passed in through parameter `f`)
		  -Or an async operation. ( I.e. ()=>new Promise(...) )
		*/
		return new Promise((resolve)=> this.queue.push({ action, resolve}) );
	}
    async process_item() {
		let item = this.queue.pop();
        if (typeof item === "undefined") {
            return void(0);
            /* NOTREACHED */
        }
        let { action, resolve } = item;
        let result: any;
        if (typeof action !== "undefined") result = await action();//start processing data
		resolve(result); //slap data back into the pipeline
	}
}
export class ChatGptApiHandler extends _QueueList {
    private credentials: GptAuth | null = null;
    /**
     * Process a pending API request. Returns true on success, false on failure-and-retry.
     * @param pending 
     * @returns 
     */
    // private async process_request (pending: _PendingApiRequest): Promise<_PendingRequestStatus> {
    //     // Destructuring to variables.
    //     const { resolve, reject, options, path } = pending;
    //     let { method = "GET", auth = true, body, cookie, headers } = options ?? {};
    //     // Construct URI.
    //     const url = ChatGptApiHandler.HOST.concat(path);
    //     console.log(`Making ${method} request to ${url}.`);
    //     // Set request headers.
    //     let payload_headers: Record<string, string> = {};
    //     if (auth === true) {
    //         // Try logging in if auth is unavailable.
    //         if (this.credentials === null) {
    //             console.log("Credentials are null. Attempting to log in.");
    //             //@TODO: Make this safer.
    //             // await this.login();
    //             return _PendingRequestStatus.need_auth;
    //         }
    //         if (this.credentials === null) {
    //             console.log("Credentials are null after login.");
    //             reject("Failed to log in.");
    //             return _PendingRequestStatus.error;
    //             /* UNREACHED */
    //         }
    //         payload_headers["Authorization"] = "Bearer " + this.credentials.token;
    //     }
    //     if (typeof headers !== "undefined") for (let header_name in headers) payload_headers[header_name] = headers[header_name];
    //     // Stringify body data.
    //     if (typeof body !== "undefined") {
    //         if (body === null) body = void(0);
    //         else if (typeof body === "object") {
    //             body = JSON.stringify(body);
    //             payload_headers["content-type"] = "application/json";
    //         }
    //     }
    //     // Request itself.
    //     const response: Tampermonkey.Response<any> = await GM.xmlHttpRequest({
    //         url: url,
    //         // Stupid @types/tampermonkey package... >:c
    //         method: method as "GET" | "POST" | "HEAD",
    //         data: body,
    //         cookie: cookie ?? void(0),
    //         headers: payload_headers
    //     });
    //     // Timestamp is set AFTER the request, in case of slow network~!
    //     this.last_api_request_timestamp = Date.now();
    //     // Check for errors.
    //     //@TODO: Check for 429 and fix ratelimits.
    //     if (response.status < 200 || response.status > 399) {
    //         // Refresh credentials if a 403 error is found, and the request was supposed to be authenticated.
    //         if ((response.status === 401 || response.status === 403) && auth === true) {
    //             if (pending.attempts < ChatGptApiHandler.MAX_ATTEMPTS) {
    //                 console.log(payload_headers["Authorization"]);
    //                 console.log(`Unauthorized request. Refreshing credentials. Have made ${pending.attempts} attempts so far.`);
    //                 //@TODO: Make this safer.
    //                 // await this.refresh_credentials();
    //                 return _PendingRequestStatus.need_refresh;
    //                 /* UNREACHED */
    //             }
    //             else {
    //                 reject(`Authorization failed.`);
    //                 return _PendingRequestStatus.error;
    //                 /* UNREACHED */
    //             }
    //         }
    //         // Throw error for any other error codes.
    //         else if (options.reject_on_error === true) {
    //             reject(`${response.status} ${response.statusText}\n${url}\n\n${response.responseText.slice(0, 2000)}`);
    //             return _PendingRequestStatus.error;
    //             /* UNREACHED */
    //         }
    //     }
    //     resolve(response);
    //     return _PendingRequestStatus.success;
    // }
    /**
     * Processes any pending API requests. Ensures credentials stay up to date and prevents ratelimits.
     * @returns 
     */
    // private async process_pending_api_requests () {
    //     if (this.is_processing_api_requests === true) {
    //         return void(0);
    //         /* UNREACHED */
    //     }
    //     // REMEMBER TO RUN THIS
    //     // this.ensure_fresh_login();
        
    //     // Do unauthenticated first, then authenticated??
    //     this.is_processing_api_requests = true;
    //     let unauthenticated = this.pending_api_requests.filter(r => r.options.auth !== true);
    //     let authenticated = this.pending_api_requests.filter(r => r.options.auth === true);
    //     while (true) {
    //         let pending: _PendingApiRequest | undefined = this.pending_api_requests.shift();
    //         // Nothing to do.
    //         if (typeof pending === "undefined") break;
    //     }
    //     this.is_processing_api_requests = false;
    //     /*while (true) {
    //         // Eat the oldest pending request.
    //         let pending_req: _PendingApiRequest | undefined = this.pending_api_requests.shift();
    //         // Nothing to do.
    //         if (typeof pending_req === "undefined") {
    //             this.is_processing_api_requests = false;
    //             console.log("Nothing to do now.");
    //             break;
    //         }
    //         // Enforce interval between requests, even if the setInterval was cleared and immediately refreshed.
    //         let time_since_last_request = Date.now() - this.last_api_request_timestamp;
    //         if (time_since_last_request < ChatGptApiHandler.API_INTERVAL_MS) await sleep(ChatGptApiHandler.API_INTERVAL_MS - time_since_last_request);
    //         if (pending_req.options.auth === true && this.) {

    //         }
            
    //         let result = await this.process_request(pending_req);
    //         switch (result) {}
    //         this.pending_api_requests.push(pending_req);
    //         await new Promise(r => setTimeout(r, ChatGptApiHandler.API_INTERVAL_MS));
    //     }*/
    // }
    processing_requests: boolean = false;
    last_request_timestamp: number = 0;
    private async process_requests (): Promise<void> {
        if (this.processing_requests === true) {
            return;
            /* NOTREACHED */
        }
        this.processing_requests = true;
        while (this.queue.length > 0) {
            let time_since_last_request = Date.now() - this.last_request_timestamp;
            if (time_since_last_request < ChatGptApiHandler.API_INTERVAL_MS) await sleep(ChatGptApiHandler.API_INTERVAL_MS - time_since_last_request);
            await this.process_item();
        }
        this.processing_requests = false;
    }
    private async enqueue_with_process<T> (action: () => T | PromiseLike<T>): Promise<T> {
        let result = this.enqueue(action);
        this.process_requests();
        return result;
    }
    /**
     * Makes an request to ChatGPT's API. Handles authorization and ratelimits.
     * @param path 
     * @param options 
     * @returns 
     */
    public async api (path: string, options: ChatGptApiHandler.API_OPTIONS = {}): Promise<Tampermonkey.Response<any>> {
		let { method = "GET", auth = true, body, cookie, headers, reject_on_error = true } = options ?? {};
		const url = ChatGptApiHandler.HOST.concat(path);
        console.log(`Making ${method} request to ${url}.`);
        let payload_headers: Record<string, string> = {};
        if (typeof headers !== "undefined") for (let header_name in headers) payload_headers[header_name] = headers[header_name];
        if (typeof body !== "undefined") {
            if (body === null) body = void(0);
            else if (typeof body === "object") {
                body = JSON.stringify(body);
                payload_headers["content-type"] = "application/json";
            }
        }
        if (auth === true) {
            // Try logging in if auth is unavailable.
            if (this.credentials === null) {
                console.log("Credentials are null. Attempting to log in.");
                await this.login();
            }
            if (this.credentials === null) {
                console.log("Credentials are null after login.");
                throw new Error("Failed to log in.");
                /* UNREACHED */
            }
            payload_headers["Authorization"] = "Bearer " + this.credentials.token;
        }

		let response = await this.enqueue_with_process<Tampermonkey.Response<any>>(() => 
            GM.xmlHttpRequest({
				url: url,
				// Stupid @types/tampermonkey package... >:c
				method: method as "GET" | "POST" | "HEAD",
				data: body,
				cookie: cookie ?? void(0),
				headers: payload_headers
            })
		);
        if (response.status > 399) {
            if ((response.status === 403 || response.status === 401) && auth === true) {
                await this.refresh_credentials();
                return await this.api(path, options);
            }
            else if (reject_on_error === true) throw new Error(`${response.status} ${response.statusText}\n${url}\n\n${response.responseText.slice(0, 2000)}`);
        }
        return response;
        // return new Promise((resolve, reject) => {
        //     let pending_obj: _PendingApiRequest = {
        //         resolve,
        //         reject,
        //         options,
        //         path,
        //         attempts: 0
        //     };
        //     this.pending_api_requests.push(pending_obj);
        //     this.process_pending_api_requests();
        // });
    }
    /**
     * Attempt to parse a JSON API response. Throws a descriptive error on failure.
     * @param response 
     * @returns 
     */
    public parse_response (response: Tampermonkey.Response<any>): any {
        const text = response.responseText;
        let result;
        try { result = JSON.parse(text); }
        catch (e) {
            throw new Error(
                "Failed to parse response.\n" +
                `${response.finalUrl} ${response.status} ${response.statusText}\n` +
                "\n" +
                response.responseText
            )
        }
        return result;
    }
    /**
     * Returns true if credentials are up-to-date.
     */
    private login_too_old (credentials?: GptAuth | null): boolean {
        console.log("Checking if credentials are too old.", credentials);
        // Use current credentials by default.
        if (typeof credentials === "undefined") credentials = this.credentials;
        // Return outdated if nothing is provided or set.
        if (credentials === null) {
            console.log("Credentials null. Assuming too old.");
            return true;
        }
        // Assume up-to-date if no timestamp is set.
        if (credentials.expires === null || typeof credentials.expires === "undefined") {
            console.log("Credentials don't have an expiry. Assuming they're fine.");
            return false;
        }
        // Check expiry. The important part :3
        let expires_at = new Date(credentials.expires);
        if (Date.now() - expires_at.getTime() >= 500) {
            console.log(`Credentials are too old. They expired ${Math.floor((Date.now() - expires_at.getTime()) / 1000)} seconds ago.`);
            return false;
        }
        console.log("Credenitals are NOT expired.");
        return true;
    }
    /**
     * Ensure credentials are up-to-date. Refresh and save them if not.
     */
    private async ensure_fresh_login (): Promise<void> {
        // I hope I don't need to explain this...
        console.log("Checking if login is expired...")
        if (this.login_too_old()) {
            console.log("Login is expired. Refreshing credentials.");
            await this.refresh_credentials();
        }
        return void(0);
    }
    /**
     * Forces fetching new credentials from OpenAI.
     */
    public async refresh_credentials (max_attempts: number = 3): Promise<void> {
        let session;
        let attempts = 0;
        while (true) {
            try {
                // Attempts to fetch session.
                // Error is returned, so it tries to log in again, fetching the session again, etc in an infinite loop.
                console.log("Fetching ChatGPT session...");
                attempts += 1;
                session = await this.session();
                console.log("ChatGPT session fetched.");
                break;
            }
            catch (e) {
                console.log("Failed to fetch session.");
                if (attempts <= max_attempts) {
                    await this.wait_for_tab_login();
                }
                else {
                    throw new Error("Failed to refresh credentials.")
                }
            }
        }
        console.log(`Received credentials from API.\n${session.accessToken}`);
        this.credentials = {
            token: session.accessToken,
            expires: session.expires
        }
        this.save_credentials();
    }
    /**
     * Waits for the user to log in in a new tab.
     */
    private async wait_for_tab_login (): Promise<void> {
        /*GM_openInTab("https://chat.openai.com/auth/login", {
            active: true,
            insert: true,
            setParent: true
        });*/
        // Wait for a broadcast from a ChatGPT tab.
        while (true) {
            let broadcast = await Broadcast.wait_for_broadcast(/^https?:\/\/chat.openai.com\//);
            let { event_name } = broadcast.payload;
            console.log(broadcast)
            if (event_name === "login") break;
        }
        return void(0);
    }
    /**
     * Attempt a login using ChatGPT API and cookies. Returns true if successful.
     */
    private async login_fetch (): Promise<boolean> {
        try {
            console.log("Refreshing credentials for login_fetch().");
            await this.refresh_credentials();
            console.log("Credentials refreshed for login_fetch().");
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
    /**
     * Attempts a localStorage login. Returns true if successful.
     */
    private login_localStorage (): boolean {
        // Do not attempt if localStorage does not exist :3
        if (typeof localStorage === "undefined") return false;
        // Nab from localStorage and attempt to parse.
        let ls_data = localStorage.getItem(LOCALSTORAGE_AUTH_KEY);
        if (ls_data === null) return false;
        let ls_json;
        try { ls_json = JSON.parse(ls_data); }
        catch (e) { return false; }
        if (!is_gpt_auth(ls_json)) return false;
        this.credentials = ls_json;
        return true;
    }
    /**
     * Saves current credentials to localStorage.
     */
    private async save_credentials (): Promise<void> {
        if (typeof localStorage === "undefined") {
            return;
        }
        if (this.credentials === null) {
            return;
        }
        // Attempt to save stringified credentials.
        let to_save = JSON.stringify(this.credentials);
        try { localStorage.setItem(LOCALSTORAGE_AUTH_KEY, to_save); }
        catch (e) { console.warn("Failed to save token to localStorage.") }
        return;
    }
    /**
     * Stores credentials from the first usable source (e. g. localStorage).
     * Returns true on success.
     */
    public async login (): Promise<boolean> {
        // Iterate through a list of login methods until something works :3c
        let methods: (() => boolean | Promise<boolean> | PromiseLike<boolean>)[] = [
            this.login_localStorage,
            this.login_fetch
        ];
        for (let method of methods) {
            let result = await method.bind(this)();
            // Save credentials if a method is successful.
            if (result === true) {
                this.save_credentials();
                return true;
            }
        }
        // Make sure the token we found is fresh.
        await this.ensure_fresh_login();
        return false;
    }
    /**
     * Fetches the current login session. Throws on failure.
     * @returns 
     */
    public async session (): Promise<Session> {
        console.log("API fetching session now...");
        let response = await this.api("/api/auth/session", { auth: false, reject_on_error: false });
        console.log("Fetch successful~!");
        // Cloudflare wants us to set a cookie.
        if (response.status === 403) throw new Error("Hit Cloudflare captcha.");
        // Parse the response.
        const session = await this.parse_response(response);
        // ChatGPT wants us to sign in.
        if (typeof session.accessToken === "undefined") throw new Error("No token in response. You need to sign in in a new tab.");
        return session as Session;
    }
    /**
     * Returns information about conversations and conversations themselves.
     * @param credentials 
     * @param param1 
     * @returns 
     */
    public async list_conversations ({ offset = 0, limit = 50, order = "updated" }: { offset?: number, limit?: number, order?: string }): Promise<ConversationList> {
        const response = await this.api(`/backend-api/conversations?offset=${offset}&limit=${limit}&order=${order}`);
        const data = this.parse_response(response);
        if (typeof data.items === "undefined") throw new Error("Failed to find a `conversations` object." + "\n" + JSON.stringify(data));
        return data;
    }
    /**
     * Gets a conversation object. Includes messages.
     * @param credentials 
     * @param convo 
     */
    async full_conversation (convo: Conversation | string): Promise<FullConversation.Conversation> {
        if (typeof convo !== "string") convo = convo.id;
        let response = await this.api("/backend-api/conversation/" + convo);
        let result = this.parse_response(response);
        return result;
    }
    /**
     * Find the last message in a Full Conversation mapping.
     * @param messages 
     * @returns 
     */
    last_message(messages: FullConversation.Mapping): FullConversation.FirstMessage | FullConversation.ClientMessage | FullConversation.ResponseMessage {
        const first_message = Object.values(messages).find(msg => msg.parent === null);
        if (typeof first_message === "undefined") throw new Error("Failed to find an orphan message to start from.");
        function find_last_child (message: FullConversation.MessageWrapper) {
            let child_with_children = message.children.find(child => messages[child].children.length > 0);
            if (typeof child_with_children === "undefined") return message;
            else return find_last_child(messages[child_with_children]);
        }
        let last = find_last_child(first_message);
        if (last.message !== null) return last.message;
        else throw new Error("Failed to find non-null message.");
    }
    /**
     * Find a conversation by its title. Returns null if not found.
     * @param credentials 
     * @param search 
     * @returns 
     */
    public async find_conversation (search: string | RegExp | ((convo: Conversation) => boolean)): Promise<Conversation | null> {
        const limit = 20;
        let offset = 0;
        while (true) {
            const info = await this.list_conversations({ offset, limit });
            offset += limit;
            if (offset - limit > info.total) break;
            let found;
            if (typeof search === "string") found = info.items.find(convo => convo.title === search);
            else if (typeof search === "function") found = info.items.find(convo => search(convo) === true);
            else found = info.items.find((convo: Conversation) => search.test(convo.title));
            if (typeof found !== "undefined") {
                return found;
            }
            await new Promise(r => setTimeout(r, 200));
        }
        return null;
    }
    /**
     * Generate the body for a Message API request.
     * @param param0 
     * @returns 
     */
    private make_message_api_body ({content, id, parent_id, conversation_id}: {conversation_id?: string, content: string, id?: string, parent_id?: string}) {
        return JSON.stringify({
            "action": "next",
            "conversation_id": conversation_id ?? void(0),
            "messages": [
              {
                "id": id ?? ChatGptApiHandler.random_uuid() ?? "aaa2fe31-895d-4cc2-9e9c-e75866526139",
                "author": {
                  "role": "user"
                },
                "content": {
                  "content_type": "text",
                  "parts": [ content ]
                },
                "metadata": {}
              }
            ],
            "parent_message_id": parent_id ?? ChatGptApiHandler.random_uuid() ?? "aaa17a65-d3a6-48dc-aee0-5555a62225f5",
            "model": "text-davinci-002-render-sha",
            "timezone_offset_min": 420,
            "suggestions": [
              "Explain options trading in simple terms if I'm familiar with buying and selling stocks.",
              "I want to cheer up my friend who's having a rough day. Can you suggest a couple short and sweet text messages to go with a kitten gif?",
              "I'm going to cook for my date who claims to be a picky eater. Can you recommend me a dish that's easy to cook?",
              "Write a 1-paragraph overview for a course called \"The Psychology Of Decision-Making\""
            ],
            "history_and_training_disabled": false,
            "arkose_token": null,
            "conversation_mode": { "kind": "primary_assistant", "plugin_ids": null },
            "force_paragen": false,
            "force_rate_limit": false
        });
    }
    /**
     * Read the message from a ChatGPT event stream.
     * @param source 
     * @param callback 
     * @returns 
     */
    private read_gpt_message (source: HttpEventSource, callback?: (chunk: GptResponse) => void): Promise<GptResponse> {
        return new Promise<GptResponse>((resolve, reject) => {
            let last_message: GptResponse;
            let conversation_id = null;
            let conversation_title = null;

            function data_listener (data: string) {
                if (data === "[DONE]") {
                    source.off("data", data_listener);
                    resolve(last_message);
                } else {
                    let json_data = null;
                    try { json_data = JSON.parse(data); }
                    catch (e) { return; }
                    if (typeof json_data.type === "undefined") {
                        if ("message" in json_data) {
                            last_message = json_data;
                            if (typeof callback !== "undefined") callback(json_data as GptResponse);
                        }
                    } else if (json_data.type === "title_generation") {
                        conversation_id = json_data.conversation_id;
                        conversation_title = json_data.title;
                    }
                }
            };
            source.on("data", data_listener);
        });
    }
    /**
     * Sets the title of a conversation.
     * @param credentials 
     * @param conversation_id 
     * @param title 
     */
    async set_title (conversation_id: Conversation | string, title: string): Promise<void> {
        if (typeof conversation_id !== "string") conversation_id = conversation_id.id;
        await this.api("/backend-api/conversation/" + conversation_id, {
            method: "PATCH",
            body: {"title": title}
        });
    }
    /**
     * Create a conversation of the given title. Returns a promise contianing ChatGPT's response.
     * @param credentials 
     * @param question 
     * @param chunk_callback 
     * @returns 
     */
    public async create_conversation (question: string, chunk_callback?: (msg: GptResponse) => void): Promise<GptResponse> {
        if (this.credentials === null) throw new Error("No credentials set.");
        if (this.credentials.token === null) throw new Error("Token not set.");
        let event_source = new HttpEventSource("https://chat.openai.com/backend-api/conversation", {
            cross_origin: true,
            headers: {
                "authorization": this.credentials.token,
                "content-type": "application/json"
            },
            "method": "POST",
            body: this.make_message_api_body({ content: question })
        });
        return this.read_gpt_message(event_source, chunk_callback);
    }
    public async delete_conversation (conversation_id: string | Conversation): Promise<void> {
        this.api("/backend-api/conversation/" + conversation_id, {
            method: "PATCH",
            body: {is_visible: false}
        });
    }
    public async reply_to({ content, conversation_id, parent_message_id, progress_callback }: ChatGptApiHandler.MessageOptions): Promise<GptResponse> {
        if (this.credentials === null) throw new Error("No credentials set.");
        if (this.credentials.token === null) throw new Error("Token not set.");
        let event_source = new HttpEventSource("https://chat.openai.com/backend-api/conversation", {
            cross_origin: true,
            headers: {
                "authorization": this.credentials.token,
                "content-type": "application/json"
            },
            "method": "POST",
            body: this.make_message_api_body({
                content,
                parent_id: typeof parent_message_id !== "undefined" ? (typeof parent_message_id === "string" ? parent_message_id : parent_message_id.id) : void(0),
                conversation_id: typeof conversation_id !== "undefined" ? (typeof conversation_id === "string" ? conversation_id : conversation_id.id) : void(0)
            })
        });
        return this.read_gpt_message(event_source, progress_callback);
    }
    private async _answer (question: string, use_localstorage: boolean, data_callback?: (response: GptResponse) => void): Promise<string> {
        // Try getting conversation from localStorage.
        let conversation_id: string | null;
        if (use_localstorage === true) {
            console.log("Taking conversation ID from localStorage.");
            conversation_id = typeof localStorage !== "undefined" ? localStorage.getItem(ChatGptApiHandler.CONVERSATION_LS_ID) : null;
            if (conversation_id === null) return this._answer(question, false, data_callback);
        } else {
            console.log("Fetching conversation ID.")
            conversation_id = (await this.find_conversation(CONVERSATION_TITLE))?.id ?? null;
        }
        // Do the thing...
        let response_text: string;
        // Create a new conversation if the ID is null.
        if (conversation_id === null) {
            if (use_localstorage === true) return this._answer(question, false, data_callback);
            else {
                let { message, conversation_id } = await this.create_conversation(question, data_callback);
                response_text = message.content.parts[0];
                await this.set_title(conversation_id, ChatGptApiHandler.CONVERSATION_TITLE);
            }
        }
        // Use existing conversation if the ID is not null.
        else {
            // Try getting conversation. If something goes wrong because of localStorage, retry without it.
            let convo_data;
            try { convo_data = await this.full_conversation(conversation_id); }
            catch (e) {
                if (use_localstorage === true) {
                    return this._answer(question, false, data_callback);
                    /* NOTREACHED */
                }
                else throw e;
            }
            // Update localStorage key with a working value.
            if (use_localstorage === false && typeof localStorage !== "undefined") localStorage.setItem(ChatGptApiHandler.CONVERSATION_LS_ID, conversation_id);
            // Delete and try again if the convo has gotten too big.
            if (Object.keys(convo_data.mapping).length > ChatGptApiHandler.MAX_MESSAGES_PER_CONVERSATION) {
                await this.delete_conversation(conversation_id);
                return await this._answer(question, use_localstorage, data_callback);
            }
            const last_message = this.last_message(convo_data.mapping);
            let { message } = await this.reply_to({
                parent_message_id: last_message.id,
                conversation_id: convo_data.conversation_id,
                content: question,
                progress_callback: data_callback
            });
            response_text = message.content.parts[0];
        }
        return response_text;
    }
    /**
     * Answer a question with ChatGPT.
     * @param question 
     * @param data_callback 
     */
    //@TODO: Cache token in localStorage
    //@TODO: Cache conversation ID in localStorage
    //@TODO: Handle reauthentication if 403 received
    //@TODO: Dynamically get/set answer on all question types
    //@TODO: Delete/recreate conversation if it gets too big
    public async answer (question: string, data_callback?: (response: GptResponse) => void): Promise<string> {
        return this._answer(question, true, data_callback);
    }
}
export namespace ChatGptApiHandler {
    export const HOST = "https://chat.openai.com";
    export const MAX_ATTEMPTS = 5;
    export const CONVERSATION_TITLE = "EDGENUITY_ANSWERS";
    export const API_INTERVAL_MS = 3 * 1000;
    export const MAX_MESSAGES_PER_CONVERSATION = 50;
    export const CONVERSATION_LS_ID = ""
    export interface API_OPTIONS {
        method?: string,
        auth?: boolean,
        body?: string | null | any,
        cookie?: string,
        headers?: Record<string, string>,
        reject_on_error?: boolean,
    }
    export interface MessageOptions {
        content: string,
        conversation_id?: string | Conversation,
        parent_message_id?: string | FullConversation.Message | FullConversation.MessageWrapper,
        progress_callback?: (msg: GptResponse) => void,
    }
    export function random_uuid () { return win.self.crypto.randomUUID(); }
}
