import { jest } from "@jest/globals";
import { AudioAssetPath } from "../../constants.js";

function createMockAudioParam(initialValue = 0) {
  const history = [];
  const param = {
    value: initialValue,
    history,
    setValueAtTime: jest.fn((value, time) => {
      param.value = value;
      history.push({ type: "set", value, time });
    }),
    linearRampToValueAtTime: jest.fn((value, time) => {
      param.value = value;
      history.push({ type: "linear", value, time });
    }),
    exponentialRampToValueAtTime: jest.fn((value, time) => {
      param.value = value;
      history.push({ type: "exponential", value, time });
    }),
    cancelScheduledValues: jest.fn((time) => {
      history.push({ type: "cancel", time });
    })
  };
  return param;
}

function createConnectableNode(connections) {
  const node = {
    connections: [],
    connect: jest.fn((target) => {
      connections.push({ source: node, target });
      node.connections.push(target);
      return target;
    })
  };
  return node;
}

function createMockOscillator(connections) {
  const oscillator = createConnectableNode(connections);
  oscillator.frequency = createMockAudioParam(0);
  oscillator.start = jest.fn();
  oscillator.stop = jest.fn();
  oscillator.type = "";
  return oscillator;
}

function createMockGainNode(connections) {
  const gainNode = createConnectableNode(connections);
  gainNode.gain = createMockAudioParam(1);
  return gainNode;
}

function createMockBiquadFilter(connections) {
  const biquadFilter = createConnectableNode(connections);
  biquadFilter.frequency = createMockAudioParam(0);
  biquadFilter.Q = createMockAudioParam(1);
  biquadFilter.type = "";
  return biquadFilter;
}

function createMockWaveShaper(connections) {
  const waveShaper = createConnectableNode(connections);
  waveShaper.curve = null;
  waveShaper.oversample = "";
  return waveShaper;
}

function createMockBufferSource(connections) {
  const bufferSource = createConnectableNode(connections);
  bufferSource.buffer = null;
  bufferSource.start = jest.fn();
  bufferSource.stop = jest.fn();
  return bufferSource;
}

function createMockAudioBuffer(length, sampleRate, durationSeconds = length / sampleRate) {
  const channels = new Map();
  return {
    length,
    sampleRate,
    duration: durationSeconds,
    getChannelData: jest.fn((channelIndex) => {
      if (!channels.has(channelIndex)) {
        channels.set(channelIndex, new Float32Array(length));
      }
      return channels.get(channelIndex);
    })
  };
}

function createMockAudioContext() {
  const connections = [];
  const createdOscillators = [];
  const createdGains = [];
  const createdBiquadFilters = [];
  const createdWaveShapers = [];
  const createdBufferSources = [];
  const createdBuffers = [];
  const context = {
    currentTime: 0,
    destination: { nodeName: "destination" },
    connections,
    createdOscillators,
    createdGains,
    createdBiquadFilters,
    createdWaveShapers,
    createdBufferSources,
    createdBuffers,
    sampleRate: 44100,
    resume: jest.fn(),
    createOscillator: jest.fn(() => {
      const oscillator = createMockOscillator(connections);
      createdOscillators.push(oscillator);
      return oscillator;
    }),
    createGain: jest.fn(() => {
      const gainNode = createMockGainNode(connections);
      createdGains.push(gainNode);
      return gainNode;
    }),
    createBiquadFilter: jest.fn(() => {
      const biquadFilter = createMockBiquadFilter(connections);
      createdBiquadFilters.push(biquadFilter);
      return biquadFilter;
    }),
    createWaveShaper: jest.fn(() => {
      const waveShaper = createMockWaveShaper(connections);
      createdWaveShapers.push(waveShaper);
      return waveShaper;
    }),
    createBufferSource: jest.fn(() => {
      const bufferSource = createMockBufferSource(connections);
      createdBufferSources.push(bufferSource);
      return bufferSource;
    }),
    createBuffer: jest.fn((channelCount, length, sampleRate) => {
      const buffer = createMockAudioBuffer(length, sampleRate);
      createdBuffers.push(buffer);
      return buffer;
    })
  };
  const defaultDecodedBuffer = createMockAudioBuffer(
    Math.floor(context.sampleRate * 1.6),
    context.sampleRate,
    1.6
  );
  context.decodeAudioData = jest.fn(() => Promise.resolve(defaultDecodedBuffer));
  return context;
}

async function flushAllMicrotasks(iterations = 5) {
  for (let index = 0; index < iterations; index += 1) {
    await Promise.resolve();
  }
}

const SirenPlaybackExpectation = Object.freeze({
  attackSeconds: 0.08,
  releaseSeconds: 0.18,
  minimalGainLevel: 0.0001,
  activeGainLevel: 0.85
});

const SirenPlaybackTestCases = Object.freeze([
  Object.freeze({
    description: "plays the decoded siren buffer with a fade envelope",
    durationMs: 1200,
    bufferDurationSeconds: 4,
    expectedLoop: false
  }),
  Object.freeze({
    description: "loops the siren buffer when the requested duration exceeds the asset length",
    durationMs: 4800,
    bufferDurationSeconds: 1.5,
    expectedLoop: true
  })
]);

