import analysis from "./analysis.json";
import Color from "color";

interface TimeDuration {
  start: number; // seconds
  duration: number; // seconds
  confidence: number; // 0 - 1
}
interface Analysis {
  beats: Beat[];
  segments: Segment[];
  bars: Bar[];
}

interface Beat extends TimeDuration {
  start: number;
  end: number;
  confidence: number;
}

interface Bar extends TimeDuration {}

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

interface Context {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeStart: Date;
  currentTime: Date;
  msSinceStart: number;
  framesSinceStart: number;
  currentSegmentIndex: number;
  currentBeatIndex: number;
  currentBarIndex: number;

  currentBeat: Beat;
  currentBar: Bar;
  currentSegment;

  nextBeat: Beat;
  nextBar: Bar;
  nextSegment: Segment;

  segmentChanged: boolean;
  beatChanged: boolean;
  barChanged: boolean;

  msUntilNextSegment: number;
  msUntilNextBeat: number;
  msUntilNextBar: number;

  barCompletionPercentage: number;
  beatCompletionPercentage: number;
  segmentCompletionPercentage: number;
}

import createPlayer from "web-audio-player";

var audio = createPlayer("/song.mp3");

function updateContext(c: Context, analysis: Analysis) {
  c.currentTime = new Date();
  c.msSinceStart = c.currentTime.getTime() - c.timeStart.getTime();
  c.framesSinceStart++;

  c.barChanged = false;
  c.beatChanged = false;
  c.segmentChanged = false;

  if (
    c.msSinceStart / 1000 >
    analysis.beats[c.currentBeatIndex].start +
      analysis.beats[c.currentBeatIndex].duration
  ) {
    c.currentBeatIndex++;
    c.beatChanged = true;
  }

  if (
    c.msSinceStart / 1000 >
    analysis.bars[c.currentBarIndex].start +
      analysis.bars[c.currentBarIndex].duration
  ) {
    c.currentBarIndex++;
    c.barChanged = true;
  }

  if (
    c.msSinceStart / 1000 >
    analysis.segments[c.currentSegmentIndex].start +
      analysis.segments[c.currentSegmentIndex].duration
  ) {
    c.currentSegmentIndex++;
    c.segmentChanged = true;
  }

  const nextBeatIdx = Math.min(
    c.currentBeatIndex + 1,
    analysis.beats.length - 1
  );
  const nextSegmentIdx = Math.min(
    c.currentSegmentIndex + 1,
    analysis.segments.length - 1
  );

  const nextBarIdx = Math.min(c.currentBarIndex + 1, analysis.bars.length - 1);

  c.currentBeat = analysis.beats[c.currentBeatIndex];
  c.currentBar = analysis.bars[c.currentBarIndex];
  c.currentSegment = analysis.segments[c.currentSegmentIndex];

  c.nextBar = analysis.bars[nextBarIdx];
  c.nextBeat = analysis.beats[nextBeatIdx];
  c.nextSegment = analysis.segments[nextSegmentIdx];

  c.msUntilNextSegment = c.nextSegment.start * 1000 - c.msSinceStart;
  c.msUntilNextBar = c.nextBar.start * 1000 - c.msSinceStart;
  c.msUntilNextBeat = c.nextBeat.start * 1000 - c.msSinceStart;

  c.barCompletionPercentage = c.msUntilNextBar / (c.currentBar.duration * 1000);
  c.beatCompletionPercentage =
    c.msUntilNextBeat / (c.currentBeat.duration * 1000);
  c.segmentCompletionPercentage =
    c.msUntilNextSegment / (c.currentSegment.duration * 1000);
}

const canvas: HTMLCanvasElement = document.querySelector("#the-canvas");
const ctx = canvas.getContext("2d");

audio.on("load", () => {
  audio.node.connect(audio.context.destination);
  audio.play();

  const context = {
    timeStart: new Date(),
    currentTime: new Date(),
    msSinceStart: 0,
    framesSinceStart: 0,
    segmentChanged: false,
    beatChanged: false,
    barChanged: false,
    currentSegmentIndex: 0,
    currentBeatIndex: 0,
    currentBarIndex: 0,
    width: 800,
    height: 600,
    ctx: ctx,
    msUntilNextSegment: 0,
    msUntilNextBeat: 0,
    msUntilNextBar: 0,
    currentBeat: null,
    currentBar: null,
    currentSegment: null,
    nextBeat: null,
    nextBar: null,
    nextSegment: null,
    barCompletionPercentage: 0,
    beatCompletionPercentage: 0,
    segmentCompletionPercentage: 0
  };

  updateContext(context, analysis);

  context.beatChanged = true;
  context.barChanged = true;
  context.segmentChanged = true;

  onResize(context);

  window.addEventListener("resize", () => onResize(context));

  setInterval(() => {
    requestAnimationFrame(() => {
      frame(context, analysis);
      updateContext(context, analysis);
    });
  }, 1000 / 100);
});

function onResize(c: Context) {
  c.width = window.innerWidth;
  c.height = window.innerHeight;

  canvas.width = c.width;
  canvas.height = c.height;
  canvas.style.width = c.width + "px";
  canvas.style.height = c.height + "px";
}

audio.on("ended", () => {
  console.log("Audio ended...");
});

function clear(c: Context) {
  c.ctx.clearRect(0, 0, c.width, c.height);
}

function fillWithColor(c: Context, color: string) {
  c.ctx.fillStyle = color;
  c.ctx.fillRect(0, 0, c.width, c.height);
}

function randomColor() {
  const r = Math.min(255, Math.max(0, Math.random() * 200));
  const g = Math.min(255, Math.max(0, Math.random() * 200));
  const b = Math.min(255, Math.max(0, Math.random() * 200));

  return Color.rgb(r, g, b);
}

let baseColor = randomColor();
let pixelSize = 30;

function frame(c: Context, analysis: Analysis) {
  if (c.barChanged) {
    baseColor = randomColor();
  }

  renderPixels(c);

  console.log("frame");
}

function renderPixels(c: Context) {
  for (let x = 0; x < c.width / pixelSize; x++) {
    for (let y = 0; y < c.height / pixelSize; y++) {
      c.ctx.fillStyle = pixelColor(x, y, c).toString();
      c.ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
}

function pixelColor(x: number, y: number, c: Context) {
  return Color.rgb(
    pixelComponent(x, y, c),
    pixelComponent(x, y, c),
    pixelComponent(x, y, c)
  );
}

function pixelComponent(x: number, y: number, c: Context) {
  return (
    Math.sin(x * y * c.framesSinceStart) * c.beatCompletionPercentage * 255
  );
}
