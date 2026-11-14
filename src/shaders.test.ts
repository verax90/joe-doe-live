import { describe, expect, it } from 'vitest';
import { SHADERS } from './visuals';

// GLSL cannot be compiled here, but two mistakes can be caught by reading it.
// Both make a shader fail without a word: Hydra shows the picture untouched
describe("the studio's own shaders", () => {
  it('have a name each', () => {
    const names = SHADERS.map((shader) => shader.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const shader of SHADERS) {
    it(`${shader.name}: no input is declared again inside`, () => {
      for (const input of shader.inputs) {
        const again = new RegExp(`\\b(float|int|vec2|vec3|vec4)\\s+${input.name}\\b`);
        expect(again.test(shader.glsl), `${input.name} is an input and a variable`).toBe(false);
      }
    });

    it(`${shader.name}: every input is used`, () => {
      for (const input of shader.inputs) expect(shader.glsl).toMatch(new RegExp(`\\b${input.name}\\b`));
    });
  }
});
