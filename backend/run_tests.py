#!/usr/bin/env python3
"""
Test runner for TrackFlow application
"""

import sys
import subprocess
import os
from pathlib import Path

def run_tests(test_type="all", verbose=False):
    """Run tests with specified options"""
    
    # Change to the trackflow directory
    os.chdir(Path(__file__).parent)
    
    # Set test environment variables
    os.environ["SPOTIFY_CLIENT_ID"] = "test_client_id"
    os.environ["SPOTIFY_CLIENT_SECRET"] = "test_client_secret"
    
    # Build pytest command
    cmd = ["python", "-m", "pytest"]
    
    if verbose:
        cmd.append("-v")
    
    # Add test type filters
    if test_type == "unit":
        cmd.extend(["-m", "unit"])
    elif test_type == "integration":
        cmd.extend(["-m", "integration"])
    elif test_type == "fast":
        cmd.extend(["-m", "not slow"])
    elif test_type == "models":
        cmd.append("tests/test_models.py")
    elif test_type == "api":
        cmd.append("tests/test_api_endpoints.py")
    elif test_type == "data":
        cmd.append("tests/test_data_access.py")
    elif test_type == "spotify":
        cmd.append("tests/test_spotify_integration.py")
    elif test_type == "schemas":
        cmd.append("tests/test_schemas.py")
    elif test_type != "all":
        print(f"Unknown test type: {test_type}")
        print_usage()
        return 1
    
    # Add coverage if available
    try:
        import coverage
        cmd.extend(["--cov=api", "--cov=models", "--cov=schemas", "--cov-report=term-missing"])
    except ImportError:
        pass
    
    print(f"Running tests: {test_type}")
    print(f"Command: {' '.join(cmd)}")
    print("-" * 50)
    
    # Run tests
    result = subprocess.run(cmd)
    
    return result.returncode

def print_usage():
    """Print usage information"""
    print("""
TrackFlow Test Runner

Usage: python run_tests.py [test_type] [options]

Test Types:
  all          Run all tests (default)
  unit         Run only unit tests
  integration  Run only integration tests
  fast         Run tests excluding slow ones
  models       Run only model tests
  api          Run only API endpoint tests
  data         Run only data access tests
  spotify      Run only Spotify integration tests
  schemas      Run only schema validation tests

Options:
  -v, --verbose  Verbose output

Examples:
  python run_tests.py                    # Run all tests
  python run_tests.py unit               # Run unit tests only
  python run_tests.py api -v             # Run API tests with verbose output
  python run_tests.py fast               # Run fast tests only
  python run_tests.py models             # Run model tests only
""")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        test_type = "all"
        verbose = False
    else:
        test_type = sys.argv[1]
        verbose = "-v" in sys.argv or "--verbose" in sys.argv
    
    if test_type in ["-h", "--help", "help"]:
        print_usage()
        return 0
    
    return run_tests(test_type, verbose)

if __name__ == "__main__":
    sys.exit(main()) 