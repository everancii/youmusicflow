// Jest transformer: downlevel ESM-only node_modules (.mjs / @exodus js) to CommonJS.
// Needed because jsdom 28 depends on ESM-only packages (@csstools/*, @exodus/*)
// and ts-jest refuses to emit CJS for .mjs inputs.
const ts = require('typescript')

module.exports = {
  process(sourceText, sourcePath) {
    const result = ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
        esModuleInterop: true,
        allowJs: true
      },
      // .js name sidesteps TS's "always ESM for .mjs" format detection
      fileName: sourcePath.replace(/\.mjs$/, '.js')
    })
    return { code: result.outputText }
  }
}
