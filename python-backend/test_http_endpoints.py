import sys
import os
import pytest

if __name__ == "__main__":
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    print("--- Running Python HTTP Endpoints Suite ---")
    ret = pytest.main(["-v", "python-backend/tests/test_auth.py"])
    sys.exit(ret)
