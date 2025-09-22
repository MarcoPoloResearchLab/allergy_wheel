import { jest } from "@jest/globals";
import { Wheel } from "../../js/core/wheel.js";

const WheelTestDescription = Object.freeze({
  RENDERS_LABELS_TO_CANVAS: "initializes wheel and renders segment labels to canvas"
});

const WheelLabelEntries = Object.freeze({
  FIRST: { label: "Sushi", emoji: "🍣" },
  SECOND: { label: "Paella", emoji: "🥘" },
  THIRD: { label: "Falafel", emoji: "🧆" }
});

const CanvasDimension = Object.freeze({
  WIDTH: 360,
  HEIGHT: 320
});

function createWindowStub() {
  class ResizeObserverStub {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {
      this.callback();
    }

    disconnect() {}
  }

  return {
    innerWidth: 800,
    devicePixelRatio: 2,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setTimeout: (handler, delay) => setTimeout(handler, delay),
    clearTimeout: (identifier) => clearTimeout(identifier),
    requestAnimationFrame: (handler) => {
      handler(0);
      return 1;
    },
    cancelAnimationFrame: () => {},
    performance: { now: () => 0 },
    ResizeObserver: ResizeObserverStub
  };
}

function createCanvasContextDouble() {
  const measureText = jest.fn((text) => ({ width: text.length * 10 }));
  return {
    beginPath: jest.fn(),
    arc: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    fill: jest.fn(),
    stroke: jest.fn(),
    clearRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    textAlign: "",
    textBaseline: "",
    font: "",
    strokeText: jest.fn(),
    fillText: jest.fn(),
    measureText,
    setTransform: jest.fn(),
    scale: jest.fn()
  };
}

const WheelIntegrationCases = [
  {
    description: WheelTestDescription.RENDERS_LABELS_TO_CANVAS,
    labels: [WheelLabelEntries.FIRST, WheelLabelEntries.SECOND, WheelLabelEntries.THIRD]
  }
];

describe("Wheel canvas rendering", () => {
  test.each(WheelIntegrationCases)(
    "%s",
    ({ labels }) => {
      const windowStub = createWindowStub();
      const wheel = new Wheel({ windowReference: windowStub });

      const canvasContainer = document.createElement("div");
      canvasContainer.getBoundingClientRect = () => ({ width: CanvasDimension.WIDTH, height: CanvasDimension.HEIGHT });
      Object.defineProperty(canvasContainer, "offsetWidth", { value: CanvasDimension.WIDTH, configurable: true });
      Object.defineProperty(canvasContainer, "offsetHeight", { value: CanvasDimension.HEIGHT, configurable: true });

      const canvasElement = document.createElement("canvas");
      canvasElement.width = CanvasDimension.WIDTH;
      canvasElement.height = CanvasDimension.HEIGHT;
      canvasContainer.appendChild(canvasElement);

      const contextDouble = createCanvasContextDouble();
      canvasElement.getContext = jest.fn(() => contextDouble);

      document.body.appendChild(canvasContainer);

      wheel.initialize(canvasElement);
      wheel.setLabels(labels);
      wheel.draw();

      const expectedCssSide = Math.min(CanvasDimension.WIDTH, CanvasDimension.HEIGHT);
      expect(canvasElement.style.width).toBe(`${expectedCssSide}px`);
      expect(canvasElement.width).toBe(expectedCssSide * windowStub.devicePixelRatio);
      expect(contextDouble.clearRect).toHaveBeenCalled();
      const fillTextCalls = contextDouble.fillText.mock.calls.map((call) => call[0]);
      expect(fillTextCalls).toContain(WheelLabelEntries.FIRST.label);
      expect(windowStub.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    }
  );
});
