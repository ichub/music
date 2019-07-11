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
  currentSegment: Segment;

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
import { palegoldenrod } from "color-name";

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

  window.addEventListener("click", () => {
    toggle();
  });

  let interval = null;

  function toggle() {
    if (interval !== null) {
      pause();
    } else {
      start();
    }
  }
  function start() {
    audio.play();
    interval = setInterval(() => {
      requestAnimationFrame(() => {
        frame(context, analysis);
        updateContext(context, analysis);
      });
    }, 1000 / 100);
  }

  function pause() {
    clearInterval(interval);
    audio.pause();
    interval = null;
  }

  start();
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

function clamp(val: number) {
  return (256 + (Math.floor(val) % 256)) % 256;
}

function clr(r: number, g: number, b: number): Color {
  return Color.rgb(clamp(r), clamp(g), clamp(b));
}

function renderTimbre(c: Context) {
  const t = c.currentSegment.timbre;

  const w = 10;
  const space = 10;

  ctx.fillStyle = "black";

  for (let i = 0; i < t.length; i++) {
    ctx.fillRect(100 + (w + space) * i, 200, w, t[i] * -1);
  }
}

function rednerPitch(c: Context) {
  const t = c.currentSegment.pitches;

  const w = 10;
  const space = 10;

  ctx.fillStyle = "green";
  for (let i = 0; i < t.length; i++) {
    ctx.fillRect(500 + (w + space) * i, 200, w, t[i] * -1 * 50);
  }
}

function renderCirlce(x: number, y: number, radius: number, randomNess = 0) {
  const pointCount = 50;

  ctx.beginPath();

  let r = () => Math.random() * randomNess - randomNess / 2;

  for (let i = 0; i < pointCount + 1; i++) {
    let cx = x + Math.cos(((Math.PI * 2) / pointCount) * i) * (radius + r());
    let cy = y + Math.sin(((Math.PI * 2) / pointCount) * i) * (radius + r());

    if (i === 0) {
      ctx.moveTo(cx, cy);
    } else {
      ctx.lineTo(cx, cy);
    }
  }

  ctx.fill();
}
function frame(c: Context, analysis: Analysis) {
  let size = Math.abs((c.barCompletionPercentage * 255) / 2);
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  console.log();

  let brightness = c.currentSegment.timbre[1];
  let beatness = c.currentSegment.timbre[3];
  let loudness = c.currentSegment.timbre[0];

  ctx.fillStyle = clr(
    c.currentSegment.timbre[0],
    c.currentSegment.timbre[1],
    c.currentSegment.timbre[2]
  ).toString();

  clear(c);
  renderCirlce(x, y, beatness, brightness / 10);
  renderTimbre(c);
  rednerPitch(c);
}
