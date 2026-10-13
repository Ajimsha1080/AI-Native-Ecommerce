import sys
import os
import pytest

if __name__ == "__main__":
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    print("--- Running Python Evaluations Suite ---")
    ret = pytest.main(["-v", "python-backend/tests/test_evals.py"])
    sys.exit(ret)
