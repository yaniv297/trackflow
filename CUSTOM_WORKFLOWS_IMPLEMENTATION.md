# Custom Workflows Implementation Guide

This document outlines the complete implementation of the Custom Workflows feature for TrackFlow.

## 🎯 Overview

The Custom Workflows feature allows users to:

- **Customize their authoring workflow** from the settings page
- **Add, remove, and reorder workflow steps**
- **Choose from predefined templates** or create completely custom workflows
- **View songs with progress based on the song owner's workflow** (for collaborations)
- **Migrate existing data** from the old static system

## 📊 Database Schema Changes

### New Tables

1. **`workflow_templates`** - System-provided workflow templates

   - Stores predefined workflows like "Standard Rock Band", "Producer Workflow", etc.

2. **`workflow_template_steps`** - Steps within templates

   - Defines the steps for each template with order, display names, categories

3. **`user_workflows`** - User's customized workflows

   - Each user has one workflow, customizable from settings

4. **`user_workflow_steps`** - Steps in user's workflow

   - User's personalized steps with custom ordering and enabling/disabling

5. **`song_progress`** - Dynamic progress tracking
   - Replaces the old fixed `authoring` table with flexible step tracking

### Migration Strategy

The migration preserves all existing data:

```bash
# Run the migration script
cd trackflow/backend
python migrations/custom_workflows_migration.py
```

**Migration Process:**

1. Creates new workflow tables
2. Populates default templates (Standard Rock Band, Producer, Minimal, etc.)
3. Creates user workflows for all existing users based on default template
4. Migrates existing `authoring` data to `song_progress` table
5. Verifies data integrity

## 🔧 Backend Implementation

### Models (`workflow_models.py`)

- New SQLAlchemy models for workflow system
- Relationships between templates, user workflows, and song progress
- Proper indexing for performance

### API Endpoints (`api/workflows.py`)

- **`GET /workflows/templates`** - Get available templates
- **`GET /workflows/my-workflow`** - Get user's current workflow
- **`PUT /workflows/my-workflow`** - Update user's workflow
- **`POST /workflows/migrate-to-template`** - Migrate to a different template
- **`GET /workflows/songs/{song_id}/progress`** - Get song progress
- **`PUT /workflows/songs/{song_id}/progress/{step_name}`** - Update step progress

### Schemas (`workflow_schemas.py`)

- Pydantic models for request/response validation
- Proper validation for step ordering and naming
- Support for bulk operations

## 🎨 Frontend Implementation

### Settings UI (`components/WorkflowSettings.js`)

Complete workflow customization interface:

- **Workflow Information** - Edit name and description
- **Template Selection** - Choose from predefined templates
- **Step Management** - Add, edit, reorder, and delete steps
- **Drag & Drop** - Reorder steps with drag and drop
- **Categories** - Organize steps by category (Preparation, Tracking, etc.)
- **Required/Optional** - Mark steps as required or optional
- **Enable/Disable** - Temporarily disable steps without deleting

### Dynamic Workflow Hook (`hooks/useWorkflowData.js`)

Replaces static `authoringFields` with dynamic workflow data:

- Loads user's current workflow
- Falls back to static fields if workflow system unavailable
- Provides utility functions for completion checking
- Organizes steps by category

### Song-Specific Workflow (`hooks/useSongWorkflow.js`)

Handles collaboration inheritance:

- Shows songs with **owner's workflow steps** (not viewer's workflow)
- Loads appropriate workflow based on song ownership
- Maintains collaboration context

### Updated Song Card (`components/DynamicWipSongCard.js`)

Enhanced song card with dynamic workflows:

- **Categorized Steps** - Groups steps by category for better organization
- **Step Descriptions** - Shows custom step descriptions on hover
- **Required/Optional Indicators** - Visual distinction between required and optional steps
- **Workflow Ownership** - Shows when using fallback vs. custom workflow
- **Progress Calculation** - Based on dynamic step count

## 🔄 Migration & Backward Compatibility

### Phase 1: Parallel Implementation

- Old system continues to work unchanged
- New workflow system runs alongside
- Users can opt-in to new system from settings

### Phase 2: Migration (Current Implementation)

