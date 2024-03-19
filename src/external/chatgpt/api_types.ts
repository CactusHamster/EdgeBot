export interface Conversation {
    id:                       string;
    title:                    string;
    create_time:              string;
    update_time:              string;
    mapping:                  null;
    current_node:             null;
    conversation_template_id: null;
    gizmo_id:                 null;
    is_archived:              boolean;
    workspace_id:             null;
}
export interface ConversationList {
    has_missing_conversations: boolean;
    items: Conversation[];
    /**
     * Limit of conversation count returned in request.
     */
    limit: number;
    /**
     * Offset of the conversations list.
     */
    offset: number;
    /**
     * Total number of conversations user has started.
     */
    total: number;
}
export interface User {
    id:            string;
    name:          string;
    email:         string;
    image:         string;
    picture:       string;
    idp:           string;
    iat:           number;
    mfa:           boolean;
    groups:        any[];
    intercom_hash: string;
}
export interface Session {
    user:         User;
    expires:      string;
    accessToken:  string;
    error:        string;
    authProvider: string;
}
export namespace FullConversation {
    export interface Conversation {
        title:                    string;
        create_time:              number;
        update_time:              number;
        mapping:                  Mapping;
        moderation_results:       any[];
        current_node:             string;
        plugin_ids:               null;
        conversation_id:          string;
        conversation_template_id: null;
        gizmo_id:                 null;
        is_archived:              boolean;
        safe_urls:                string[];
    }
    export type Mapping = Record<string, MessageWrapper>
    export interface Message {
        id:          string;
        author:      Author;
        create_time: number | null;
        update_time: number | null;
        content:     Content;
        status:      Status;
        end_turn:    boolean;
        weight:      number;
        recipient:   "all";
    }
    export interface FirstMessageMetadata { is_visually_hidden_from_conversation: true; };
    export interface FirstMessage extends Message {
        create_time: null;
        update_time: null;
        metadata: FirstMessageMetadata;
    }
    export interface ClientMessageMetadata {
        message_type:   null;
        model_slug:     "text-davinci-002-render-sha" | string;
        parent_id:      string;
        finish_details: FinishDetails;
        timestamp_:     "absolute";
        is_complete:    boolean;
    }
    export interface ClientMessage extends Message {
        create_time: number;
        update_time: null;
        metadata:    ClientMessageMetadata;
    }
    export interface ResponseMessageMetadata {
        message_type:    null;
        model_slug?:     "text-davinci-002-render-sha" | string;
        parent_id?:      string;
        finish_details?: FinishDetails;
        timestamp_:      "absolute";
        is_complete?:    boolean;
    }
    export interface ResponseMessage {
        id:          string;
        author:      Author;
        create_time: number;
        update_time: null;
        content:     Content;
        status:      Status;
        end_turn:    boolean | null;
        weight:      number;
        metadata:    ResponseMessageMetadata;
        recipient:   "all";
    }
    export interface MessageWrapper {
        id: string;
        message: FirstMessage | ClientMessage | ResponseMessage | null;
        parent: string | null;
        children: string[];
    }
    export interface FirstMessageWrapper extends MessageWrapper {
        id: string,
        message: null,
        parent: null,
        children: string[]
    }
    export interface AuthorMetadata {}
    export interface Author {
        role:     "assistant" | "system" | "user";
        name:     null;
        metadata: AuthorMetadata;
    }
    export interface Content {
        content_type: "text";
        parts:        string[];
    }
    export interface FinishDetails {
        type:         "interrupted" | "stop";
        stop_tokens?: number[];
    }
    export enum Status {
        FinishedSuccessfully = "finished_successfully",
        InProgress = "in_progress",
    }
}

/**
 * ChatGPT credentials.
 */
export interface GptAuth {
    token: string;
    cookie?: string | null;
    expires?: string | null;
}

export interface GptResponse {
    conversation_id: string,
    error: any | null,
    message: FullConversation.Message,
}