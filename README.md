# Interactivity Plugin for Obsidian

The Interactivity plugin allows you to run any executables inside your Obsidian notes. By default, it supports running JavaScript, but you can also configure it to run Python or other shell commands. This plugin is perfect for integrating powerful scripts directly into your note-taking workflow.

You can trigger shell execution in two ways:

1. Text Pattern from Notes: Define specific text patterns in your notes that, when encountered, will trigger the execution of the associated command. For example, you can use shortcuts like @ to run commands directly from your notes.

2. Hotkey: Assign a hotkey to run predefined commands. This allows you to execute commands without typing them into your notes. Simply press the designated hotkey to run the command instantly.

## Features

- **Run Shell Commands:** Execute shell commands directly from your notes.
- **Output Customization:** Decorate output with custom text and apply RegExp filters.
- **Environment Variables:** Set environment variables for your scripts.

## Installation

1. Download and extract the plugin files into your Obsidian plugins directory.
2. Enable the Interactivity plugin from the Obsidian settings.

## Configuration

Configure the plugin via the settings panel in Obsidian:

- **Use notifications instead of appending the output to the Obsidian notes:** Sends output notifications instead of adding them directly to your notes.
- **Decorate output:** Prepend the output with custom text.
- **Decorate each line of the output:** Apply custom text to each line of the output.
- **Text shortcuts that run commands:** Define text shortcuts for running commands. The text before '->' is the shortcut; the text after is the command to execute. Use `##param##` to include the line after the shortcut in the command. Press `Shift+Enter` for a new line without triggering the shortcut.

### Advanced Options (Not available on Mobile)

These options are available only on the desktop version of Obsidian:

- **Advanced options:** Enable the use of external executables (potentially unsafe). If this toggle is off, the plugin will use the default JavaScript interpreter.
- **Shell executable path:** Specify the path to the shell executable. Use `##plugin##` to refer to the plugin's directory.
- **Environment variables separated by lines:** Set environment variables, one per line. Use `##plugin##` to refer to the plugin's directory.
- **Shell CLI arguments separated by lines:** Specify shell command-line arguments, one per line. Use `##plugin##` to refer to the plugin's directory.
- **Commands to run after starting the shell:** Define commands to run after starting the shell.
- **Commands to run before closing the shell:** Define commands to run before closing the shell (not executable when closing Obsidian).
- **Enable separate shell sessions for each note:** Enable separate shell sessions for each note (requires more memory).
- **Apply a RegExp pattern to filter the output:** Apply a RegExp pattern to filter the output.
- **Specify the number of initial lines to skip:** Specify the number of initial lines to skip (e.g., shell greetings).

## Use Case: Complex Math Calculations

With the Interactivity plugin, you can perform complex math calculations directly within your Obsidian notes. For example, you can use the default JavaScript interpreter to calculate mathematical expressions:

```plaintext
@(10 + 365) / Math.E
```

For more complex calculations, you can write and run JavaScript functions, or if you enable advanced options, you can use Python or other scripting languages to leverage powerful libraries for mathematical computations.

## Use Case: Python Integration

This plugin includes a sample Python script (modules/chat.py) that demonstrates how to chat with ChatGPT directly from within Obsidian. You can add custom functionality by adding custom Python scripts to the modules directory. All global functions and variables in these scripts will be accessible from the plugin.

### Installing Python

- **Windows:** Download the installer from [python.org](https://www.python.org/downloads/windows/) and follow the installation instructions. Make sure to add Python to your PATH during the installation.
- **Linux:** Use your package manager to install Python. For example, on Ubuntu: `sudo apt-get install python3`.
- **macOS:** Install Python using Homebrew: `brew install python3`.

### Finding Python Executable Path

To find the Python executable path, run the following command in your terminal:

```sh
which python3
```

Use the output of this command as the path in the Shell executable path setting.

Next, you should configure the plugin's settings in Obsidian.

### Advanced Options

Turn on this toggle.

### Shell executable path

Set this field with the Python executable path you found earlier.

### Environment Variables

Set environment variables using the `Environment variables` setting. For Python, it’s crucial to set `PYTHONIOENCODING=utf8` to ensure proper encoding:

```plaintext
PYTHONIOENCODING=utf8
```

### Shell CLI Arguments

Specify shell command-line arguments in the `Shell CLI arguments` setting. For running Python scripts with this plugin, you should use the following settings:

```plaintext
-iq
##plugin##basics.py
```

- `-i`: Interactive mode, useful for keeping the interpreter running.
- `-q`: Suppress the startup interpreter's message.
- `##plugin##basics.py`: Run the basics.py file which in turn loads other Python files from the `modules` directory (including `modules/chat.py`).

### Commands to Run After Starting the Shell

Use the `Commands to run after starting the shell` setting to initialize necessary variables or configurations. For example, to set the OpenAI API key for `chat.py`:

```plaintext
openai.api_key = "YOUR_OPENAI_API_KEY"
```

### Commands to Run Before Closing the Shell

To ensure memory is properly managed when using Python interpreter, use the `Commands to run before closing the shell` setting to exit the shell:

```plaintext
exit()
```

Sure, here's the expanded "Text Shortcuts for Running Commands" section with the breakdown of the examples:

---

### Text Shortcuts for Running Commands

Define text shortcuts to run specific commands with the `Text shortcuts that run commands` setting. The text before '->' is the shortcut; the text after is the command to execute. Use `##param##` to include the line after the shortcut in the command. Press `Shift+Enter` for a new line without triggering the shortcut.

Here are examples for using `chat.py`:

#### Example 1

```plaintext
@ -> ##param##
```

- `@`: This is the shortcut you type at the beginning of a line in your Obsidian note.
- `##param##`: This includes the text that follows the shortcut on the same line. Essentially, it allows you to insert any text directly into the command.

This setup allows you to directly execute the input text as a command.

#### Example 2

```plaintext
@@ -> print(chat(r"""##param##""", system='Use markdown and emojis.', save_context=True, model='gpt-4o') + '\n')
```

- `@@`: This is the shortcut you type at the beginning of a line in your Obsidian note.
- `print(chat(r"""##param##""", system='Use markdown and emojis.', save_context=True, model='gpt-4o') + '\n')`: This command calls the `chat` function from `chat.py` with specific parameters.

Let's break down the parameters:
- `r"""##param##"""`: This includes the text that follows the shortcut on the same line.
- `system='Use markdown and emojis.'`: This sets the system message or context for the chat.
- `save_context=True`: This parameter instructs the chat function to save the context of the conversation.
- `model='gpt-4o'`: This specifies the model to be used, in this case, GPT-4.

By using this shortcut, you can quickly initiate a chat with ChatGPT using predefined settings, making your workflow more efficient.

#### Iterating Shortcuts

You can iterate both shortcuts by dividing them with a new line in your Obsidian notes:

```plaintext
@ -> ##param##
@@ -> print(chat(r"""##param##""", system='Use markdown and emojis.', save_context=True, model='gpt-4o') + '\n')
```

This allows you to define multiple shortcuts for different commands, enhancing your ability to run various functions directly from your notes.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss any changes.

## License

This project is licensed under the MIT License.
