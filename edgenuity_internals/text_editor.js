$(function () {

    var wysiwygEnabled = !!($("#WYSIWYGEnabled").val() == "True");

    if (!isComplete) {
        iFrameNotify.listen("exit", function (e) {
            if (!isComplete) {
                iFrameNotify.notify({ frame: window.parent, message: "setOptions", data: { overrideExitCallback: true } });
                $("#SaveAndExitButton").click();
            }
            else
                e.emitCallback = true;
        });
    }
    $("#SaveAndExitButton").click(function (event) {
        Actions.Log();
        iFrameNotify.notify({ frame: window.parent, message: "turnOffLeavePage", data: { overrideExitCallback: true } });
        return true;
    });
    if (wysiwygEnabled && typeof edgenuity != "undefined" && typeof edgenuity.wysiwyg != "undefined") {
        CKEDITOR.config.disableNativeSpellChecker = false;
        $("textarea").each(function () {
            edgenuity.wysiwyg.initializeToolbar(this.id, 'Short', true);
        });
    }

    if (wysiwygEnabled && typeof CKEDITOR != "undefined") {
        CKEDITOR.config.disableNativeSpellChecker = false;
        for (var i in CKEDITOR.instances) {
            var editor = CKEDITOR.instances[i];

            editor.on('key', function (event) {
                setTimeout(function () { CheckAnswersLength(); }, 0);
            });

            editor.on('instanceReady', function (event) {
                CheckAnswersLength();
            });
        }
    }
    else if (!wysiwygEnabled) {
        CheckAnswersLength();

        $('textarea').each(function () {
            $(this).bind('input propertychange', function () {
                setTimeout(function () { CheckAnswersLength(); }, 0);
            });
        });
    }

    function CheckAnswersLength() {
        var emptyTextAreas = 0;
        if (wysiwygEnabled) {
            for (var j in CKEDITOR.instances) {
                var data = $.trim(CKEDITOR.instances[j].getData().replace(/<p>/g, '<p>').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ''));
                if (data.length <= 0) {
                    emptyTextAreas++;
                }
            }
        }
        else {
            $("textarea[id$='AnswerText']").each(function (index, texteditor) {
                if ($(texteditor).val().length <= 0) {
                    emptyTextAreas++;
                }
            });
        }
        setButtons(emptyTextAreas == 0);
    }

    function setButtons(hasContent) {
        if (hasContent) {
            Actions.Log();
            $("#SubmitQuestionsButton").removeAttr("disabled").removeClass("disabled");
        }
        else {
            $('#SubmitQuestionsButton').attr("disabled", true).addClass("disabled");
        }
    }

    $(this).find('a.weblink').click(function () {
        Actions.Log();
    });
    //$(this).find('a[data-useproxy]').each(function () {
    //    this.target = "_blank";
    //    $(this).click(function () {
    //        var rank = this.getAttribute("rank");
    //        var location = this.href;
    //        var useProxy = this.getAttribute("data-useproxy");
    //        var proxyURL = this.getAttribute("data-proxyurl");
    //        var sOptions = 'width=800,height=600,scrollbars=yes,resizable=yes';
    //        var tOptions = this.getAttribute("data-tbopt");
    //        var student = this.getAttribute("data-student");

    //        if (useProxy === "True") {
    //            loadBrowser(location, proxyURL, sOptions, tOptions, student);
    //            return false;
    //        }
    //        else {
    //            window.open(location, "_blank", sOptions);
    //            return false;
    //        }

    //    });

    //});

    loadBrowser = function (address, proxyUrl, sOptions, tOptions, student) {
        try {
            student = student ? student : "";
            tOptions = tOptions ? tOptions : "";
            $.get(proxyUrl, { address: address, toolbar: tOptions, student: student  }, function (data) {
                if (data.address) {
                    window.open(data.address, "_blank", sOptions);
                }
            }).fail(function (data) {

            });
        }
        catch (ex) { alert("Unable to proxify link."); }
    }

});