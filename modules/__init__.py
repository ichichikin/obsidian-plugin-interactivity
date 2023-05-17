import os


__all__ = []
dir = os.path.dirname(__file__)
for root, subdirs, files in os.walk(dir):
    for f in files:
        if f != '__init__.py' and f.endswith('.py') and not f.startswith('_'):
            file = os.path.join(root, f)[len(dir) + 1:-3].replace(os.sep, '.')
            __all__.append(file)
