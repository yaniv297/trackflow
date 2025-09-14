# New models for Custom Workflows feature
# This will eventually be merged into models.py

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class WorkflowTemplate(Base):
    """
    Predefined workflow templates that users can choose from or customize
    """
    __tablename__ = "workflow_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)  # e.g., "Standard Rock Band", "Producer Workflow", "Minimal"
    description = Column(Text)
    is_default = Column(Boolean, default=False)  # The default template for new users
    is_system = Column(Boolean, default=True)   # System templates (can't be deleted)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    steps = relationship("WorkflowTemplateStep", back_populates="template", cascade="all, delete-orphan")

class WorkflowTemplateStep(Base):
    """
    Individual steps within a workflow template
    """
    __tablename__ = "workflow_template_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=False, index=True)
    step_name = Column(String, nullable=False)  # e.g., "drums", "bass", "vocals", "preview_video"
    display_name = Column(String, nullable=False)  # e.g., "Drums", "Bass", "Vocals", "Preview Video"
    description = Column(Text)  # Optional description for the step
    order_index = Column(Integer, nullable=False)  # Order within the workflow (0, 1, 2, ...)
    is_required = Column(Boolean, default=True)  # Whether this step is required for completion
    category = Column(String)  # Optional category like "tracking", "mixing", "authoring"
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_template_step_order', 'template_id', 'order_index'),
        UniqueConstraint('template_id', 'step_name', name='uq_template_step_name'),
        UniqueConstraint('template_id', 'order_index', name='uq_template_step_order'),
    )
    
    # Relationships
    template = relationship("WorkflowTemplate", back_populates="steps")

class UserWorkflow(Base):
    """
    User's customized workflow (based on a template but can be modified)
    """
    __tablename__ = "user_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)  # User's custom name for their workflow
    description = Column(Text)
    template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=True)  # Original template
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # user = relationship("User", back_populates="workflow")  # Will add to User model
    template = relationship("WorkflowTemplate")
    steps = relationship("UserWorkflowStep", back_populates="workflow", cascade="all, delete-orphan")

class UserWorkflowStep(Base):
    """
    Individual steps in a user's customized workflow
    """
    __tablename__ = "user_workflow_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("user_workflows.id"), nullable=False, index=True)
    step_name = Column(String, nullable=False)  # e.g., "drums", "bass", "vocals", "preview_video"
    display_name = Column(String, nullable=False)  # e.g., "Drums", "Bass", "Vocals", "Preview Video"
    description = Column(Text)
    order_index = Column(Integer, nullable=False)  # Order within the workflow
    is_required = Column(Boolean, default=True)
    category = Column(String)
    is_enabled = Column(Boolean, default=True)  # User can temporarily disable steps
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_workflow_step_order', 'workflow_id', 'order_index'),
        UniqueConstraint('workflow_id', 'step_name', name='uq_workflow_step_name'),
        UniqueConstraint('workflow_id', 'order_index', name='uq_workflow_step_order'),
    )
    
    # Relationships
    workflow = relationship("UserWorkflow", back_populates="steps")

class SongProgress(Base):
    """
    Dynamic progress tracking for songs based on user's workflow
    Replaces the old fixed Authoring table
    """
    __tablename__ = "song_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False, index=True)
    step_name = Column(String, nullable=False)  # The workflow step name
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text)  # Optional notes for this step
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_song_progress_lookup', 'song_id', 'step_name'),
        UniqueConstraint('song_id', 'step_name', name='uq_song_step_progress'),
    )
    
    # Relationships
    # song = relationship("Song", back_populates="progress")  # Will add to Song model

# Migration strategy:
# 1. Create new tables
# 2. Populate default workflow templates
# 3. Create user workflows for existing users based on current system
# 4. Migrate existing authoring data to song_progress
# 5. Update frontend to use dynamic workflows
# 6. Remove old Authoring table after successful migration

"""
Default workflow templates to be inserted:

1. "Standard Rock Band" (default=True):
   - demucs, midi, tempo_map, fake_ending, drums, bass, guitar, vocals, 
   - harmonies, pro_keys, keys, animations, drum_fills, overdrive, compile

2. "Producer Workflow":
   - demucs, midi, tempo_map, drums, bass, guitar, vocals, mixing, mastering, compile

3. "Minimal Workflow":
   - drums, bass, guitar, vocals, compile

4. "Full Production":
   - demucs, midi, tempo_map, fake_ending, drums, bass, guitar, vocals,
   - harmonies, pro_keys, keys, animations, drum_fills, overdrive, 
   - preview_video, venue_authoring, compile

5. "Collaboration Friendly":
   - stems_preparation, drums, bass, guitar, vocals, harmonies, 
   - mixing_notes, final_review, compile
"""

