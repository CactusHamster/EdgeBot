import { from_unsafe_window } from "./tampermonkey_util";
export type Initialization = {
    Services:            { [key: string]: Service };
    StartActivity:       StartActivity;
    InitialLaunchData:   InitialLaunchData;
    InitialActivityData: InitialActivityData;
    Brand:               string;
}

export type InitialActivityData = {
    Hash:                 null;
    LessonName:           string;
    ActivityName:         string;
    ActivityStatus:       string;
    ActivityOrder:        string;
    CourseID:             null;
    AttemptID:            null;
    GlossaryID:           string;
    ToolsID:              string;
    NotesID:              string;
    TranscriptID:         string;
    LearningObjectKey:    string;
    LessonKey:            string;
    ResourceLinkID:       null;
    Progress:             number;
    PrevActivity:         Activity;
    NextActivity:         Activity;
    Warning:              null;
    ShowOverlay:          boolean;
    LookupLink:           null;
    UserID:               null;
    ContextID:            null;
    CEContextID:          null;
    Role:                 null;
    ConsumerKey:          null;
    NavigationLocked:     boolean;
    EssayType:            null;
    ObjectType:           string;
    IsRestrictedActivity: boolean;
}

export type Activity = {
    LessonName:    string;
    ActivityName:  string;
    ActivityOrder: string;
}

export type InitialLaunchData = {
    ResourceLinkID:           string;
    LearningObjectKey:        string;
    LessonKey:                string;
    NavigationURL:            string;
    ResultID:                 string;
    Role:                     string;
    UserID:                   string;
    UpdateGradeURL:           string;
    ContextID:                string;
    CEContextID:              string;
    FirstName:                string;
    LastName:                 string;
    CourseName:               string;
    LessonName:               string;
    ActivityName:             string;
    Email:                    string;
    ReturnURL:                string;
    SchoolName:               string;
    SchoolID:                 string;
    DistrictID:               string;
    DistrictName:             string;
    SelectedStudentChatType:  string;
    StudentEmail:             string;
    Subject:                  string;
    TranslateEnabled:         boolean;
    TranslateLocation:        string;
    ReadAloudEnabled:         boolean;
    SessionKey:               string;
    ContentVariableLookupURL: string;
    StudentOptions:           number;
    CourseID:                 string;
    ToolsService:             string;
    ConsumerKey:              string;
    IsSSLimited:              string;
    AllowPretestsAndQuizzes:  string;
    WYSIWYGEnabled:           boolean;
    IsT4L:                    boolean;
    UseLargePlayer:           boolean;
    EssayType:                string;
    touchEnabled:             boolean;
    SessionID:                string;
    LogoutURL:                string;
    InactivityTimeout:        number;
    InactivityCountdown:      number;
    SessionCallbackTimeout:   number;
    Impersonation:            boolean;
    ImpersonationURL:         string;
    LMSCourseID:              string;
    RequestTime:              number;
    IsRestrictedActivity:     boolean;
    HideENotes:               boolean;
    LMSAPIBasePath:           string;
    GoPeerToken:              string;
    GradeLevel:               string;
    ObjectType:               string;
}

export type Service = {
    Name:     string;
    Location: string;
}

export type StartActivity = {
    CourseId:  string;
    CurrentId: string;
}

export function get_initialization(): Initialization | null {
    let initialization = from_unsafe_window("initialization");
    if (initialization === null) return null;
    else return initialization;
}