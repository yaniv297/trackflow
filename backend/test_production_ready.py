#!/usr/bin/env python3
"""
Test script to verify production readiness for forgot password functionality
"""

import sys
import os

def test_imports():
    """Test that all required modules can be imported"""
    print("🔄 Testing imports...")
    
    try:
        from models import PasswordResetToken
        print("✅ PasswordResetToken model imported successfully")
    except Exception as e:
        print(f"❌ Failed to import PasswordResetToken: {e}")
        return False
    
    try:
        from email_service import send_password_reset_email, is_email_configured
        print("✅ Email service imported successfully")
    except Exception as e:
        print(f"❌ Failed to import email service: {e}")
        return False
    
    try:
        from api.auth import ForgotPasswordRequest, ResetPasswordRequest
        print("✅ Auth request models imported successfully")
    except Exception as e:
        print(f"❌ Failed to import auth request models: {e}")
        return False
    
    return True

def test_env_vars():
    """Test environment variables"""
    print("\n🔄 Testing environment variables...")
    
    required_vars = [
        'EMAIL_USERNAME', 'EMAIL_PASSWORD', 'EMAIL_FROM', 
        'EMAIL_FROM_NAME', 'EMAIL_SERVER', 'EMAIL_PORT', 'FRONTEND_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {'*' * len(value) if 'PASSWORD' in var else value}")
        else:
            print(f"❌ {var}: Missing")
            missing_vars.append(var)
    
    return len(missing_vars) == 0

def test_database_table():
    """Test if password_reset_tokens table exists"""
    print("\n🔄 Testing database table...")
    
    try:
        from sqlalchemy import create_engine, text
        from database import SQLALCHEMY_DATABASE_URL
        
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            if "sqlite" in SQLALCHEMY_DATABASE_URL.lower():
                result = conn.execute(text(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens';"
                ))
            else:
                result = conn.execute(text(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'password_reset_tokens');"
                ))
            
            table_exists = bool(result.fetchone())
            
            if table_exists:
                print("✅ password_reset_tokens table exists")
                return True
            else:
                print("❌ password_reset_tokens table does not exist")
                return False
                
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def main():
    print("🚀 Production Readiness Test for Forgot Password")
    print("=" * 50)
    
    all_tests_passed = True
    
    all_tests_passed &= test_imports()
    all_tests_passed &= test_env_vars() 
    all_tests_passed &= test_database_table()
    
    print("\n" + "=" * 50)
    if all_tests_passed:
        print("✅ All tests passed! Ready for production")
    else:
        print("❌ Some tests failed. Check the issues above")
    
    return all_tests_passed

if __name__ == "__main__":
    sys.exit(0 if main() else 1)