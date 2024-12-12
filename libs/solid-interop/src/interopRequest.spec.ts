import {createResourceInAnyRegistrationOfShape} from "./interopRequest";

describe('interopRequest', () => {
  it('Should call request method', () => {
    expect(typeof createResourceInAnyRegistrationOfShape === 'function').toBe(true);
  })
});
