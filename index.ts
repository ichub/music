import analysis from "./analysis.json";

console.log(analysis);

const canvas: HTMLCanvasElement = document.querySelector("#the-canvas");
const ctx = canvas.getContext("2d");

import createPlayer from "web-audio-player";

var audio = createPlayer("/song.mp3");

audio.on("load", () => {
  console.log("Audio loaded...");

  // start playing audio file
  audio.play();

  // and connect your node somewhere, such as
  // the AudioContext output so the user can hear it!
  audio.node.connect(audio.context.destination);
});

audio.on("ended", () => {
  console.log("Audio ended...");
});
