
var inited = false;
var NextActivityName = "";
let playButtonFocusTimeout;

document.addEventListener("keydown", onTabShowVideoControls);
function onTabShowVideoControls(e) {
    if (e.key === 'Tab') {
        const videoPlayerIframe = document.getElementById('stageFrame');
        if (!videoPlayerIframe) {
            return;
        }
        const videoPlayerControls = videoPlayerIframe.contentWindow.document.getElementsByClassName('vcplayer');
        if (videoPlayerControls && videoPlayerControls[0] && videoPlayerControls[0].style) {
            videoPlayerControls[0].style.visibility = "visible";
        }
    }
}

function initToolBar(){
    var options = { scripts: [] };
    inited = true;
        
            options.highlight= {
                uniqueID: "6f02115c-6a62-6365-7473-000000000000_246579681",
                persistLocation: "//r23.core.learn.edgenuity.com/contentengineapi/rest/Highlighter",
                stylesheet: "https://learn.education2020.com/cdn/highlights/1.0/cache/minify.css"},
            options.scripts.push("https://learn.education2020.com/cdn/highlights/1.0/cache/minify.js");
        

    if (initialization.InitialLaunchData.ReadAloudEnabled){
        options.scripts.push("//configuration.speechstream.net/edgenuity/courseware/v216/config.js");
    }

    Namespace.global().playerView.toolbar().initialize(options,
        function()
        {
            if (initialization.InitialLaunchData.ReadAloudEnabled){
                //Add a global callback so that we can reset the audioPlaying flg to false once speech is complete
                eba_speech_complete_callback = "setTimeout(function(){if(!$rw_isSpeaking())Namespace.global().playerView.toolbar().audioPlaying(false);},1000);";

                // TB-334: Update Speechstream code from 191 to 208
                // Pass the following variables in TexthelpSpeechStream.addToolbar(bookId, pageId, studentId)
                TexthelpSpeechStream.addToolbar(
                    getBookId(),
                    "6f02115c-6a62-6365-7473-000000000000",
                    null //we don't use annotations so pass in null here
                );

                // SpeechStreamAssistor.setBookId("");
                // SpeechStreamAssistor.setPageId("6f02115c-6a62-6365-7473-000000000000");

                $(window).on("load", function () {
                    SpeechStream.cacheMode.setCacheMode(SpeechStream.cacheMode.CACHE_WITH_LIVE_SERVER);
                });
            }

            playButtonFocusTimeout = setInterval(playButtonFocus, 500);
        });
}
    var delayLoadToolbar = function () {
        if (Namespace.compiled)
            initToolBar();
        else {
            setTimeout(delayLoadToolbar, 100);
        }
    }

function playButtonFocus() {
    const videoPlayerIframe = document.getElementById('stageFrame');
    if (!videoPlayerIframe) {
        return;
    }

    const videoPlayerControls = videoPlayerIframe.contentWindow.document.getElementsByClassName('vcplayer');
    if (videoPlayerControls && videoPlayerControls[0] && videoPlayerControls[0].style) {
        videoPlayerControls[0].style.visibility = "visible";
    }

    const videoPlayerPlayButton = videoPlayerIframe.contentWindow.document.getElementById('uid1_play');
    if (videoPlayerPlayButton) {
        videoPlayerPlayButton.focus();

        if (videoPlayerPlayButton.addEventListener) {
            videoPlayerPlayButton.addEventListener("keyup", (e) => frameKeyUp(e, videoPlayerPlayButton), true);
            videoPlayerPlayButton.addEventListener("focusin", (e) => frameFocusIn(e, videoPlayerPlayButton), true);
            videoPlayerPlayButton.addEventListener("focusout", (e) => frameFocusOut(e, videoPlayerPlayButton), true);
        }

        clearTimeout(playButtonFocusTimeout);
    }

}

function frameKeyUp(e, videoPlayerPlayButton) {
    if (e.key && (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'p')) {
        videoPlayerPlayButton.click();
        videoPlayerPlayButton.focus();
    }
}

function frameFocusIn(e, videoPlayerPlayButton) {
    videoPlayerPlayButton.style.border = 'white';
    videoPlayerPlayButton.style.borderStyle = 'solid';
}

function frameFocusOut(e, videoPlayerPlayButton) {
    videoPlayerPlayButton.style.border = '';
    videoPlayerPlayButton.style.borderStyle = '';
}

var setNextActivityName = function () {
    if (Namespace.compiled) {
        Namespace.global().playerView.getNextActivity(true); //sets the name of the next activity, used if next is a quiz
        setTimeout(setNext, 500);
    }
    else {
        setTimeout(setNextActivityName, 100);
    }
}

function setNext() {
    this.NextActivityName = Namespace.global().playerView.NextActivityName;
}

iFN.listen("ChildFrameLoaded", function (d) {
    console.log("TextHelp_iFrameLoaded done.now loading texthelp scripts");
    if(typeof $rw_parseNewSection == "undefined"){
        if (!inited) {
            delayLoadToolbar();
            setNextActivityName();
        }
    }
    else{
        $rw_parseNewSection(document.body);
    }
});

iFN.listen("ActivitySubmitted", function (data) {
    var pagesToGetBack = -2;
    history.go(pagesToGetBack);
    setTimeout(() => {
        window.location.reload();
    }, 100)
});

$(function(){
    Namespace.global().playerView.lessonPaneView().glossaryView().glossary().searchURL = "//edgenuityservices.speechstream.net/rwserver/?query=dictionaryHtml&locale=US&userName=e2020&swf=162&custID=1890";

    Namespace.global().playerView.nextReloadURL = "/Player/Home/Next";
    Namespace.global().playerView.prevReloadURL = "/Player/Home/Prev";
});

function getBookId() {
    return "" ? "" : "null";
}
