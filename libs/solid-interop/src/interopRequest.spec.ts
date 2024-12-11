import {createResourceInAnyRegistrationOfShape} from "@shared/solid";

describe('interopRequest', () => {
  it('Should call request method', () => {
    expect(typeof createResourceInAnyRegistrationOfShape === 'function').toBe(true);
  })
});
