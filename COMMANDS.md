# Sparse's commands

## Block commands
These commands are attached to a block of code, and contain an `end` statement to close off the block

### Example of a block command:
```sparse
compare 1, 1
    print "Hewwo! :3"
end
```

### List of block commands
- `foreach`
    - Executes on an array
    - Iterates through the values of the array
    - Inside the block, the local value is the current element of the array
    - Changing the local value changes the element in the array
- `compare $arg1, $arg2`
    - If arg1 and arg2 are the same, it runs the block
    - Accepts any type

## Regular commands
These commands can execute on the local value, or execute on a variable

### List of regular commands
- `use $path`
    - Loads the file at path and sets the local value
- `store $variable, $value?`
    - Stores the value to the variable, if present
    - If not present, it stores the local value
- `load $variable`
    - Loads the variable and sets it to the local value
- `split $match`
    - Executes on a string
    - Splits the string at the given matcher, and sets the output to the local value
- `join`
    - Executes on an array
    - Joins the local value to a string and sets the local value
- `replace $match, $substitute`
    - Executes on a string or an int
    - If the local value equals math, set it to substitute
- `print $value?`
    - Prints the value to the console, if present
    - If not present, it prints the local value
- `asint`
    - Executes on a string
    - Parses the local value as an int, and sets the output to the local value
- `asstr`
    - Executes on an int
    - Converts the local value to a base-10 representation, and sets the output to the local value
- `addall`
    - Executes on an array of ints
    - Adds all the values together, and sets the output to the local value
- `trim`
    - Executs on a string
    - Trims the local value, and sets the output to the local value
- `max $n`
    - Executes on an array of ints
    - Selects the largest n elements and removes the rest
- `min $n`
    - Executes on an array of ints
    - Selects the smallest n elements and removes the rest
- `select $number`
    - Executes on an array
    - Selects the value at the index, and sets the output to the local value
