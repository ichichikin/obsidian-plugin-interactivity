# This file is a part of Obsidian's Interactivity plugin

try:
	import pandas as pd
except ImportError:
	print("""
The openai library is required to run tables.py.
You can install it using pip:
pip install pandas
""")
	exit(1)
try:
	from tabulate import tabulate
except ImportError:
	print("""
The tabulate library is required to run tables.py.
You can install it using pip:
pip install openpyxl tabulate
""")
	exit(1)


# prints an Excel table
def excel_table(path: str, *args, **kwargs) -> None:
	try:
		df = pd.read_excel(path, *args, **kwargs)
		markdown_table = tabulate(df, headers='keys', tablefmt='pipe')
		print(f'\n{markdown_table}\n')
	except:
		print('Unable to load the table\n')

# prints a CSV table
def csv_table(path: str, *args, **kwargs) -> None:
	try:
		df = pd.read_csv(path, *args, **kwargs)
		markdown_table = tabulate(df, headers='keys', tablefmt='pipe')
		print(f'\n{markdown_table}\n')
	except:
		print('Unable to load the table\n')
