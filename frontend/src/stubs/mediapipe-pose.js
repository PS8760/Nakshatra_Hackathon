// Stub for @mediapipe/pose — BlazePose tfjs runtime doesn't need the mediapipe backend
// but the module is imported. Provide minimal exports to prevent errors.
class Pose {
  constructor() {}
  setOptions() {}
  onResults() {}
  send() { return Promise.resolve(); }
  close() {}
}
module.exports = { Pose };
module.exports.default = { Pose };
