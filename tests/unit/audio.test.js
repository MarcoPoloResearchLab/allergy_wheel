import { jest } from "@jest/globals";

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

function createMockAudioBuffer(length, sampleRate) {
  const channels = new Map();
  return {
    length,
    sampleRate,
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
  return context;
}

const SirenTestCases = Object.freeze([
  Object.freeze({
    description: "alternates its dual tones throughout the requested duration",
    durationMs: 1200
  })
]);

const originalAudioContext = window.AudioContext;
const originalWebkitAudioContext = window.webkitAudioContext;

describe("playSiren", () => {
  let playSiren;
  let mockContext;

  beforeEach(async () => {
    jest.resetModules();
    jest.useFakeTimers();
    mockContext = createMockAudioContext();
    window.AudioContext = jest.fn(() => mockContext);
    window.webkitAudioContext = undefined;
    ({ playSiren } = await import("../../audio.js"));
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    window.webkitAudioContext = originalWebkitAudioContext;
    jest.useRealTimers();
  });

  it.each(SirenTestCases)("playSiren $description", async ({ description, durationMs }) => {
    const sirenPromise = playSiren(durationMs);
    jest.advanceTimersByTime(durationMs);
    await sirenPromise;

    const carrierOscillators = mockContext.createdOscillators.filter((oscillator) => {
      const firstSetCall = oscillator.frequency.history.find((entry) => entry.type === "set");
      return firstSetCall && firstSetCall.value > 100;
    });

    expect(carrierOscillators).toHaveLength(2);

    const carrierFrequencies = carrierOscillators
      .map((oscillator) => oscillator.frequency.history.find((entry) => entry.type === "set")?.value)
      .sort((a, b) => a - b);

    expect(carrierFrequencies[0]).toBeCloseTo(650, 0);
    expect(carrierFrequencies[1]).toBeCloseTo(920, 0);

    const modulationOscillators = mockContext.createdOscillators.filter((oscillator) => {
      const firstSetCall = oscillator.frequency.history.find((entry) => entry.type === "set");
      return firstSetCall && firstSetCall.value < 10;
    });

    expect(modulationOscillators).toHaveLength(2);
    modulationOscillators.forEach((oscillator) => {
      const firstSetCall = oscillator.frequency.history.find((entry) => entry.type === "set");
      expect(firstSetCall.value).toBeCloseTo(0.5, 5);
    });

    const toneGainNodes = carrierOscillators.map((oscillator) => {
      const link = mockContext.connections.find((connection) => connection.source === oscillator);
      expect(link).toBeDefined();
      return link.target;
    });

    toneGainNodes.forEach((gainNode) => {
      const hasActiveRamp = gainNode.gain.history.some(
        (entry) => entry.type === "linear" && entry.value > 0.5
      );
      expect(hasActiveRamp).toBe(true);
    });

    const fadeEvents = toneGainNodes
      .flatMap((gainNode, toneIndex) =>
        gainNode.gain.history
          .filter((entry) => entry.type === "linear" && entry.value > 0.5)
          .map((entry) => ({ toneIndex, time: entry.time }))
      )
      .sort((left, right) => left.time - right.time);

    expect(fadeEvents.length).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < fadeEvents.length; index += 1) {
      expect(fadeEvents[index].toneIndex).not.toBe(fadeEvents[index - 1].toneIndex);
    }

    const lastFadeEvent = fadeEvents[fadeEvents.length - 1];
    expect(lastFadeEvent.time).toBeGreaterThanOrEqual((durationMs / 1000) * 0.9);

    carrierOscillators.forEach((oscillator) => {
      expect(oscillator.start).toHaveBeenCalledWith(0);
      const [[stopTime]] = oscillator.stop.mock.calls;
      expect(stopTime).toBeGreaterThan((durationMs / 1000));
    });

    expect(mockContext.createdWaveShapers).toHaveLength(1);
    expect(mockContext.createdWaveShapers[0].curve).toBeInstanceOf(Float32Array);

    expect(description).toBeDefined();
  });
});

const TriangleWaveformType = "triangle";

const NomNomRandomizationTestCases = Object.freeze([
  Object.freeze({
    description: "applies variation across successive chews",
    durationMs: 600,
    randomSequence: [
      0.1, 0.2, 0.25, 0.35, 0.2,
      0.9, 0.8, 0.75, 0.65, 0.8,
      0.5, 0.5, 0.5, 0.5, 0.5
    ]
  })
]);

describe("playNomNom", () => {
  let playNomNom;
  let mockContext;

  beforeEach(async () => {
    jest.resetModules();
    mockContext = createMockAudioContext();
    window.AudioContext = jest.fn(() => mockContext);
    window.webkitAudioContext = undefined;
    ({ playNomNom } = await import("../../audio.js"));
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    window.webkitAudioContext = originalWebkitAudioContext;
  });

  it.each(NomNomRandomizationTestCases)("playNomNom $description", ({ durationMs, randomSequence }) => {
    const remainingRandomValues = [...randomSequence];
    const deterministicRandom = jest.fn(() => {
      if (remainingRandomValues.length === 0) {
        return randomSequence[randomSequence.length - 1] ?? 0.5;
      }
      return remainingRandomValues.shift();
    });

    playNomNom(durationMs, deterministicRandom);

    const toneOscillators = mockContext.createdOscillators.filter(
      (oscillator) => oscillator.type === TriangleWaveformType
    );
    expect(toneOscillators.length).toBeGreaterThanOrEqual(2);

    const toneStartFrequencies = toneOscillators.slice(0, 2).map((oscillator) => {
      const firstSetEvent = oscillator.frequency.history.find((event) => event.type === "set");
      return firstSetEvent?.value;
    });

    expect(toneStartFrequencies[0]).toBeDefined();
    expect(toneStartFrequencies[1]).toBeDefined();
    expect(toneStartFrequencies[0]).not.toBe(toneStartFrequencies[1]);

    const biquadFiltersPerChew = 3;
    const crunchFilterOffset = 2;
    const crunchFilters = [];
    for (let index = 0; index < mockContext.createdBiquadFilters.length; index += biquadFiltersPerChew) {
      const crunchFilter = mockContext.createdBiquadFilters[index + crunchFilterOffset];
      if (crunchFilter) {
        crunchFilters.push(crunchFilter);
      }
    }
    expect(crunchFilters.length).toBeGreaterThanOrEqual(2);

    const crunchFrequencies = crunchFilters.slice(0, 2).map((filter) => {
      const firstSetEvent = filter.frequency.history.find((event) => event.type === "set");
      return firstSetEvent?.value;
    });

    expect(crunchFrequencies[0]).toBeDefined();
    expect(crunchFrequencies[1]).toBeDefined();
    expect(crunchFrequencies[0]).not.toBe(crunchFrequencies[1]);

    expect(mockContext.createdBufferSources.length).toBeGreaterThanOrEqual(2);
    const crunchStartTimes = mockContext.createdBufferSources.slice(0, 2).map((source) => {
      const [[startTime]] = source.start.mock.calls;
      return startTime;
    });

    expect(crunchStartTimes[0]).toBeDefined();
    expect(crunchStartTimes[1]).toBeDefined();
    expect(crunchStartTimes[0]).not.toBe(crunchStartTimes[1]);
    expect(deterministicRandom).toHaveBeenCalled();
  });
});
