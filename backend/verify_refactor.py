#!/usr/bin/env python3
"""
Verification script to ensure refactoring integrity.
This script validates that the refactored modules maintain the same functionality as the original.
"""

import ast
import os
import sys
import re
import requests
import time
import subprocess
from typing import Dict, List, Set, Optional


class RefactorVerifier:
    def __init__(self):
        self.issues = []
        self.warnings = []
        
    def add_issue(self, message: str):
        """Add a critical issue that breaks functionality"""
        self.issues.append(f"❌ ISSUE: {message}")
        
    def add_warning(self, message: str):
        """Add a warning for potential problems"""
        self.warnings.append(f"⚠️  WARNING: {message}")
        
    def verify_model_attributes(self):
        """Verify all model attributes are used correctly in refactored code"""
        print("🔍 Verifying model attribute usage...")
        
        # Extract model attributes
        models = self._extract_model_attributes()
        
        # Check auth module
        self._check_attribute_usage('api/auth', models)
        self._check_attribute_usage('api/packs', models)
        
        # Check for enum usage issues
        self._check_enum_usage()
        
    def _extract_model_attributes(self) -> Dict[str, List[str]]:
        """Extract all model attributes from models.py"""
        models = {}
        
        if not os.path.exists('models.py'):
            self.add_issue("models.py not found")
            return models
            
        try:
            with open('models.py', 'r') as f:
                tree = ast.parse(f.read())
                
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    attributes = []
                    for item in node.body:
                        if isinstance(item, ast.Assign):
                            for target in item.targets:
                                if isinstance(target, ast.Name):
                                    if (isinstance(item.value, ast.Call) and 
                                        hasattr(item.value.func, 'id') and 
                                        item.value.func.id == 'Column'):
                                        attributes.append(target.id)
                    models[node.name] = attributes
                    
        except Exception as e:
            self.add_issue(f"Failed to parse models.py: {e}")
            
        return models
        
    def _check_attribute_usage(self, module_path: str, models: Dict[str, List[str]]):
        """Check attribute usage in a module"""
        if not os.path.exists(module_path):
            return
            
        for root, dirs, files in os.walk(module_path):
            for file in files:
                if file.endswith('.py') and file != '__init__.py':
                    filepath = os.path.join(root, file)
                    self._check_file_attributes(filepath, models)
                    
    def _check_file_attributes(self, filepath: str, models: Dict[str, List[str]]):
        """Check attribute usage in a specific file"""
        try:
            with open(filepath, 'r') as f:
                content = f.read()
                
            # Check for common attribute patterns
            for model_name, attributes in models.items():
                var_name = model_name.lower()
                
                # Look for var.attribute patterns
                pattern = rf'{var_name}\.(\w+)'
                matches = re.findall(pattern, content)
                
                for attr in matches:
                    if attr not in attributes and attr not in ['id']:  # id is always valid
                        self.add_issue(f"{filepath} uses {var_name}.{attr} but {model_name} model has attributes: {attributes}")
                        
        except Exception as e:
            self.add_warning(f"Could not check {filepath}: {e}")
            
    def _check_enum_usage(self):
        """Check for incorrect enum value usage"""
        # Check for SongStatus enum issues
        song_status_values = ["Released", "In Progress", "Future Plans"]
        
        for root, dirs, files in os.walk('api'):
            for file in files:
                if file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, 'r') as f:
                            content = f.read()
                        
                        # Check for incorrect SongStatus usage
                        if 'SongStatus.COMPLETE' in content:
                            self.add_issue(f"{filepath} uses SongStatus.COMPLETE but valid values are: {song_status_values}")
                        
                        if '"Complete"' in content and 'song.status' in content:
                            self.add_issue(f"{filepath} uses 'Complete' status but valid values are: {song_status_values}")
                            
                    except Exception as e:
                        self.add_warning(f"Could not check enum usage in {filepath}: {e}")
            
    def verify_route_coverage(self):
        """Verify all original routes are covered"""
        print("🔍 Verifying route coverage...")
        
        # Check auth routes (auth_legacy.py has been removed)
        # All auth routes are now in api/auth/
        refactored_routes = []
        
        for root, dirs, files in os.walk('api/auth'):
            for file in files:
                    if file.endswith('.py'):
                        filepath = os.path.join(root, file)
                        refactored_routes.extend(self._extract_routes(filepath))
                        
            missing_routes = set(legacy_routes) - set(refactored_routes)
            if missing_routes:
                for route in missing_routes:
                    self.add_issue(f"Missing auth route: {route}")
                    
        # Check packs routes
        if os.path.exists('api/packs_legacy.py'):
            legacy_routes = self._extract_routes('api/packs_legacy.py')
            refactored_routes = []
            
            for root, dirs, files in os.walk('api/packs'):
                for file in files:
                    if file.endswith('.py'):
                        filepath = os.path.join(root, file)
                        refactored_routes.extend(self._extract_routes(filepath))
                        
            missing_routes = set(legacy_routes) - set(refactored_routes)
            if missing_routes:
                for route in missing_routes:
                    self.add_issue(f"Missing pack route: {route}")
                    
    def _extract_routes(self, filepath: str) -> List[str]:
        """Extract route patterns from a file"""
        routes = []
        try:
            with open(filepath, 'r') as f:
                content = f.read()
                
            # Find router decorators
            patterns = re.findall(r'@\w*router\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']', content)
            routes = [f"{method.upper()} {path}" for method, path in patterns]
            
        except Exception as e:
            self.add_warning(f"Could not extract routes from {filepath}: {e}")
            
        return routes
        
    def verify_imports(self):
        """Verify all imports work correctly"""
        print("🔍 Verifying imports...")
        
        try:
            # Test main imports
            import main
            print("✅ Main module imports successfully")
            
            # Test auth imports  
            from api.auth import router, get_current_active_user
            print("✅ Auth module imports successfully")
            
            # Test packs imports
            from api.packs import router as packs_router, compute_packs_near_completion
            print("✅ Packs module imports successfully")
            
        except ImportError as e:
            self.add_issue(f"Import error: {e}")
        except Exception as e:
            self.add_issue(f"Unexpected error during import: {e}")
            
    def test_basic_endpoints(self, base_url: str = "http://localhost:8001"):
        """Test basic endpoint functionality"""
        print("🔍 Testing basic endpoints...")
        
        test_endpoints = [
            ("GET", "/health"),
            ("GET", "/auth/ping"), 
            ("GET", "/"),
            ("GET", "/packs/near-completion"),  # This should require auth but test the route exists
        ]
        
        for method, endpoint in test_endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{base_url}{endpoint}", timeout=5)
                    if response.status_code not in [200, 401, 403]:  # 401/403 are ok for protected routes
                        self.add_issue(f"{method} {endpoint} returned {response.status_code}")
                    else:
                        print(f"✅ {method} {endpoint} responds correctly ({response.status_code})")
            except requests.exceptions.RequestException as e:
                self.add_warning(f"Could not test {method} {endpoint}: {e}")
                
    def run_verification(self, test_server: bool = False):
        """Run all verification checks"""
        print("🔧 Running refactor verification...\n")
        
        self.verify_model_attributes()
        self.verify_route_coverage() 
        self.verify_imports()
        
        if test_server:
            print("\n🌐 Testing server endpoints...")
            self.test_basic_endpoints()
            
        print("\n" + "="*60)
        print("VERIFICATION RESULTS")
        print("="*60)
        
        if self.issues:
            print("\n❌ CRITICAL ISSUES FOUND:")
            for issue in self.issues:
                print(f"  {issue}")
                
        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for warning in self.warnings:
                print(f"  {warning}")
                
        if not self.issues and not self.warnings:
            print("\n✅ ALL CHECKS PASSED - Refactor appears to be intact!")
        elif not self.issues:
            print(f"\n✅ NO CRITICAL ISSUES - {len(self.warnings)} warnings found")
        else:
            print(f"\n❌ {len(self.issues)} critical issues found that need fixing")
            
        return len(self.issues) == 0


if __name__ == "__main__":
    verifier = RefactorVerifier()
    
    # Check if server testing is requested
    test_server = "--test-server" in sys.argv
    
    success = verifier.run_verification(test_server)
    sys.exit(0 if success else 1)