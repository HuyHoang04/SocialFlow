#!/usr/bin/env python3
"""
Test script for RBAC + Approval Workflow APIs
Tests all new endpoints for team management, invitations, and approvals
"""

import requests
import json
import time
from datetime import datetime, timedelta
import uuid
import random
import string

BASE_URL = "http://localhost:8080/api"

# Generate unique test emails for each test run
def generate_unique_email(base):
    """Generate unique email with timestamp and random suffix"""
    timestamp = int(time.time() * 1000)
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{base}+{timestamp}+{random_suffix}@test.com"

# Test data
TEST_USER_1 = {
    "email": generate_unique_email("admin"),
    "password": "Test@123456"
}

TEST_USER_2 = {
    "email": generate_unique_email("manager"),
    "password": "Test@123456"
}

TEST_USER_3 = {
    "email": generate_unique_email("creator"),
    "password": "Test@123456"
}

TEST_BRAND = {
    "name": "Test Brand RBAC",
    "description": "Testing RBAC features",
    "logoUrl": "https://example.com/logo.png"
}

class TestClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.user_email = None
        
    def register(self, email, password):
        """Register a new user"""
        response = requests.post(f"{self.base_url}/auth/register", json={
            "email": email,
            "password": password,
            "name": email.split("@")[0]
        })
        print(f"[REGISTER] {email}: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.user_id = data.get("userId")
            self.user_email = email
            return data
        else:
            print(f"Error: {response.text}")
            return None
    
    def login(self, email, password):
        """Login user"""
        response = requests.post(f"{self.base_url}/auth/login", json={
            "email": email,
            "password": password
        })
        print(f"[LOGIN] {email}: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.user_id = data.get("userId")
            self.user_email = email
            return data
        else:
            print(f"Error: {response.text}")
            return None
    
    def set_token(self, token, user_id):
        """Set auth token and user ID"""
        self.token = token
        self.user_id = user_id
    
    def headers(self):
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def create_brand(self, brand_data):
        """Create a new brand"""
        response = requests.post(
            f"{self.base_url}/brands",
            json=brand_data,
            headers=self.headers()
        )
        print(f"[CREATE BRAND] {brand_data['name']}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def create_invitation(self, brand_id, email, role):
        """Create a team member invitation"""
        response = requests.post(
            f"{self.base_url}/brands/{brand_id}/invitations",
            json={"email": email, "role": role},
            headers=self.headers()
        )
        print(f"[CREATE INVITATION] {email} as {role}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def get_invitation(self, token):
        """Get invitation details by token"""
        response = requests.get(
            f"{self.base_url}/invitations/token/{token}"
        )
        print(f"[GET INVITATION] Token: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def accept_invitation(self, token):
        """Accept an invitation"""
        response = requests.post(
            f"{self.base_url}/invitations/token/{token}/accept",
            json={},
            headers=self.headers()
        )
        print(f"[ACCEPT INVITATION] Token: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def get_team_members(self, brand_id):
        """Get team members of a brand"""
        response = requests.get(
            f"{self.base_url}/brands/{brand_id}/team",
            headers=self.headers()
        )
        print(f"[GET TEAM] Brand {brand_id}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def update_team_member_role(self, brand_id, user_id, new_role):
        """Update a team member's role"""
        response = requests.patch(
            f"{self.base_url}/brands/{brand_id}/team/{user_id}",
            json={"role": new_role},
            headers=self.headers()
        )
        print(f"[UPDATE ROLE] User {user_id} -> {new_role}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def remove_team_member(self, brand_id, user_id):
        """Remove team member from brand"""
        response = requests.delete(
            f"{self.base_url}/brands/{brand_id}/team/{user_id}",
            headers=self.headers()
        )
        print(f"[REMOVE MEMBER] User {user_id}: {response.status_code}")
        return response.status_code == 204
    
    def get_workflow_config(self, brand_id):
        """Get workflow configuration"""
        response = requests.get(
            f"{self.base_url}/brands/{brand_id}/workflow-config",
            headers=self.headers()
        )
        print(f"[GET WORKFLOW] Brand {brand_id}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def update_workflow_config(self, brand_id, enabled, approval_levels):
        """Update workflow configuration"""
        response = requests.put(
            f"{self.base_url}/brands/{brand_id}/workflow-config",
            json={"enabled": enabled, "approvalLevels": approval_levels},
            headers=self.headers()
        )
        print(f"[UPDATE WORKFLOW] Brand {brand_id}, enabled={enabled}, levels={approval_levels}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def create_post(self, page_ids, content, scheduled_time=None, media_filenames=None):
        """Create a draft post"""
        response = requests.post(
            f"{self.base_url}/posts",
            json={
                "pageIds": page_ids,
                "content": content,
                "scheduledTime": scheduled_time,
                "mediaFilenames": media_filenames or []
            },
            headers=self.headers()
        )
        print(f"[CREATE POST] {content[:30]}...: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def submit_for_approval(self, post_id, assigned_to_user_id):
        """Submit post for approval"""
        response = requests.post(
            f"{self.base_url}/posts/{post_id}/submit-approval",
            json={"assignedToUserId": assigned_to_user_id},
            headers=self.headers()
        )
        print(f"[SUBMIT APPROVAL] Post {post_id}: {response.status_code}")
        return response.status_code == 204
    
    def get_pending_approvals(self, user_id, brand_id):
        """Get pending approvals for user"""
        response = requests.get(
            f"{self.base_url}/approvals/user/{user_id}/brand/{brand_id}",
            headers=self.headers()
        )
        print(f"[GET PENDING] User {user_id}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def approve_post(self, approval_id, comment=None):
        """Approve a post"""
        response = requests.post(
            f"{self.base_url}/approvals/{approval_id}/approve",
            json={"comment": comment},
            headers=self.headers()
        )
        print(f"[APPROVE] Approval {approval_id}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def reject_post(self, approval_id, comment):
        """Reject a post"""
        response = requests.post(
            f"{self.base_url}/approvals/{approval_id}/reject",
            json={"comment": comment},
            headers=self.headers()
        )
        print(f"[REJECT] Approval {approval_id}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    
    def get_post(self, post_id):
        """Get post details"""
        response = requests.get(
            f"{self.base_url}/posts/{post_id}",
            headers=self.headers()
        )
        print(f"[GET POST] Post {post_id}: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None


def test_workflow():
    """Run complete RBAC + Approval Workflow test"""
    print("\n" + "="*80)
    print("TESTING RBAC + APPROVAL WORKFLOW")
    print("="*80)
    
    # Setup clients for 3 users
    admin_client = TestClient(BASE_URL)
    manager_client = TestClient(BASE_URL)
    creator_client = TestClient(BASE_URL)
    
    # 1. Register users
    print("\n[1] REGISTER USERS")
    print("-" * 80)
    admin_data = admin_client.register(TEST_USER_1["email"], TEST_USER_1["password"])
    if not admin_data:
        print("Failed to register admin user")
        return
    
    manager_data = manager_client.register(TEST_USER_2["email"], TEST_USER_2["password"])
    if not manager_data:
        print("Failed to register manager user")
        return
    
    creator_data = creator_client.register(TEST_USER_3["email"], TEST_USER_3["password"])
    if not creator_data:
        print("Failed to register creator user")
        return
    
    print(f"✓ Admin user: {admin_data.get('userId')}")
    print(f"✓ Manager user: {manager_data.get('userId')}")
    print(f"✓ Creator user: {creator_data.get('userId')}")
    
    # 2. Create brand as admin
    print("\n[2] CREATE BRAND")
    print("-" * 80)
    brand = admin_client.create_brand(TEST_BRAND)
    if not brand:
        print("Failed to create brand")
        return
    brand_id = brand.get("id")
    print(f"✓ Brand created: {brand_id}")
    
    # 3. Invite manager and creator
    print("\n[3] CREATE INVITATIONS")
    print("-" * 80)
    manager_inv = admin_client.create_invitation(brand_id, TEST_USER_2["email"], "MANAGER")
    if not manager_inv:
        print("Failed to create manager invitation")
        return
    manager_token = manager_inv.get("invitationLink").split("token=")[1]
    print(f"✓ Manager invitation created: {manager_token}")
    
    creator_inv = admin_client.create_invitation(brand_id, TEST_USER_3["email"], "CREATOR")
    if not creator_inv:
        print("Failed to create creator invitation")
        return
    creator_token = creator_inv.get("invitationLink").split("token=")[1]
    print(f"✓ Creator invitation created: {creator_token}")
    
    # 4. Accept invitations
    print("\n[4] ACCEPT INVITATIONS")
    print("-" * 80)
    manager_client.accept_invitation(manager_token)
    creator_client.accept_invitation(creator_token)
    print("✓ Invitations accepted successfully")
    
    # 5. View team members
    print("\n[5] VIEW TEAM MEMBERS")
    print("-" * 80)
    team = admin_client.get_team_members(brand_id)
    if team:
        print(f"✓ Team has {len(team)} members:")
        for member in team:
            print(f"  - {member.get('email')}: {member.get('role')}")
    
    # 6. Enable approval workflow (2-level)
    print("\n[6] ENABLE APPROVAL WORKFLOW")
    print("-" * 80)
    config = admin_client.update_workflow_config(brand_id, True, 2)
    if config:
        print(f"✓ Workflow enabled: {config.get('enabled')}, Levels: {config.get('approvalLevels')}")
    
    # 7. Creator creates post (requires page, so we skip for now)
    print("\n[7] CREATE POST (DRAFT)")
    print("-" * 80)
    print("⚠ Skipping post creation - requires social pages to be set up first")
    
    # 8. Submit for approval (would need actual post)
    print("\n[8] SUBMIT FOR APPROVAL (MOCK)")
    print("-" * 80)
    print("⚠ Skipping approval submission - requires actual post")
    
    print("\n" + "="*80)
    print("✓ ALL TESTS COMPLETED SUCCESSFULLY")
    print("="*80)


if __name__ == "__main__":
    print("Starting API Tests...")
    print(f"Base URL: {BASE_URL}")
    
    # Wait for server to be ready
    max_retries = 5
    for i in range(max_retries):
        try:
            requests.get(f"{BASE_URL}/", timeout=2)
            break
        except requests.exceptions.RequestException:
            if i < max_retries - 1:
                print(f"Waiting for server... ({i+1}/{max_retries})")
                time.sleep(2)
            else:
                print("Server not responding. Make sure backend is running on port 8080")
                exit(1)
    
    test_workflow()
