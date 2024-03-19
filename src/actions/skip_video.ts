/*function get_activity_iframe (window: Window) {
    const IFRAME_ID = "iFramePreview";
    let iframe = window.document.getElementById(IFRAME_ID);
    if (iframe === null) {
        console.warn("Failed to find activity iframe by ID. Using the first iframe found instead.");
        iframe = window.document.getElementsByTagName("iframe")[0];
    }
    if (iframe === null || iframe === undefined) return null;
    else return iframe;
}*/

import { AppContext } from "../app";
import { IframeAgent } from "../external/iframe/iframe_agent";

function find_video_iframe (win: Window | null): HTMLIFrameElement | null {
    if (win === null) win = window;
    const IFRAME_ID = "stageFrame";
    const iframe = win.document.getElementById(IFRAME_ID);
    if (!(iframe instanceof HTMLIFrameElement)) return null;
    else return iframe;
}
function get_video_controls (video_iframe: HTMLIFrameElement): HTMLCollection | null {
    const controls = video_iframe.contentWindow?.document.getElementsByClassName("vcplayer");
    if (controls === null) return null;
    if (!(controls instanceof HTMLCollection)) return null;
    return controls;
}
function make_video_controls_visible (controls: HTMLCollection) {
    let index0 = controls[0];
    if (!(index0 instanceof HTMLElement)) throw new Error("Failed to find controls element.");
    index0.style.visibility = "visible";
}
function play_video (video_iframe: HTMLIFrameElement | null): void {
    if (video_iframe === null) {
        video_iframe = find_video_iframe(null);
        if (video_iframe === null) throw new Error("Failed to find video iframe.");
    }
    const controls = get_video_controls(video_iframe);
    if (controls === null) throw new Error("Failed to find video controls.");
    const play_button = video_iframe.contentWindow?.document.getElementById("uid1_play");
    if (!(play_button instanceof HTMLElement)) throw new Error("Failed to find play button.");
    play_button.focus();
    play_button.click();
}

function skip_to_end_of_video () {

}
function skip_video (iframe_agent: IframeAgent) {
    iframe_agent.evaluate(`
        console.log(API.FrameChain.framesStatus[API.FrameChain.currentFrame - 1]) // isComplete()
        console.log(API)
        API.Video.throwEvent("ended")
        // videoComplete()
        // API.Frame.isComplete = () => true
        null;
    `)
    //@TODO: figure out how to just... emulate what's done when the video is finished
    //       and then just do that instead of manually seeking
    /*
    video.videoDone()

    video.wrapper.addEventListener('Complete', function () {
        $("#" + FrameVideoControls.elementIDs.progressLimit).hide();

        video.videoDone();
    });

    video.wrapper.addEventListener("seeking", function () {
        if (!API.E2020.reviewMode && !API.Frame.isComplete()) {
            if (video.video.currentTime > video.maxTimeViewed) {
                video.video.currentTime = video.maxTimeViewed;  //updates the video element
                video.setCurrentTime(video.maxTimeViewed);      //updates the video wrapper
            }                                                   //Both need to be updated in the case where built-in
        }                                                       //browser controls directly alter the video element 
    });
    */
}
function skip_all_videos () {
    
}
export function attach_video_skipper_to_app (app: HTMLElement, { activity_iframe_agent }: AppContext) {
    const btn = app.querySelector("#skip-video-button") as HTMLElement;
    if (!activity_iframe_agent) throw new Error("No iframe agent provided.");
    btn.onclick = (event) => skip_video(activity_iframe_agent);
}