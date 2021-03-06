/* eslint-env jquery, browser */
$(document).ready(() => {
    // console.log(document.getElementById('postAudioRecord'));
    const validation = new Validation();

    let wavesurfer = null;
    // let recorder;
    document.addEventListener('keyup', function(event) {
    // document.addEventListener('keydown', function(event) {
        if (event.code == 'KeyR') {
            if (!validation.recorder || !validation.recorder.recording) {
                $('#recordBtn').removeClass('btn-primary').addClass('btn-secondary');
                $('#stopBtn').removeClass('btn-secondary').addClass('btn-primary');

                if (wavesurfer !== null) {
                    wavesurfer.destroy();
                }
                wavesurfer = WaveSurfer.create({
                    container: '#waveform',
                    waveColor: 'black',
                    interact: false,
                    cursorWidth: 0,
                    plugins: [
                        WaveSurfer.microphone.create()
                    ]
                });
                wavesurfer.microphone.start();
                validation.startRecording();
            }
        }
    });
    document.addEventListener('keydown', function(event) {
        if (event.code == 'Space') {
            console.log("SPACE");
            if ($('#playBtn').hasClass('btn-primary')) {
                $('#playBtn').removeClass('btn-primary').addClass('btn-danger');
                $('#playBtn span').removeClass('fa-play-circle').addClass('fa-stop-circle');
                wavesurfer.play();
            } else {
                $('#playBtn').removeClass('btn-danger').addClass('btn-primary');
                $('#playBtn span').removeClass('fa-stop-circle').addClass('fa-play-circle');
                wavesurfer.pause();
            }
        }
        else if (event.code == 'KeyF') {
            if ($('#forwardBtn').hasClass('btn-primary')) {
                const destination = $('#forwardBtn').data('dest');
                let currentUrl = window.location.href;
                currentUrl = currentUrl.slice(0, currentUrl.lastIndexOf('/'));
                window.location.href = `${currentUrl}/${destination}`;
            }
        }
        else if (event.code == 'KeyB') {
            if ($('#backwardBtn').hasClass('btn-primary')) {
                const destination = $('#backwardBtn').data('dest');
                let currentUrl = window.location.href;
                currentUrl = currentUrl.slice(0, currentUrl.lastIndexOf('/'));
                window.location.href = `${currentUrl}/${destination}`;
            }
        }
        else if (event.code == 'KeyS') {
        if (validation.recorder.recording) {
            $('#recordBtn').removeClass('btn-secondary').addClass('btn-primary');
            $('#stopBtn').removeClass('btn-primary').addClass('btn-secondary');

            $('#audioIsValid').val('true');
            wavesurfer.microphone.stopDevice();
            //?????????validation?????????????????????????????????#alertbox????????????
            //i18n???javascript?????????????????????????????????????????????
            //language??????????????????????????????????????????????????????????????????
            validation.stopRecording()
                .then(() => validation.validate())
                .then((response) => {
                    $('#alertbox').empty();
                    if ($('html').attr('lang') === 'ja') {
                        if (response.ampUpper < response.minAmpUpper) {
                            $('#audioIsValid').val('false');
                            $('#alertbox').prepend(`<div class="alert alert-danger fade show">??????????????????${response.ampUpper}%???${response.minAmpUpper}%????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????</div>`);
                        } else {
                            $('#alertbox').prepend(`<div class="alert alert-success fade show">??????????????????${response.ampUpper}%???${response.minAmpUpper}%?????????????????????????????????????????????????????????????????????</div>`);
                        }
                        if (response.noiseUpper < response.noise_level) {
                            $('#audioIsValid').val('false');
                            $('#alertbox').prepend(`<div class="alert alert-danger fade show">??????????????????${response.noise_level}???${response.noiseUpper}???????????????????????????????????????????????????????????????????????????????????????????????????</div>`);
                        } else {
                            $('#alertbox').prepend(`<div class="alert alert-success fade show">??????????????????${response.noise_level}???${response.noiseUpper}??????????????????????????????????????????????????????</div>`);
                        }
                    } else if ($('html').attr('lang') === 'en') {
                        if (response.ampUpper < response.minAmpUpper) {
                            $('#audioIsValid').val('false');
                            $('#alertbox').prepend(`<div class="alert alert-danger fade show">The input volume: ${response.ampUpper}%???The input volume must be greater than ${response.minAmpUpper}%???The volume is too loud. Decrease the microphone gain or raise your voice.</div>`);
                        } else {
                            $('#alertbox').prepend(`<div class="alert alert-success fade show">The input volume: ${response.ampUpper}%???The input volume must be greater than ${response.minAmpUpper}%???The input volume is proper.</div>`);
                        }
                        if (response.noiseUpper < response.noise_level) {
                            $('#audioIsValid').val('false');
                            $('#alertbox').prepend(`<div class="alert alert-danger fade show">The noise level: ${response.noise_level} (The noise level must be less than ${response.noiseUpper}) There is too much noise.Record in the silent environment.</div>`);
                        } else {
                            $('#alertbox').prepend(`<div class="alert alert-success fade show">The noise level: ${response.noise_level} (The noise level must be less than ${response.noiseUpper}) The noise level is proper.</div>`);
                        }
                    }
                })
                .finally(() => {
                    // ??????????????????????????????????????????????????????
                    // 'name' field in fd.append must be 'audiofile' because of multer preference.
                    // @see app.js


                    //audiopath?????????
                    const url = URL.createObjectURL(validation.blob);
                    $('#audioURL').html(`<a href=${url} download='audio.wav'>Download audio</a>`);

                    //?????????URL????????????POST?????????AUDIO??????????????????????????????????????????????????????
                    const fd = new FormData(document.getElementById('postAudioRecord'));
                    fd.append('audiofile', validation.blob);
                    let currentUrl = window.location.href;
                    currentUrl = currentUrl.slice(0, currentUrl.lastIndexOf('/'));
                    fetch(currentUrl, {
                        method: 'POST',
                        body: fd
                    }).then((response) => {
                        // ??????wavesurfer??????????????????????????????????????????????????????????????????
                        // ??????????????????wavesurfer??????????????????
                        if (wavesurfer !== null) {
                            wavesurfer.destroy();
                        }
                        wavesurfer = WaveSurfer.create({
                            container: document.querySelector('#waveform'),
                            responsive: true,
                            normalize: true,
                            progressColor: '#007bff',
                            cursorColor: '#e83e8c'
                        });
                        wavesurfer.on('error', (e) => {
                            console.warn(e);
                        });
                        //wavesurfer??????????????????????????????
                        response.json().then((data) => {
                            let {
                                audiopath
                            } = data;
                            audiopath = audiopath.slice(audiopath.indexOf('/webrec/uploads'));
                            const second = Date.now();
                            audiopath = `${audiopath}?${second}`;
                            wavesurfer.load(audiopath);
                        });

                        // ????????????????????????????????????????????????????????????????????????????????????
                        $('#playBtn').off();
                        $('#playBtn').on('click', () => {
                            if ($('#playBtn').hasClass('btn-primary')) {
                                $('#playBtn').removeClass('btn-primary').addClass('btn-danger');
                                $('#playBtn span').removeClass('fa-play-circle').addClass('fa-stop-circle');
                                wavesurfer.play();
                            } else {
                                $('#playBtn').removeClass('btn-danger').addClass('btn-primary');
                                $('#playBtn span').removeClass('fa-stop-circle').addClass('fa-play-circle');
                                wavesurfer.pause();
                            }
                        });

                        wavesurfer.on('finish', () => {
                            $('#playBtn').removeClass('btn-danger').addClass('btn-primary');
                            $('#playBtn span').removeClass('fa-stop-circle').addClass('fa-play-circle');
                        });

                        // ???????????????????????????????????????
                        if ($('#audioIsValid').val() === 'true' && $('#audioWasRecorded').val() === 'false') {
                            // ??????????????????????????????
                            $('#forwardBtn').removeClass('btn-secondary');
                            $('#forwardBtn').addClass('btn-primary');
                            // ???????????????????????????
                            const xnext = $('.progress-bar').data('xnext');
                            $('.progress-bar').attr('style', `width:${xnext}%`);
                            $('.progress-bar').attr('aria-valuenow', xnext);

                            // ????????????????????????????????????
                            let num_of_record = $('#progress-ratio').data('num_of_record');
                            const num_of_manuscripts = $('#progress-ratio').data('num_of_manuscripts');
                            num_of_record += 1;
                            $('#progress-ratio').text(`${num_of_record} / ${num_of_manuscripts}`);
                        }
                    });
                });
            }
        }
    });

    //// ????????????
    $('#recordBtn').on('mouseup', () => {
        if (!validation.recorder || !validation.recorder.recording) {
            $('#recordBtn').removeClass('btn-primary').addClass('btn-secondary');
            $('#stopBtn').removeClass('btn-secondary').addClass('btn-primary');

            if (wavesurfer !== null) {
                wavesurfer.destroy();
            }
            wavesurfer = WaveSurfer.create({
                container: '#waveform',
                waveColor: 'black',
                interact: false,
                cursorWidth: 0,
                plugins: [
                    WaveSurfer.microphone.create()
                ]
            });
            wavesurfer.microphone.start();
            validation.startRecording();
        }
    });

    ////????????????
    $('#stopBtn').on('mousedown', () => {
        if (validation.recorder.recording) {
            $('#recordBtn').removeClass('btn-secondary').addClass('btn-primary');
            $('#stopBtn').removeClass('btn-primary').addClass('btn-secondary');

            $('#audioIsValid').val('true');
            wavesurfer.microphone.stopDevice();
            //?????????validation?????????????????????????????????#alertbox????????????
            //i18n???javascript?????????????????????????????????????????????
            //language??????????????????????????????????????????????????????????????????
            validation.stopRecording()
                .then(() => validation.validate())
                .then((response) => {
                    $('#alertbox').empty();
                    if ($('html').attr('lang') === 'ja') {
                        if (response.ampUpper < response.minAmpUpper) {
                            $('#audioIsValid').val('false');
                            $('#alertbox').prepend(`<div class="alert alert-danger fade show">??????????????????${response.ampUpper}%???${response.minAmpUpper}%????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????</div>`);
                        } else {
                            $('#alertbox').prepend(`<div class="alert alert-success fade show">??????????????????${response.ampUpper}%???${response.minAmpUpper}%?????????????????????????????????????????????????????????????????????</div>`);
                        }
                        if (response.noiseUpper < response.noise_level) {
                            $('#audioIsValid').val('false');
                            $('#alertbox').prepend(`<div class="alert alert-danger fade show">??????????????????${response.noise_level}???${response.noiseUpper}???????????????????????????????????????????????????????????????????????????????????????????????????</div>`);
                        } else {
                            $('#alertbox').prepend(`<div class="alert alert-success fade show">??????????????????${response.noise_level}???${response.noiseUpper}??????????????????????????????????????????????????????</div>`);
                        }
                    } else if ($('html').attr('lang') === 'en') {
                        if (response.ampUpper < response.minAmpUpper) {
                            $('#audioIsValid').val('false');
                            $('#alertbox').prepend(`<div class="alert alert-danger fade show">The input volume: ${response.ampUpper}%???The input volume must be greater than ${response.minAmpUpper}%???The volume is too loud. Decrease the microphone gain or raise your voice.</div>`);
                        } else {
                            $('#alertbox').prepend(`<div class="alert alert-success fade show">The input volume: ${response.ampUpper}%???The input volume must be greater than ${response.minAmpUpper}%???The input volume is proper.</div>`);
                        }
                        if (response.noiseUpper < response.noise_level) {
                            $('#audioIsValid').val('false');
                            $('#alertbox').prepend(`<div class="alert alert-danger fade show">The noise level: ${response.noise_level} (The noise level must be less than ${response.noiseUpper}) There is too much noise.Record in the silent environment.</div>`);
                        } else {
                            $('#alertbox').prepend(`<div class="alert alert-success fade show">The noise level: ${response.noise_level} (The noise level must be less than ${response.noiseUpper}) The noise level is proper.</div>`);
                        }
                    }
                })
                .finally(() => {
                    // ??????????????????????????????????????????????????????
                    // 'name' field in fd.append must be 'audiofile' because of multer preference.
                    // @see app.js


                    //audiopath?????????
                    const url = URL.createObjectURL(validation.blob);
                    $('#audioURL').html(`<a href=${url} download='audio.wav'>Download audio</a>`);

                    //?????????URL????????????POST?????????AUDIO??????????????????????????????????????????????????????
                    const fd = new FormData(document.getElementById('postAudioRecord'));
                    fd.append('audiofile', validation.blob);
                    let currentUrl = window.location.href;
                    currentUrl = currentUrl.slice(0, currentUrl.lastIndexOf('/'));
                    fetch(currentUrl, {
                        method: 'POST',
                        body: fd
                    }).then((response) => {
                        // ??????wavesurfer??????????????????????????????????????????????????????????????????
                        // ??????????????????wavesurfer??????????????????
                        if (wavesurfer !== null) {
                            wavesurfer.destroy();
                        }
                        wavesurfer = WaveSurfer.create({
                            container: document.querySelector('#waveform'),
                            responsive: true,
                            normalize: true,
                            progressColor: '#007bff',
                            cursorColor: '#e83e8c'
                        });
                        wavesurfer.on('error', (e) => {
                            console.warn(e);
                        });
                        //wavesurfer??????????????????????????????
                        response.json().then((data) => {
                            let {
                                audiopath
                            } = data;
                            audiopath = audiopath.slice(audiopath.indexOf('/webrec/uploads'));
                            const second = Date.now();
                            audiopath = `${audiopath}?${second}`;
                            wavesurfer.load(audiopath);
                        });

                        // ????????????????????????????????????????????????????????????????????????????????????
                        $('#playBtn').off();
                        $('#playBtn').on('click', () => {
                            if ($('#playBtn').hasClass('btn-primary')) {
                                $('#playBtn').removeClass('btn-primary').addClass('btn-danger');
                                $('#playBtn span').removeClass('fa-play-circle').addClass('fa-stop-circle');
                                wavesurfer.play();
                            } else {
                                $('#playBtn').removeClass('btn-danger').addClass('btn-primary');
                                $('#playBtn span').removeClass('fa-stop-circle').addClass('fa-play-circle');
                                wavesurfer.pause();
                            }
                        });

                        wavesurfer.on('finish', () => {
                            $('#playBtn').removeClass('btn-danger').addClass('btn-primary');
                            $('#playBtn span').removeClass('fa-stop-circle').addClass('fa-play-circle');
                        });

                        // ???????????????????????????????????????
                        if ($('#audioIsValid').val() === 'true' && $('#audioWasRecorded').val() === 'false') {
                            // ??????????????????????????????
                            $('#forwardBtn').removeClass('btn-secondary');
                            $('#forwardBtn').addClass('btn-primary');
                            // ???????????????????????????
                            const xnext = $('.progress-bar').data('xnext');
                            $('.progress-bar').attr('style', `width:${xnext}%`);
                            $('.progress-bar').attr('aria-valuenow', xnext);

                            // ????????????????????????????????????
                            let num_of_record = $('#progress-ratio').data('num_of_record');
                            const num_of_manuscripts = $('#progress-ratio').data('num_of_manuscripts');
                            num_of_record += 1;
                            $('#progress-ratio').text(`${num_of_record} / ${num_of_manuscripts}`);
                        }
                    });
                });
        }
    });

    $('#backwardBtn').on('click', (e) => {
        e.preventDefault();
        if ($(e.currentTarget).hasClass('btn-primary')) {
            const destination = $(e.currentTarget).data('dest');
            let currentUrl = window.location.href;
            currentUrl = currentUrl.slice(0, currentUrl.lastIndexOf('/'));
            window.location.href = `${currentUrl}/${destination}`;
        }
    });
    $('#forwardBtn').on('click', (e) => {
        e.preventDefault();
        if ($(e.currentTarget).hasClass('btn-primary')) {
            const destination = $(e.currentTarget).data('dest');
            let currentUrl = window.location.href;
            currentUrl = currentUrl.slice(0, currentUrl.lastIndexOf('/'));
            window.location.href = `${currentUrl}/${destination}`;
        }
    });

    if ($('#audiopath').val() !== '') {
        $('#audioWasRecorded').val('true');
        wavesurfer = WaveSurfer.create({
            container: document.querySelector('#waveform'),
            responsive: true,
            normalize: true,
            progressColor: '#007bff',
            cursorColor: '#e83e8c'
        });
        wavesurfer.on('error', (e) => {
            console.warn(e);
        });
        let audiopath = $('#audiopath').val();
        audiopath = audiopath.slice(audiopath.indexOf('/webrec/uploads'));
        wavesurfer.load(audiopath);
        $('#playBtn').on('click', () => {
            if ($('#playBtn').hasClass('btn-primary')) {
                $('#playBtn').removeClass('btn-primary').addClass('btn-danger');
                $('#playBtn span').removeClass('fa-play-circle').addClass('fa-stop-circle');
                wavesurfer.play();
            } else {
                $('#playBtn').removeClass('btn-danger').addClass('btn-primary');
                $('#playBtn span').removeClass('fa-stop-circle').addClass('fa-play-circle');
                wavesurfer.pause();
            }
        });
        wavesurfer.on('finish', () => {
            $('#playBtn').removeClass('btn-danger').addClass('btn-primary');
            $('#playBtn span').removeClass('fa-stop-circle').addClass('fa-play-circle');
        });
    } else {
        wavesurfer = WaveSurfer.create({
            container: document.querySelector('#waveform'),
            responsive: true,
            normalize: true,
            progressColor: '#007bff',
            cursorColor: '#e83e8c'
        });
        wavesurfer.on('error', (e) => {
            console.warn(e);
        });
        const audiopath = '/webrec/uploads/silent.wav';
        wavesurfer.load(audiopath);
        $('#playBtn').removeClass('btn-primary').addClass('btn-secondary');
    }
});
