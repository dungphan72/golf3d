export function resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:workers') {
    return {
      url: new URL('./cf-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