- Automatic migration of all existing users
- Preservation of all authoring progress
- Fallback to static fields if workflow API fails

### Phase 3: Cleanup (Future)

- Remove old `authoring` table after verification
- Remove static `authoringFields` arrays
- Clean up unused components

## 🎵 Default Workflow

### Standard Workflow (Default)

The single default workflow that matches the current authoring system:

```
Preparation: Demucs → MIDI → Tempo Map → Fake Ending
Tracking: Drums → Bass → Guitar → Vocals → Harmonies → Pro Keys → Keys
Authoring: Animations → Drum Fills → Overdrive
Finishing: Compile
```

All users start with this default workflow and can customize it from settings. Users can:

- Add new steps (e.g., "Preview Video", "Venue Authoring", "Mixing")
- Remove steps they don't use (e.g., "Demucs", "MIDI" for users who don't need stems)
- Reorder steps to match their personal workflow
- Mark steps as optional vs required

## 👥 Collaboration Features

### Workflow Inheritance

- **Song displays based on owner's workflow**, not viewer's workflow
- Collaborators see the same steps as the song owner
- Progress tracking follows owner's workflow requirements

### Permission Model

- **Song owners** can edit their workflow from settings
- **Collaborators** see owner's workflow but can't modify it
- **Step assignments** work with any workflow configuration

## 🚀 Usage Instructions

### For Users

1. **Access Workflow Settings**

   ```
   Settings → Workflow Settings
   ```

2. **Customize Your Workflow**

   - Edit workflow name and description
   - Add new steps with custom names
   - Reorder steps by dragging
   - Set steps as required/optional
   - Organize steps by category
   - Enable/disable steps temporarily

3. **Reset to Default**

   - Click "Reset to Default" to restore the original workflow
   - Existing progress is preserved where possible

4. **View Song Progress**
   - Songs now show progress based on **your** workflow
   - Collaboration songs show progress based on **owner's** workflow
   - Required steps are marked with asterisks
   - Optional steps have dashed borders

### For Developers

1. **Run Migration**

   ```bash
   cd trackflow/backend
   python migrations/custom_workflows_migration.py
   ```

2. **Update Components**

   - Replace `useWipData` with `useWorkflowData` where needed
   - Use `useSongWorkflow` for individual song components
   - Update any components that use static `authoringFields`

3. **Test Thoroughly**
   - Verify migration preserves all data
   - Test workflow customization
   - Test collaboration workflow inheritance
   - Test fallback behavior

## 🔍 Testing Checklist

### Data Migration

- [ ] All existing users have workflows created
- [ ] All authoring progress is preserved
- [ ] No data loss during migration
- [ ] Performance is acceptable with new schema

### Workflow Customization

- [ ] Can create custom workflows from settings
- [ ] Can reorder steps with drag and drop
- [ ] Can add/edit/delete steps
- [ ] Can use predefined templates
- [ ] Changes reflect immediately in song views

### Collaboration Inheritance

- [ ] Collaboration songs show owner's workflow
- [ ] Progress tracking uses owner's requirements
- [ ] Collaborators can't modify owner's workflow
- [ ] Step assignments work with custom workflows

### Fallback Behavior

- [ ] Graceful fallback to static fields if API fails
- [ ] Clear indication when using fallback mode
- [ ] No breaking changes for existing functionality

## 🎉 Benefits

### For Users

- **Complete customization** of authoring workflow
- **Better organization** with categories and descriptions
- **Flexible requirements** with optional steps
- **Template system** for quick setup
- **Collaboration-friendly** with inherited workflows

### For System

- **Scalable architecture** for future workflow features
- **Better data model** with proper relationships
- **Performance optimized** with proper indexing
- **Backward compatible** migration strategy

## 🔮 Future Enhancements

1. **Workflow Sharing** - Share custom workflows between users
2. **Advanced Templates** - Community-contributed workflow templates
3. **Conditional Steps** - Steps that appear based on other step completion
4. **Time Tracking** - Track time spent on each workflow step
5. **Analytics** - Workflow performance and bottleneck analysis
6. **Pack-Specific Workflows** - Different workflows for different types of packs

This implementation provides a robust, scalable foundation for custom workflows while maintaining full backward compatibility and preserving all existing data.
