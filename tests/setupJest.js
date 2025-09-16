import { jest } from "@jest/globals";

const { localStorage } = window;

afterEach(() => {
  jest.restoreAllMocks();
  if (localStorage) {
    localStorage.clear();
  }
});
