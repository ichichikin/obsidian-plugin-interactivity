import numpy as np
import matplotlib.pyplot as plt


# shows a plot
def plot(*args, update=False, pause=np.nextafter(0, 1), **kwargs) -> None:
    if update:
        if not plt.get_fignums():
            plt.grid()
            plt.ion()
            plt.show()
        else:
            plt.clf()
    plt.plot(*args, **kwargs)
    if update:
        plt.draw()
    else:
        plt.grid()
        plt.show()
    if pause:
        plt.pause(pause)
