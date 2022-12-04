import parse from "./src/parser.ts"
export default parse

if (import.meta.main) {
    parse(await Deno.readTextFile("./test.sparse"))
}