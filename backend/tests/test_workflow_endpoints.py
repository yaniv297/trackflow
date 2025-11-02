import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime
from main import app
from database import get_db
from models import User, Song, SongProgress, UserWorkflow, UserWorkflowStep
from auth import get_current_user
import json

client = TestClient(app)

# Mock database
@pytest.fixture
def mock_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from models import Base
    
    engine = create_engine("sqlite:///./test_workflows.db")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Clean up
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_user(mock_db):
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password="hashed_password"
    )
    mock_db.add(user)
    mock_db.commit()
    mock_db.refresh(user)
    return user

@pytest.fixture
def authenticated_client(test_user, mock_db):
    def override_get_db():
        return mock_db
    
    def override_get_current_user():
        return test_user
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    yield client
    
    app.dependency_overrides.clear()

class TestWorkflowTemplates:
    def test_create_workflow_template(self, authenticated_client, test_user):
        template_data = {
            "name": "Test Workflow",
            "description": "A test workflow template",
            "definition": {
                "steps": [
                    {
                        "id": "1",
                        "name": "Initial Step",
                        "type": "task",
                        "description": "First step"
                    },
                    {
                        "id": "2", 
                        "name": "Review Step",
                        "type": "review",
                        "description": "Review step"
                    }
                ],
                "connections": [{"from": "1", "to": "2"}]
            }
        }
        
        response = authenticated_client.post("/workflows/templates", json=template_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Test Workflow"
        assert data["user_id"] == test_user.id
        assert "id" in data

    def test_get_workflow_templates(self, authenticated_client, mock_db, test_user):
        # Create test templates
        template1 = WorkflowTemplate(
            name="Template 1",
            description="First template",
            definition={"steps": []},
            user_id=test_user.id
        )
        template2 = WorkflowTemplate(
            name="Template 2", 
            description="Second template",
            definition={"steps": []},
            user_id=test_user.id
        )
        mock_db.add_all([template1, template2])
        mock_db.commit()
        
        response = authenticated_client.get("/workflows/templates")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] in ["Template 1", "Template 2"]

    def test_get_workflow_template_by_id(self, authenticated_client, mock_db, test_user):
        template = WorkflowTemplate(
            name="Test Template",
            description="Test description",
            definition={"steps": [{"id": "1", "name": "Step 1"}]},
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        response = authenticated_client.get(f"/workflows/templates/{template.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Test Template"
        assert data["id"] == template.id

    def test_update_workflow_template(self, authenticated_client, mock_db, test_user):
        template = WorkflowTemplate(
            name="Original Name",
            description="Original description",
            definition={"steps": []},
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        update_data = {
            "name": "Updated Name",
            "description": "Updated description"
        }
        
        response = authenticated_client.put(f"/workflows/templates/{template.id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["description"] == "Updated description"

    def test_delete_workflow_template(self, authenticated_client, mock_db, test_user):
        template = WorkflowTemplate(
            name="To Delete",
            description="Will be deleted",
            definition={"steps": []},
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        response = authenticated_client.delete(f"/workflows/templates/{template.id}")
        assert response.status_code == 204
        
        # Verify deletion
        response = authenticated_client.get(f"/workflows/templates/{template.id}")
        assert response.status_code == 404

class TestWorkflowInstances:
    def test_create_workflow_instance(self, authenticated_client, mock_db, test_user):
        # Create template first
        template = WorkflowTemplate(
            name="Test Template",
            description="Test template",
            definition={
                "steps": [
                    {"id": "1", "name": "Step 1", "type": "task"},
                    {"id": "2", "name": "Step 2", "type": "review"}
                ]
            },
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        instance_data = {
            "template_id": template.id,
            "name": "Test Instance",
            "context": {"project": "Test Project"}
        }
        
        response = authenticated_client.post("/workflows/instances", json=instance_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Test Instance"
        assert data["template_id"] == template.id
        assert data["status"] == "active"

    def test_get_workflow_instances(self, authenticated_client, mock_db, test_user):
        template = WorkflowTemplate(
            name="Template",
            description="Template",
            definition={"steps": []},
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        instance = WorkflowInstance(
            template_id=template.id,
            name="Test Instance",
            status="active",
            context={},
            user_id=test_user.id
        )
        mock_db.add(instance)
        mock_db.commit()
        
        response = authenticated_client.get("/workflows/instances")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        assert any(inst["name"] == "Test Instance" for inst in data)

    def test_update_workflow_instance_status(self, authenticated_client, mock_db, test_user):
        template = WorkflowTemplate(
            name="Template",
            description="Template", 
            definition={"steps": []},
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        instance = WorkflowInstance(
            template_id=template.id,
            name="Test Instance",
            status="active",
            context={},
            user_id=test_user.id
        )
        mock_db.add(instance)
        mock_db.commit()
        mock_db.refresh(instance)
        
        response = authenticated_client.patch(
            f"/workflows/instances/{instance.id}/status",
            json={"status": "completed"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"

class TestWorkflowTasks:
    def test_create_workflow_task(self, authenticated_client, mock_db, test_user):
        template = WorkflowTemplate(
            name="Template",
            description="Template",
            definition={"steps": []},
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        instance = WorkflowInstance(
            template_id=template.id,
            name="Instance",
            status="active",
            context={},
            user_id=test_user.id
        )
        mock_db.add(instance)
        mock_db.commit()
        mock_db.refresh(instance)
        
        task_data = {
            "workflow_instance_id": instance.id,
            "step_id": "1",
            "name": "Test Task",
            "description": "Test task description",
            "assignee_id": test_user.id
        }
        
        response = authenticated_client.post("/workflows/tasks", json=task_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Test Task"
        assert data["status"] == "pending"

    def test_update_task_status(self, authenticated_client, mock_db, test_user):
        template = WorkflowTemplate(
            name="Template",
            description="Template",
            definition={"steps": []},
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        instance = WorkflowInstance(
            template_id=template.id,
            name="Instance",
            status="active",
            context={},
            user_id=test_user.id
        )
        mock_db.add(instance)
        mock_db.commit()
        mock_db.refresh(instance)
        
        task = WorkflowTask(
            workflow_instance_id=instance.id,
            step_id="1",
            name="Test Task",
            description="Test description",
            status="pending",
            assignee_id=test_user.id
        )
        mock_db.add(task)
        mock_db.commit()
        mock_db.refresh(task)
        
        response = authenticated_client.patch(
            f"/workflows/tasks/{task.id}/status",
            json={"status": "completed"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"

    def test_get_user_tasks(self, authenticated_client, mock_db, test_user):
        template = WorkflowTemplate(
            name="Template",
            description="Template",
            definition={"steps": []},
            user_id=test_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        instance = WorkflowInstance(
            template_id=template.id,
            name="Instance",
            status="active",
            context={},
            user_id=test_user.id
        )
        mock_db.add(instance)
        mock_db.commit()
        mock_db.refresh(instance)
        
        task = WorkflowTask(
            workflow_instance_id=instance.id,
            step_id="1",
            name="User Task",
            description="Task for user",
            status="pending",
            assignee_id=test_user.id
        )
        mock_db.add(task)
        mock_db.commit()
        
        response = authenticated_client.get("/workflows/tasks/my-tasks")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        assert any(task["name"] == "User Task" for task in data)

class TestWorkflowValidation:
    def test_invalid_workflow_definition(self, authenticated_client):
        template_data = {
            "name": "Invalid Workflow",
            "description": "Invalid workflow template",
            "definition": {
                "steps": [
                    {"id": "1", "name": "Step 1"}  # Missing required fields
                ]
            }
        }
        
        response = authenticated_client.post("/workflows/templates", json=template_data)
        assert response.status_code == 422

    def test_duplicate_step_ids(self, authenticated_client):
        template_data = {
            "name": "Duplicate Steps",
            "description": "Workflow with duplicate step IDs",
            "definition": {
                "steps": [
                    {"id": "1", "name": "Step 1", "type": "task"},
                    {"id": "1", "name": "Step 2", "type": "task"}  # Duplicate ID
                ]
            }
        }
        
        response = authenticated_client.post("/workflows/templates", json=template_data)
        assert response.status_code == 400

    def test_invalid_connections(self, authenticated_client):
        template_data = {
            "name": "Invalid Connections",
            "description": "Workflow with invalid connections",
            "definition": {
                "steps": [
                    {"id": "1", "name": "Step 1", "type": "task"}
                ],
                "connections": [
                    {"from": "1", "to": "2"}  # Step 2 doesn't exist
                ]
            }
        }
        
        response = authenticated_client.post("/workflows/templates", json=template_data)
        assert response.status_code == 400

class TestWorkflowAuthorization:
    def test_cannot_access_other_user_template(self, authenticated_client, mock_db):
        # Create another user
        other_user = User(
            username="otheruser",
            email="other@example.com", 
            hashed_password="hashed_password"
        )
        mock_db.add(other_user)
        mock_db.commit()
        mock_db.refresh(other_user)
        
        # Create template for other user
        template = WorkflowTemplate(
            name="Other User Template",
            description="Template by other user",
            definition={"steps": []},
            user_id=other_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        response = authenticated_client.get(f"/workflows/templates/{template.id}")
        assert response.status_code == 404

    def test_cannot_modify_other_user_template(self, authenticated_client, mock_db):
        other_user = User(
            username="otheruser",
            email="other@example.com",
            hashed_password="hashed_password"
        )
        mock_db.add(other_user)
        mock_db.commit()
        mock_db.refresh(other_user)
        
        template = WorkflowTemplate(
            name="Other User Template",
            description="Template by other user",
            definition={"steps": []},
            user_id=other_user.id
        )
        mock_db.add(template)
        mock_db.commit()
        mock_db.refresh(template)
        
        response = authenticated_client.put(
            f"/workflows/templates/{template.id}",
            json={"name": "Hacked Template"}
        )
        assert response.status_code == 404

class TestWorkflowStepAddition:
    def test_adding_step_to_completed_new_system_song(self, authenticated_client, mock_db, test_user):
        """Test that songs completed via new workflow system get new steps auto-marked complete"""
        
        # Create a workflow with 2 steps
        workflow = UserWorkflow(
            user_id=test_user.id,
            name="Test Workflow",
            description="Test workflow"
        )
        mock_db.add(workflow)
        mock_db.commit()
        mock_db.refresh(workflow)
        
        # Add steps to workflow
        step1 = UserWorkflowStep(
            workflow_id=workflow.id,
            step_name="step1",
            display_name="Step 1",
            order_index=0
        )
        step2 = UserWorkflowStep(
            workflow_id=workflow.id,
            step_name="step2", 
            display_name="Step 2",
            order_index=1
        )
        mock_db.add_all([step1, step2])
        mock_db.commit()
        
        # Create a song
        song = Song(
            title="Test Song",
            artist="Test Artist",
            pack="Test Pack",
            status="WIP",
            user_id=test_user.id
        )
        mock_db.add(song)
        mock_db.commit()
        mock_db.refresh(song)
        
        # Mark all current steps as completed in song_progress
        progress1 = SongProgress(
            song_id=song.id,
            step_name="step1",
            is_completed=True,
            completed_at=datetime.utcnow()
        )
        progress2 = SongProgress(
            song_id=song.id,
            step_name="step2", 
            is_completed=True,
            completed_at=datetime.utcnow()
        )
        mock_db.add_all([progress1, progress2])
        mock_db.commit()
        
        # Now add a third step to the workflow
        update_data = {
            "steps": [
                {"step_name": "step1", "display_name": "Step 1", "order_index": 0},
                {"step_name": "step2", "display_name": "Step 2", "order_index": 1},
                {"step_name": "step3", "display_name": "Step 3", "order_index": 2}  # New step
            ]
        }
        
        response = authenticated_client.put("/workflows/my-workflow", json=update_data)
        assert response.status_code == 200
        
        # Verify the new step was auto-marked complete for the completed song
        new_progress = mock_db.query(SongProgress).filter(
            SongProgress.song_id == song.id,
            SongProgress.step_name == "step3"
        ).first()
        
        assert new_progress is not None
        assert new_progress.is_completed == True
        assert new_progress.completed_at is not None

    def test_adding_step_to_incomplete_new_system_song(self, authenticated_client, mock_db, test_user):
        """Test that songs incomplete via new workflow system get new steps marked incomplete"""
        
        # Create same setup as above but don't complete step2
        workflow = UserWorkflow(
            user_id=test_user.id,
            name="Test Workflow", 
            description="Test workflow"
        )
        mock_db.add(workflow)
        mock_db.commit()
        mock_db.refresh(workflow)
        
        step1 = UserWorkflowStep(
            workflow_id=workflow.id,
            step_name="step1",
            display_name="Step 1", 
            order_index=0
        )
        step2 = UserWorkflowStep(
            workflow_id=workflow.id,
            step_name="step2",
            display_name="Step 2",
            order_index=1
        )
        mock_db.add_all([step1, step2])
        mock_db.commit()
        
        song = Song(
            title="Incomplete Song",
            artist="Test Artist", 
            pack="Test Pack",
            status="WIP",
            user_id=test_user.id
        )
        mock_db.add(song)
        mock_db.commit()
        mock_db.refresh(song)
        
        # Only complete step1, leave step2 incomplete
        progress1 = SongProgress(
            song_id=song.id,
            step_name="step1",
            is_completed=True,
            completed_at=datetime.utcnow()
        )
        progress2 = SongProgress(
            song_id=song.id,
            step_name="step2",
            is_completed=False  # Incomplete!
        )
        mock_db.add_all([progress1, progress2])
        mock_db.commit()
        
        # Add third step
        update_data = {
            "steps": [
                {"step_name": "step1", "display_name": "Step 1", "order_index": 0},
                {"step_name": "step2", "display_name": "Step 2", "order_index": 1}, 
                {"step_name": "step3", "display_name": "Step 3", "order_index": 2}
            ]
        }
        
        response = authenticated_client.put("/workflows/my-workflow", json=update_data)
        assert response.status_code == 200
        
        # Verify the new step was NOT auto-completed (song isn't fully done)
        new_progress = mock_db.query(SongProgress).filter(
            SongProgress.song_id == song.id,
            SongProgress.step_name == "step3"
        ).first()
        
        # New step should either not exist or be marked incomplete
        if new_progress:
            assert new_progress.is_completed == False