class Validation {
  constructor() {
    // 初期設定 minAmpUpper = 0.03, maxAmpUpper = 0.80, minSN = 10
    this.minAmpUpper = 0.30;
    // this.maxAmpUpper = 0.80;
    this.maxAmpUpper = 0.99;
    this.noiseUpper = 10;

    this.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.blob = null;
    this.audioContext = null;
    this.stream = null;
    this.recorder = null;
  }

  setThreshold(minAmpUpper = 0.30, maxAmpUpper = 0.99, noiseUpper = 100) {
    this.minAmpUpper = minAmpUpper;
    this.maxAmpUpper = maxAmpUpper;
    this.noiseUpper = noiseUpper;
  }

  startRecording() {
    navigator.mediaDevices.getUserMedia({
        audio: true
      })
      .then((stream) => {
        this.audioContext = new this.AudioContext();
        this.audioContext.samplerate = 48000;
        // this.audioContext = new AudioContext();
        this.stream = stream;
        const input = this.audioContext.createMediaStreamSource(stream);
        this.recorder = new Recorder(input, {
          numChannels: 1
        });
        this.recorder.record();
      })
      .catch(err => console.log(err));
  }

  stopRecording() {
    return new Promise((resolve, reject) => {
      this.recorder.stop();
      this.stream.getAudioTracks()[0].stop();
      this.recorder.exportWAV((blob) => {
        this.blob = blob;
        resolve();
      });
    });
  }

  getBlob() {
    return new Promise((resolve, reject) => {
      if (this.blob) resolve(this.blob);
      else reject();
    });
  }

  blob2audioBuffer(blob) {
    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
      fileReader.onloadend = () => {
        const arrayBuffer = fileReader.result;
        this.audioContext.decodeAudioData(arrayBuffer).then(resolve);
      };
      fileReader.readAsArrayBuffer(blob);
    });
  }

  validate() {
    return new Promise((resolve, reject) => {
      this.blob2audioBuffer(this.blob)
        .then((audioBuffer) => {
          const amp = audioBuffer.getChannelData(0);
          const sampleRate = audioBuffer.sampleRate;
          const n_sec = 0.2;
          const offset = 0.2;
          const s_sec = audioBuffer.duration;

          const amp2pow = y => y.map(x => x * x / sampleRate).reduce((p, c) => p + c);

          // const s = amp2pow(amp) / s_sec;
         const noiseMeansquare = amp2pow(amp.slice(sampleRate*offset, sampleRate * (offset + n_sec)));
          const noise_level = Math.floor(Math.log10(noiseMeansquare)) + 10;
          // console.log(noiseMeansquare);
          // console.log(noise_level);
          // const sn = 10 * Math.log10(s / n);

          const ampAbs = amp.map(x => Math.abs(x));
          const ampUpper = Math.floor(ampAbs.reduce((a, b) => (a > b ? a : b)) * 100);

          const minAmpUpper = this.minAmpUpper * 100;
          const noiseUpper = this.noiseUpper;
          resolve({
            ampUpper,
            noise_level,
            minAmpUpper,
            noiseUpper
          });
        });
    });
  }
}
