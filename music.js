const analysis = require("./analysis.json");

// console.log(analysis);

// analysis.beats.forEach(b => {
//   console.log(`start: ${b.start} duration: ${b.duration}`);
// });

let sum = 0;
let i = 0;

analysis.sections.forEach(s => {
  if (s.tempo_confidence > 0.5) {
    sum += s.tempo;
    i++;
  }
});

const bpm = sum / i;

console.log(`${bpm}bpm`);
