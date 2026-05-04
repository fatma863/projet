"""
CLI training script.
Usage: python train.py [--verbose]
Also called by: php artisan ml:train (via subprocess)
"""
from __future__ import annotations

import json
import sys

from recommender import train


def main() -> None:
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    result  = train(verbose=verbose)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
