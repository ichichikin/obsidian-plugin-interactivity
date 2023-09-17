import openai
import re


__chat_messages = []


# returns ChatGPT 4 response on a query
def chat4(prompt: str, system: str = None, save_context: bool = False) -> str:
    return chat(prompt, system, save_context, 'gpt-4o')


# returns ChatGPT response on a query
def chat(prompt: str, system: str = None, save_context: bool = False, model: str = 'gpt-3.5-turbo') -> str:
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
    return completion.choices[0].message.content


# cleans chat history
def clean_chat() -> None:
    __chat_messages = []
