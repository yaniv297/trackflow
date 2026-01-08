# Pydantic schemas for Custom Workflows feature

from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import datetime

# Simplified schemas - no workflow templates needed

# User Workflow Schemas
class UserWorkflowStepBase(BaseModel):
    step_name: str
    display_name: str
    description: Optional[str] = None
    order_index: int
    is_required: bool = True
    category: Optional[str] = None
    is_enabled: bool = True

class UserWorkflowStepCreate(UserWorkflowStepBase):
    pass

class UserWorkflowStepUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_required: Optional[bool] = None
    category: Optional[str] = None
    is_enabled: Optional[bool] = None

class UserWorkflowStepOut(UserWorkflowStepBase):
    id: int
    workflow_id: int
    
    class Config:
        from_attributes = True

class UserWorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None

class UserWorkflowCreate(UserWorkflowBase):
    template_id: Optional[int] = None  # Can be None for completely custom workflows
    steps: Optional[List[UserWorkflowStepCreate]] = None  # If None, copy from template

class UserWorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[UserWorkflowStepCreate]] = None
    
    @validator('steps')
    def validate_steps(cls, v):
        if v is not None:
            if not v:
                raise ValueError('Workflow must have at least one step')
            
            # Check for duplicate order_index
            order_indices = [step.order_index for step in v]
            if len(order_indices) != len(set(order_indices)):
                raise ValueError('Step order indices must be unique')
            
            # Check for duplicate step_names
            step_names = [step.step_name for step in v]
            if len(step_names) != len(set(step_names)):
                raise ValueError('Step names must be unique within a workflow')
        
        return v

class UserWorkflowOut(UserWorkflowBase):
    id: int
    user_id: int
    template_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    steps: List[UserWorkflowStepOut]
    
    class Config:
        from_attributes = True

# Song Progress Schemas
class SongProgressBase(BaseModel):
    step_name: str
    is_completed: bool = False
    is_irrelevant: bool = False  # Step is N/A for this song (e.g., no keys part)
    notes: Optional[str] = None

class SongProgressCreate(SongProgressBase):
    song_id: int

class SongProgressUpdate(BaseModel):
    is_completed: Optional[bool] = None
    is_irrelevant: Optional[bool] = None
    notes: Optional[str] = None

class SongProgressOut(SongProgressBase):
    id: int
    song_id: int
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Schema for updating irrelevant steps
class IrrelevantStepsUpdate(BaseModel):
    """Update which steps are marked as irrelevant for a song"""
    irrelevant_steps: List[str]  # List of step_names to mark as irrelevant

# Combined schemas for API responses
class SongWithProgress(BaseModel):
    """Song data with its progress based on owner's workflow"""
    id: int
    title: str
    artist: str
    album: str
    status: str
    user_id: int
    pack_name: Optional[str] = None
    progress: List[SongProgressOut]  # Dynamic progress based on song owner's workflow
    completion_percentage: int  # Calculated based on workflow steps
    
    class Config:
        from_attributes = True

class WorkflowSummary(BaseModel):
    """Summary of a user's workflow for quick display"""
    id: int
    name: str
    total_steps: int
    required_steps: int
    enabled_steps: int
    template_name: Optional[str] = None  # Name of the template it was based on
    
    class Config:
        from_attributes = True

# API Request/Response models
class BulkProgressUpdate(BaseModel):
    """For updating multiple steps at once"""
    song_id: int
    updates: List[SongProgressUpdate]

# No migration request needed - just reset to default
