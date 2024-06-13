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
import logging


__open_ai_min_ver = "1.0.0"

installed_parts = list(map(int, openai.__version__.split('.')))
required_parts = list(map(int, __open_ai_min_ver.split('.')))

for installed_part, required_part in zip(installed_parts, required_parts):
	if installed_part < required_part:
		print(f"""
The openai version is required to be more than {__open_ai_min_ver}.
You can upgrade it using pip:
pip install --upgrade openai
		""")
		exit(1)


__httpx_logger = logging.getLogger("httpx")
__httpx_logger.setLevel(logging.WARNING)
__chat_messages = []


# sends the query to ChatGPT 4o
def chat4(prompt: str, system: str = None, save_context: bool = True) -> None:
	chat(prompt, system, save_context, 'gpt-4o')


# sends the query to ChatGPT
def chat(prompt: str, system: str = None, save_context: bool = True, model: str = 'gpt-3.5-turbo') -> None:
	global __chat_messages

	if not openai.api_key:
		print("You need to setup the OpenAI API key first")
		exit(1)

	client = openai.OpenAI(api_key=openai.api_key)
	msg = []
	if system:
		msg.append({"role": "system", "content": system})
	if save_context:
		msg += __chat_messages
	msg.append({"role": "user", "content": prompt})

	try:
		completion = client.chat.completions.create(model=model, messages=msg)
	except (
		openai.BadRequestError,
		openai.AuthenticationError,
		openai.PermissionDeniedError,
		openai.NotFoundError,
		openai.UnprocessableEntityError,
		openai.RateLimitError,
		openai.InternalServerError,
		openai.APIConnectionError,
		openai.APITimeoutError
	) as e:
		if save_context and len(__chat_messages) > 2:
			del __chat_messages[0]
			del __chat_messages[0]
			return chat(prompt, system, save_context)
		else:
			raise e

	if save_context:
		__chat_messages += [
			{"role": "user", "content": prompt},
			{"role": "assistant", "content": completion.choices[0].message.content}
		]
	print(completion.choices[0].message.content + '\n')


# cleans chat history
def clean_chat() -> None:
	global __chat_messages
	__chat_messages = []
