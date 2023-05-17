import os
import time
import logging
import sys
import types
from modules import *

# handy libraries
import numpy as np
import pandas as pd
import random


debug_info = False
all_package_functions_to_globals = True
available_objects = []


# prints formatted line
def log(msg, *args, **kwargs) -> None:
    if isinstance(msg, str):
        msg = msg.replace('\r', '').split('\n')
        for i, m in enumerate(msg[1:]):
            msg[i + 1] = ' >> ' + m
        msg = '\n'.join(msg)
    logging.getLogger().info(msg, *args, **kwargs)


# prints out general information about this script
def info() -> None:
    global available_objects
    log('Python ' + sys.version)
    log('Available objects:' + "".join(['\n' + x for x in available_objects]))


if __name__ == '__main__':
    logger = logging.getLogger()
    logger.setLevel(logging.INFO if debug_info is False else logging.DEBUG)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter('%(asctime)-8s > %(message)s'))

    logger.propagate = False
    logger.handlers = []
    logger.addHandler(console_handler)

    del console_handler

    if all_package_functions_to_globals:
        for n, t in list(globals().items()):
            if isinstance(t, types.FunctionType) and not n.startswith('__'):
                available_objects.append(n)
            if isinstance(t, types.ModuleType) and t.__package__ == 'modules':
                for x in dir(t):
                    v = getattr(t, x)
                    if not x.startswith('__'):
                        if x in globals().keys() and isinstance(globals()[x], type(v)):
                            logger.debug('Objects name conflict: ', x)
                        else:
                            globals().update({x: v})
                            available_objects.append(x)
