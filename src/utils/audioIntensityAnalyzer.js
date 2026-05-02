export default class AudioIntensityAnalyzer {
  constructor(options = {}) {
    this.startBin = options.startBin ?? 3;
    this.endBin = options.endBin ?? 5;
    this.attackRate = options.attackRate ?? 0.8;
    this.releaseRate = options.releaseRate ?? 0.15;
    this.gateTime = options.gateTime ?? 250;
    this.onsetThreshold = options.onsetThreshold ?? 0.015;
    this.subtleThreshold = options.subtleThreshold ?? 0.005;
    this.decayRate = options.decayRate ?? 0.92;
    this.reset();
  }

  reset() {
    this.envelopeValue = 0.0;
    this.peakValue = 0.0;
    this.lastOnsetTime = 0;
    this.smoothedIntensity = 0.0;
  }

  analyzeFrequencyData(dataArray) {
    const startBin = Math.max(0, this.startBin);
    const endBin = Math.min(dataArray.length - 1, this.endBin);
    const binCount = Math.max(1, endBin - startBin + 1);

    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += dataArray[i];
    }

    const rawIntensity = (sum / binCount) / 255;
    return this.followEnvelope(rawIntensity);
  }

  followEnvelope(rawIntensity) {
    if (rawIntensity > this.envelopeValue) {
      this.envelopeValue += (rawIntensity - this.envelopeValue) * this.attackRate;
    } else {
      this.envelopeValue += (rawIntensity - this.envelopeValue) * this.releaseRate;
    }

    const delta = this.envelopeValue - (this.peakValue || this.envelopeValue);
    this.peakValue = this.envelopeValue;

    const now = Date.now();
    const isGated = now - this.lastOnsetTime < this.gateTime;

    if (delta > this.onsetThreshold && !isGated) {
      this.smoothedIntensity = Math.min(1.0, delta * 30);
      this.lastOnsetTime = now;
    } else if (!isGated && delta > this.subtleThreshold) {
      const subtleIntensity = Math.min(0.3, delta * 10);
      this.smoothedIntensity = Math.max(subtleIntensity, this.smoothedIntensity * this.decayRate);
    } else {
      this.smoothedIntensity *= this.decayRate;
    }

    return this.smoothedIntensity;
  }
}
