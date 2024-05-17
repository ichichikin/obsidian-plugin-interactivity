# This file is a part of Obsidian's Interactivity plugin

try:
    import openai
except ImportError:
    print("""
The openai library is required to run chat.py.
You can install it using pip:
pip install openai
""")
    exit(1)
import re


__chat_messages = []


# sends the query to ChatGPT 4o
def chat4(prompt: str, system: str = None, save_context: bool = True) -> None:
    chat(prompt, system, save_context, 'gpt-4o')


# sends the query to ChatGPT
def chat(prompt: str, system: str = None, save_context: bool = True, model: str = 'gpt-3.5-turbo') -> None:
    if openai.api_key is None:
        print("You need to setup the OpenAI API key first")
        exit(1)
    global __chat_messages
    msg = []
    if system:
        msg.append({"role": "system", "content": system})
    if save_context:
        msg += __chat_messages
    msg.append({"role": "user", "content": prompt})
    try:
        completion = openai.ChatCompletion.create(model=model, messages=msg)
    except openai.error.InvalidRequestError as e:
        if save_context and len(__chat_messages) > 2:
            del __chat_messages[0]
            del __chat_messages[0]
            return chat(prompt, system, save_context)
        else:
            raise e

    if save_context:
        __chat_messages += [{"role": "user", "content": prompt}, {"role": "assistant", "content": completion.choices[0].message.content}]
    print(completion.choices[0].message.content + '\n')


# cleans chat history
def clean_chat() -> None:
    __chat_messages = []
