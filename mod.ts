import parse from "./src/parser.ts"
export default parse

if (import.meta.main && Deno.args[0]) {
    parse(await Deno.readTextFile("./"+Deno.args[0]))
}