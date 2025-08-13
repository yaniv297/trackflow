#!/usr/bin/env python3
"""
Comprehensive Test Runner for TrackFlow Backend

This script runs all tests in the test suite and provides detailed output
about test coverage and results.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def run_tests_with_coverage():
    """Run tests with coverage reporting"""
    print("🧪 Running TrackFlow Backend Test Suite")
    print("=" * 50)
    
    # Change to the backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Check if pytest is available
    try:
        import pytest
    except ImportError:
        print("❌ pytest not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pytest", "pytest-cov"], check=True)
    
    # Test files to run
    test_files = [
        "tests/test_models_updated.py",
        "tests/test_api_endpoints_updated.py", 
        "tests/test_data_access_updated.py"
    ]
    
    # Check if test files exist
    missing_files = [f for f in test_files if not Path(f).exists()]
    if missing_files:
        print(f"❌ Missing test files: {missing_files}")
        return False
    
    print("📋 Test Files to Run:")
    for test_file in test_files:
        print(f"  - {test_file}")
    print()
    
    # Run tests with coverage
    cmd = [
        sys.executable, "-m", "pytest",
        "--cov=api",
        "--cov=models", 
        "--cov=schemas",
        "--cov-report=term-missing",
        "--cov-report=html:htmlcov",
        "--cov-report=xml:coverage.xml",
        "-v",
        "--tb=short"
    ] + test_files
    
    print("🚀 Starting test execution...")
    start_time = time.time()
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        end_time = time.time()
        
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS")
        print("=" * 50)
        
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print("⚠️  Warnings/Errors:")
            print(result.stderr)
        
        print(f"\n⏱️  Test execution time: {end_time - start_time:.2f} seconds")
        
        if result.returncode == 0:
            print("✅ All tests passed!")
            return True
        else:
            print(f"❌ Tests failed with exit code: {result.returncode}")
            return False
            
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False

def run_specific_test_category(category):
    """Run tests for a specific category"""
    print(f"🧪 Running {category} tests...")
    
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    test_file_map = {
        "models": "tests/test_models_updated.py",
        "api": "tests/test_api_endpoints_updated.py",
        "data": "tests/test_data_access_updated.py"
    }
    
    if category not in test_file_map:
        print(f"❌ Unknown test category: {category}")
        print(f"Available categories: {list(test_file_map.keys())}")
        return False
    
    test_file = test_file_map[category]
    if not Path(test_file).exists():
        print(f"❌ Test file not found: {test_file}")
        return False
    
    cmd = [sys.executable, "-m", "pytest", test_file, "-v", "--tb=short"]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        
        print("\n" + "=" * 50)
        print(f"📊 {category.upper()} TEST RESULTS")
        print("=" * 50)
        
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print("⚠️  Warnings/Errors:")
            print(result.stderr)
        
        if result.returncode == 0:
            print(f"✅ {category} tests passed!")
            return True
        else:
            print(f"❌ {category} tests failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error running {category} tests: {e}")
        return False

def show_test_coverage():
    """Show test coverage information"""
    print("📈 Test Coverage Information")
    print("=" * 50)
    
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    coverage_file = Path("coverage.xml")
    if coverage_file.exists():
        print("✅ Coverage report generated: coverage.xml")
        print("📊 HTML coverage report: htmlcov/index.html")
    else:
        print("❌ No coverage report found. Run tests first.")

def main():
    """Main function"""
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "coverage":
            show_test_coverage()
        elif command in ["models", "api", "data"]:
            run_specific_test_category(command)
        elif command == "help":
            print("TrackFlow Test Runner")
            print("=" * 30)
            print("Usage:")
            print("  python run_tests.py              # Run all tests with coverage")
            print("  python run_tests.py models       # Run model tests only")
            print("  python run_tests.py api          # Run API tests only")
            print("  python run_tests.py data         # Run data access tests only")
            print("  python run_tests.py coverage     # Show coverage information")
            print("  python run_tests.py help         # Show this help")
        else:
            print(f"❌ Unknown command: {command}")
            print("Use 'python run_tests.py help' for usage information")
    else:
        # Run all tests by default
        success = run_tests_with_coverage()
        
        if success:
            print("\n🎉 Test suite completed successfully!")
            print("📊 Check htmlcov/index.html for detailed coverage report")
        else:
            print("\n💥 Test suite failed!")
            sys.exit(1)

if __name__ == "__main__":
    main() 