const originalAudioContext = window.AudioContext;
const originalWebkitAudioContext = window.webkitAudioContext;
const originalFetch = global.fetch;

describe("playSiren", () => {
  let playSiren;
  let mockContext;
  let fetchMock;

  beforeEach(async () => {
    jest.resetModules();
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    mockContext = createMockAudioContext();
    window.AudioContext = jest.fn(() => mockContext);
    window.webkitAudioContext = undefined;
    ({ playSiren } = await import("../../audio.js"));
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    window.webkitAudioContext = originalWebkitAudioContext;
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it.each(SirenPlaybackTestCases)(
    "playSiren $description",
    async ({ durationMs, bufferDurationSeconds, expectedLoop }) => {
      const arrayBuffer = new ArrayBuffer(8);
      const response = {
        ok: true,
        arrayBuffer: jest.fn(() => Promise.resolve(arrayBuffer))
      };
      fetchMock.mockResolvedValue(response);

      const sirenBuffer = { duration: bufferDurationSeconds };
      mockContext.decodeAudioData.mockResolvedValue(sirenBuffer);

      const sirenPromise = playSiren(durationMs);

      await flushAllMicrotasks();
      await jest.advanceTimersByTimeAsync(durationMs);
      await sirenPromise;

      expect(fetchMock).toHaveBeenCalledWith(AudioAssetPath.SIREN);
      expect(response.arrayBuffer).toHaveBeenCalledTimes(1);
      expect(mockContext.decodeAudioData).toHaveBeenCalledWith(arrayBuffer);

      expect(mockContext.createdOscillators).toHaveLength(0);
      expect(mockContext.createdWaveShapers).toHaveLength(0);

      const bufferSources = mockContext.createdBufferSources;
      expect(bufferSources).toHaveLength(1);
      const [bufferSource] = bufferSources;
      expect(bufferSource.buffer).toBe(sirenBuffer);
      expect(bufferSource.loop).toBe(expectedLoop);
      expect(bufferSource.start).toHaveBeenCalledWith(mockContext.currentTime);

      const [[stopTime]] = bufferSource.stop.mock.calls;
      const requestedSeconds = durationMs / 1000;
      expect(stopTime).toBeGreaterThan(requestedSeconds);
      expect(stopTime).toBeCloseTo(
        requestedSeconds + SirenPlaybackExpectation.releaseSeconds,
        5
      );

      const [masterGainNode] = mockContext.createdGains;
      expect(masterGainNode).toBeDefined();
      expect(masterGainNode.connections).toContain(mockContext.destination);

      const gainHistory = masterGainNode.gain.history;
      const initialGainSet = gainHistory.find(
        (entry) =>
          entry.type === "set" && entry.value === SirenPlaybackExpectation.minimalGainLevel
      );
      expect(initialGainSet?.time).toBe(0);

      const attackEvent = gainHistory.find(
        (entry) =>
          entry.type === "exponential" &&
          entry.value === SirenPlaybackExpectation.activeGainLevel
      );
      expect(attackEvent?.time).toBeCloseTo(
        SirenPlaybackExpectation.attackSeconds,
        5
      );

      const releaseEvent = gainHistory
        .filter(
          (entry) =>
            entry.type === "exponential" &&
            entry.value === SirenPlaybackExpectation.minimalGainLevel
        )
        .pop();
      expect(releaseEvent?.time).toBeCloseTo(
        requestedSeconds + SirenPlaybackExpectation.releaseSeconds,
        5
      );

      const cancelEvent = gainHistory.find((entry) => entry.type === "cancel");
      expect(cancelEvent?.time).toBeCloseTo(requestedSeconds, 5);

      const sourceConnection = mockContext.connections.find(
        (link) => link.source === bufferSource && link.target === masterGainNode
      );
      expect(sourceConnection).toBeDefined();
    }
  );

  it("reuses the decoded siren buffer on subsequent playbacks", async () => {
    const arrayBuffer = new ArrayBuffer(16);
    const response = {
      ok: true,
      arrayBuffer: jest.fn(() => Promise.resolve(arrayBuffer))
    };
    fetchMock.mockResolvedValue(response);

    const sirenBuffer = { duration: 2.5 };
    mockContext.decodeAudioData.mockResolvedValue(sirenBuffer);

    const firstPlayback = playSiren(500);
    await flushAllMicrotasks();
    await jest.advanceTimersByTimeAsync(500);
    await firstPlayback;

    const secondPlayback = playSiren(500);
    await flushAllMicrotasks();
    await jest.advanceTimersByTimeAsync(500);
    await secondPlayback;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(mockContext.decodeAudioData).toHaveBeenCalledTimes(1);

    expect(mockContext.createdBufferSources).toHaveLength(2);
    mockContext.createdBufferSources.forEach((source) => {
      expect(source.buffer).toBe(sirenBuffer);
    });
  });
});

const NomNomQuickRepeatDelaySeconds = 0.05;
const NomNomChewGapSeconds = 0.28;
const NomNomFourthBiteAllowanceSeconds = 0.25;
const NomNomStartOffsetSafetyMarginSeconds = 0.02;
const NomNomExpectedGainLevel = 0.9;
const NomNomRandomValueMaximum = 0.999999;
const NomNomPlaybackTestCases = Object.freeze([
  Object.freeze({
    description: "uses buffered chewing audio with randomized offsets",
    durationMs: 600,
    randomSequence: [
      0.1, 0.2, 0.25, 0.35, 0.2,
      0.9, 0.8, 0.75, 0.65, 0.8,
      0.5, 0.5, 0.5, 0.5, 0.5
    ]
  }),
  Object.freeze({
    description: "schedules the optional fourth bite when duration allows",
    durationMs: 1200,
    randomSequence: [
      0.3, 0.45, 0.6, 0.7, 0.8,
      0.2, 0.2, 0.2, 0.2, 0.2
    ]
  })
]);

const NomNomCachingTestCases = Object.freeze([
  Object.freeze({ description: "reuses cached buffer on repeated playback" })
]);

describe("playNomNom", () => {
  let playNomNom;
  let preloadNomNom;
  let mockContext;
  let decodedNomNomBuffer;
  let fetchResponse;

  beforeEach(async () => {
    jest.resetModules();
    mockContext = createMockAudioContext();
    decodedNomNomBuffer = createMockAudioBuffer(
      Math.floor(mockContext.sampleRate * 1.6),
      mockContext.sampleRate,
      1.6
    );
    mockContext.decodeAudioData = jest.fn(() => Promise.resolve(decodedNomNomBuffer));
    window.AudioContext = jest.fn(() => mockContext);
    window.webkitAudioContext = undefined;
    const arrayBufferPayload = new ArrayBuffer(32);
    fetchResponse = {
      ok: true,
      arrayBuffer: jest.fn(() => Promise.resolve(arrayBufferPayload))
    };
    global.fetch = jest.fn(() => Promise.resolve(fetchResponse));
    ({ playNomNom, preloadNomNom } = await import("../../audio.js"));
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    window.webkitAudioContext = originalWebkitAudioContext;
    global.fetch = originalFetch;
  });

  it.each(NomNomPlaybackTestCases)("playNomNom $description", async ({ durationMs, randomSequence }) => {
    const remainingRandomValues = [...randomSequence];
    const deterministicRandom = jest.fn(() => {
      if (remainingRandomValues.length === 0) {
        return randomSequence[randomSequence.length - 1] ?? 0.5;
      }
      return remainingRandomValues.shift();
    });

    await playNomNom(durationMs, deterministicRandom);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(AudioAssetPath.NOM_NOM);
    expect(fetchResponse.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(mockContext.decodeAudioData).toHaveBeenCalledTimes(1);

    const expectedStartTimes = [0, NomNomQuickRepeatDelaySeconds, NomNomChewGapSeconds];
    const totalDurationSeconds = Math.max(0.35, Math.max(0, durationMs) / 1000);
    const finalStartTime = NomNomChewGapSeconds * 2;
    if (finalStartTime + NomNomFourthBiteAllowanceSeconds <= totalDurationSeconds) {
      expectedStartTimes.push(finalStartTime);
    }

    expect(mockContext.createdBufferSources).toHaveLength(expectedStartTimes.length);
    expect(mockContext.createdGains).toHaveLength(expectedStartTimes.length);

    const playableDurationSeconds = decodedNomNomBuffer.duration - NomNomStartOffsetSafetyMarginSeconds;

    mockContext.createdBufferSources.forEach((source, index) => {
      const [[startTime, offsetSeconds]] = source.start.mock.calls;
      expect(startTime).toBeCloseTo(expectedStartTimes[index], 5);
      expect(offsetSeconds).toBeGreaterThanOrEqual(0);
      expect(offsetSeconds).toBeLessThan(decodedNomNomBuffer.duration);

      if (playableDurationSeconds > 0) {
        const expectedRandomValue = Math.max(
          0,
          Math.min(
            randomSequence[index] ?? randomSequence[randomSequence.length - 1] ?? 0.5,
            NomNomRandomValueMaximum
          )
        );
        expect(offsetSeconds / playableDurationSeconds).toBeCloseTo(expectedRandomValue, 5);
      }
    });

    expect(deterministicRandom).toHaveBeenCalledTimes(expectedStartTimes.length);

    mockContext.createdGains.forEach((gainNode, index) => {
      const [[gainValue, gainTime]] = gainNode.gain.setValueAtTime.mock.calls;
      expect(gainValue).toBeCloseTo(NomNomExpectedGainLevel, 5);
      expect(gainTime).toBeCloseTo(expectedStartTimes[index], 5);
    });
  });

  it.each(NomNomCachingTestCases)("playNomNom $description", async ({ description }) => {
    await preloadNomNom();
    await playNomNom(600, () => 0.4);
    await playNomNom(600, () => 0.6);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(fetchResponse.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(mockContext.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(description).toBeDefined();
  });
});
