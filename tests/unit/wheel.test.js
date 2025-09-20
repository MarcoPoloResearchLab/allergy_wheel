import { jest } from "@jest/globals";
import { Wheel } from "../../wheel.js";

const WheelStopBehaviorDescription = Object.freeze({
  PREVENTS_DUPLICATE_COMPLETION:
    "prevents duplicate completion callbacks when stop is invoked multiple times"
});

const StopInvocationCount = Object.freeze({
  DOUBLE: 2
});

const ExpectedCompletionCallCount = Object.freeze({
  SINGLE: 1
});

const StubWinningSegmentIndex = 3;

const WheelStopBehaviorScenarios = Object.freeze([
  Object.freeze({
    description: WheelStopBehaviorDescription.PREVENTS_DUPLICATE_COMPLETION,
    stopInvocations: StopInvocationCount.DOUBLE,
    expectedCompletionCalls: ExpectedCompletionCallCount.SINGLE
  })
]);

describe("Wheel stop behavior", () => {
  test.each(WheelStopBehaviorScenarios)(
    "%s",
    ({ stopInvocations, expectedCompletionCalls }) => {
      const wheel = new Wheel();

      const cancelScheduledAnimationSpy = jest.fn();
      const drawSpy = jest.fn();
      const pointerIndexSpy = jest.fn(() => StubWinningSegmentIndex);
      const onSpinCompleteSpy = jest.fn();

      wheel.cancelScheduledAnimation = cancelScheduledAnimationSpy;
      wheel.draw = drawSpy;
      wheel.getCurrentPointerSegmentIndex = pointerIndexSpy;
      wheel.onSpinComplete = onSpinCompleteSpy;

      wheel.isSpinning = true;

      for (let invocationIndex = 0; invocationIndex < stopInvocations; invocationIndex += 1) {
        wheel.stop();
      }

      expect(onSpinCompleteSpy).toHaveBeenCalledTimes(expectedCompletionCalls);
      expect(onSpinCompleteSpy).toHaveBeenCalledWith(StubWinningSegmentIndex);
      expect(pointerIndexSpy).toHaveBeenCalledTimes(expectedCompletionCalls);
      expect(cancelScheduledAnimationSpy).toHaveBeenCalledTimes(expectedCompletionCalls);
      expect(drawSpy).toHaveBeenCalledTimes(expectedCompletionCalls);
      expect(wheel.lastTickedSegmentIndex).toBe(StubWinningSegmentIndex);
      expect(wheel.isSpinning).toBe(false);
    }
  );
});
