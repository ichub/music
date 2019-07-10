import analysis from "./analysis.json";

interface Analysis {
  beats: Beat[];
  segments: Segment[];
}

interface Beat {
  start: number;
  end: number;
  confidence: number;
}

interface Segment {
  confidence: number;
  duration: number; // seconds
  loudness_max: number; // dB
  // The segment-relative offset of the segment peak loudness in seconds
  loudness_max_time: number;
  loudness_start: number; // dB
  // A “chroma” vector representing the pitch content of the segment, corresponding to the 12 pitch classes
  // C, C#, D to B, with values ranging from 0 to 1 that describe the relative dominance of every pitch in the chromatic scale.
  // https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-analysis/#pitch
  pitches: number[];
  // The starting point (in seconds) of the segment.
  start: number;
  // Timbre is the quality of a musical note or sound that distinguishes different types
  // of musical instruments, or voices. Timbre vectors are best used in comparison with each other
  // https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-analysis/#timbre
  timbre: number[];
}

const canvas: HTMLCanvasElement = document.querySelector("#the-canvas");
const ctx = canvas.getContext("2d");
const a = analysis as Analysis;

import createPlayer from "web-audio-player";

var audio = createPlayer("/song.mp3");

audio.on("load", () => {
  console.log("Audio loaded...");
  audio.play();
  audio.node.connect(audio.context.destination);
});

audio.on("ended", () => {
  console.log("Audio ended...");
});
