interface Line {
    line: number
    command: string
    args: TreeNode[]
}

interface Pair<A, B> {
    first: A
    second: B
}

const TokenType = {
    variable: "variable",
    number: "number",
    operator: "operator",
    string: "string"
} as const

type TokenType = typeof TokenType[keyof typeof TokenType]

interface Token {
    value: string
    type: TokenType
}

interface TreeNode {
    value: Token
    children?: Pair<TreeNode, TreeNode>
}

interface AstNode {
    value: Line
    children?: AstNode[]
}

const NAME_REGEX = /[a-z0-9_]/i
const NUMBER_REGEX = /[0-9]/
const SYMBOL_REGEX = /[+\-/*()|&^]/

// TODO: support more types of blocks
const BLOCK_DECS = ["foreach", "function", "if", "elif", "else"]
const COND_BLOCKS = ["if", "elif"]

function parseLines(lines: string[]): Line[] {
    const out: Line[] = []
    for (let line = 0; line < lines.length; line++) {
        const lineText = lines[line].trim()
        if (!lineText || lineText.startsWith("#")) continue
        const [command, argString] = splitLine(lineText)
        const args = splitArgs(argString)
        const nodes: TreeNode[] = []
        args.forEach((arg, argnum) => {
            if (!arg) return
            const tokens = tokenizeArg(arg, line+1, argnum)
            nodes.push(parseTokens(tokens, line+1, argnum).first)
        })
        out.push({
            line: line+1,
            command: command.toLowerCase(),
            args: nodes
        })
    }
    return out
}

function splitLine(line: string): string[] {
    const [first, ...second] = line.split(" ")
    return [
        first,
        second.join(" ")
    ]
}

function splitArgs(args: string): string[] {
    const out: string[] = []
    let curr = ""
    for (let i = 0; i < args.length; i++) {
        const char = args[i]
        if (char == ',') {
            out.push(curr.trim())
            curr = ""
        } else if (char == '"') {
            curr += char
            for (i++; i < args.length; i++) {
                const next = args[i]
                if (next == '\\') {
                    curr += next
                    curr += args[++i]
                } else if (next == '"') {
                    curr += next
                    break
                } else {
                    curr += next
                }
            }
        } else if (char == '(') {
            curr += char
            for (i++; i < args.length; i++) {
                const next = args[i]
                if (next == ')') {
                    curr += next
                    break
                } else {
                    curr += next
                }
            }
        } else {
            curr += char
        }
    }
    out.push(curr.trim())
    return out
}

function tokenizeArg(arg: string, line: number, argnum: number): Token[] {
    const tokens: Token[] = []
    for (let i = 0; i < arg.length; i++) {
        const char = arg[i]
        switch (true) {
            case !char.trim(): {
                break
            }
            case char == '"': {
                let str = ""
                for (i++; i < arg.length; i++) {
                    const curr = arg[i]
                    if (curr == '\\') {
                        const next = arg[i+1]
                        switch (next) {
                            case '"': {
                                str += '"'
                                i++
                                break
                            }
                            case 'n': {
                                str += "\n"
                                i++
                                break
                            }
                            case 't': {
                                str += "\t"
                                i++
                                break
                            }
                            //TODO: Add more escape codes
                        }
                    } else if (curr == '"') {
                        break
                    } else {
                        str += curr
                    }
                }
                tokens.push({
                    value: str,
                    type: "string"
                })
                break
            }
            case char == '$': {
                let name = ""
                for (i++; i < arg.length; i++) {
                    const curr = arg[i]
                    if (NAME_REGEX.test(curr)){
                        name += curr
                    } else {
                        i--
                        break
                    }
                }
                tokens.push({
                    value: name,
                    type: "variable"
                })
                break
            }
            case NUMBER_REGEX.test(char): {
                let num = char
                for (i++; i < arg.length; i++) {
                    const curr = arg[i]
                    if (NUMBER_REGEX.test(curr)){
                        num += curr
                    } else {
                        i--
                        break
                    }
                }
                tokens.push({
                    value: num,
                    type: "number"
                })
                break
            }
            case SYMBOL_REGEX.test(char): {
                tokens.push({
                    value: char,
                    type: "operator"
                })
                break
            }
            default: {
                throw `Error: Line ${line}: Argument ${argnum}: Unexpected character ${char}`
            }
        }
    }
    return tokens
}

function parseTokens(tokens: Token[], line: number, argnum: number): Pair<TreeNode, number> {
    const opStack: Token[] = []
    const outputQueue: Token[] = []
    for (const token of tokens) {
        switch (token.type) {
            case "variable": case "number": case "string": {
                outputQueue.unshift(token)
                break
            }
            case "operator": {
                switch (token.value) {
                    case "+": case "-": 
                    case "*": case "/": {
                        const precedence = getPrecedence(token.value)
                        if (opStack.length > 0){
                            for (let next = opStack[opStack.length-1]; next.value != "(" && getPrecedence(next.value) > precedence; next = opStack[opStack.length-1]) {
                                outputQueue.unshift(opStack.pop()!)
                                if (opStack.length == 0) break
                            }
                        }
                        opStack.push(token)
                        break
                    }
                    case "(": {
                        opStack.push(token)
                        break
                    }
                    case ")": {
                        if (opStack.length > 0){
                            for (let next = opStack[opStack.length-1]; next.value != "("; next = opStack[opStack.length-1]) {
                                outputQueue.unshift(opStack.pop()!)
                                if (opStack.length == 0) break
                            }
                        }
                        if (opStack.length == 0 || opStack[opStack.length-1].value != "(")
                            throw `Error: Line ${line}: Argument ${argnum}: ( expected`
                        opStack.pop()
                        break
                    }
                }
                break
            }
        }
    }
    while (opStack.length > 0) {
        const token = opStack.pop()!
        if (token.value == "(") throw `Error: Line ${line}: Argument ${argnum}: ) expected`
        outputQueue.unshift(token)
    }
    return parseNode(outputQueue, 0, line)
}

function parseNode(tokens: Token[], index: number, line: number): Pair<TreeNode, number> {
    const token = tokens[index]
    if (token.type != "operator") return { first: { value: token }, second: index+1 }
    const first = parseNode(tokens, index+1, line)
    const second = parseNode(tokens, first.second, line)
    return {
        first: {
            value: token,
            children: {
                first: first.first,
                second: second.first
            }
        },
        second: second.second
    }
}

function getPrecedence(operator: string): number {
    switch (operator) {
        case "*": case "/": return 1
        case "+": case "-": return 2
        case "&": return 3
        case "|": return 4
        case "^": return 5
    }
    return 0
}

function buildAst(lines: Line[], index = 0, isCond = false): Pair<AstNode[], number> {
    const nodes: AstNode[] = []
    for (let i = index; i < lines.length; i++) {
        const line = lines[i]
        if (BLOCK_DECS.includes(line.command)) {
            const block = buildAst(lines, i+1, COND_BLOCKS.includes(line.command))
            i = block.second
            nodes.push({
                value: line,
                children: block.first
            })
        } else if (isCond && line.command == "elif" || line.command == "else") {
            return {first: nodes, second: i-1}
        } else if (line.command == "end") {
            return {first: nodes, second: i}
        } else {
            nodes.push({value: line})
        }
    }
    return {first: nodes, second: lines.length}
}

interface Commands {
    // deno-lint-ignore no-explicit-any
    [name: string]: ((value: any, args: TreeNode[], line: number, state: State, children?: AstNode[]) => any)|undefined
}
interface State {
    // deno-lint-ignore no-explicit-any
    [name: string]: any
}

const commands: Commands = {
    "use": (_value, args, line, state, _children) => {
        if (args.length != 1) throw `Error: Line ${line}: Command  \`use\` must have one argument`
        const file = parseArg(args[0], state, line, 0)
        return Deno.readTextFileSync(file)
    },
    "store": (value, args, line, state, _children) => {
        if (args.length == 0) throw `Error: Line ${line}: Command  \`const\` must have one or two arguments`
        const name = args[0]
        if (name.value.type != "variable") throw `Error: Line ${line}: Argument 1: Argument is not a variable reference`
        if (args.length == 1) {
            state.name = value
        } else if (args.length == 2) {
            state[name.value.value] = parseArg(args[1], state, line, 1)
            return value
        } else throw `Error: Line ${line}: Command  \`const\` must have one or two arguments`
        return value
        
    },
    "split": (value, args, line, state, _children) => {
        if (typeof value != "string") throw `Error: Line ${line}: Command  \`split\` must only be called when the value is a string`
        if (args.length != 1) throw `Error: Line ${line}: Command  \`split\` must have one argument`
        const arg = parseArg(args[0], state, line, 0)
        if (typeof arg != "string") throw `Error: Line ${line}: Argument 0: Argument is not a string or a variable pointing to a string`
        return value.split(arg)
    },
    "foreach": (value, _args, line, state, children) => {
        if (!Array.isArray(value)) throw `Error: Line ${line}: Value must be an array`
        for (let i = 0; i < value.length; i++) {
            value[i] = execute(children!, value[i], state)
        }
        return value
    },
    "join": (value, _args, line, _state, _children) => {
        if (!Array.isArray(value)) throw `Error: Line ${line}: Value must be an array`
        return value.join("")
    },
    "replace": (value, args, line, state, _children) => {
        if (args.length != 2) throw `Error: Line ${line}: Command  \`replace\` must have two arguments`
        const match = parseArg(args[0], state, line, 0)
        const substitute = parseArg(args[1], state, line, 1)
        return value == match ? substitute : value
    },
    "print": (value, args, line, state, _children) => {
        if (args.length == 0)
            console.log(value)
        else if (args.length == 1)
            console.log(parseArg(args[0], state, line, 0))
        else
            throw `Error: Line ${line}: Command  \`print\` must have zero or one argument`
        return value
    },
}

// deno-lint-ignore no-explicit-any
function parseArg(arg: TreeNode, state: State, line: number, argnum: number): any {
    switch (arg.value.type) {
        case "operator": {
            const first = parseArg(arg.children!.first, state, line, argnum)
            const second = parseArg(arg.children!.second, state, line, argnum)
            if (typeof first == "string" || typeof second == "string") throw `Error: Line ${line}: Argument ${argnum}: Cannot perform arethmetic on strings`
            switch (arg.value.value) {
                case "+": return first + second
                case "-": return first - second
                case "*": return first * second
                case "/": return first / second
                case "&": return first & second
                case "|": return first | second
                default: throw `Error: Line ${line}: Argument: ${argnum}: Unknown operator ${arg.value.value}`
            }
        }
        case "string": return arg.value.value
        case "number": return parseInt(arg.value.value)
        case "variable": return state[arg.value.value]
    }
}

// deno-lint-ignore no-explicit-any
function execute(ast: AstNode[], value: any = null, state: State = {}): any {
    for (let i = 0; i < ast.length; i++) {
        const {value: line, children} = ast[i]
        const command = commands[line.command]
        if (!command) throw `Error: Line ${line.line}: Command \`${line.command}\` not found`
        value = command(value, line.args, line.line, state, children)
    }
    return value
}

export default function parse(src: string) {
    const lines = parseLines(src.split("\n"))
    const ast = buildAst(lines).first
    execute(ast)
}