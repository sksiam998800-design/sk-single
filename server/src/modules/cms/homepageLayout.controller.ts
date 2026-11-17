import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import {
  homepageLayoutSectionSchema,
  homepageLayoutUpdateSchema,
  homepageSectionReorderSchema,
} from './homepageLayout.validation';
import {
  addHomepageLayoutSection,
  deleteHomepageLayoutSection,
  getAdminHomepageLayout,
  publishHomepageLayout,
  reorderHomepageLayoutSections,
  updateAdminHomepageLayoutDraft,
} from './homepageLayout.service';

export async function getHomepageLayoutController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const layout = await getAdminHomepageLayout();
    sendSuccess(res, { layout });
  } catch (err) {
    next(err);
  }
}

export async function updateHomepageLayoutController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = homepageLayoutUpdateSchema.parse(req.body);
    const actorId = req.user?._id ? String(req.user._id) : null;
    const layout = await updateAdminHomepageLayoutDraft(parsed, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'homepage_layout.update_draft',
      resourceType: 'HomepageLayout',
      resourceId: layout.id,
      summary: `Updated homepage draft layout (${parsed.sections.length} sections)`,
    });
    sendSuccess(res, { layout });
  } catch (err) {
    next(err);
  }
}

export async function addHomepageLayoutSectionController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = homepageLayoutSectionSchema.parse(req.body);
    const actorId = req.user?._id ? String(req.user._id) : null;
    const layout = await addHomepageLayoutSection(parsed, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'homepage_layout.add_section',
      resourceType: 'HomepageLayout',
      resourceId: layout.id,
      summary: `Added section "${parsed.title}" (${parsed.sectionType}) to homepage draft`,
    });
    sendCreated(res, { layout });
  } catch (err) {
    next(err);
  }
}

export async function reorderHomepageLayoutSectionsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = homepageSectionReorderSchema.parse(req.body);
    const actorId = req.user?._id ? String(req.user._id) : null;
    const layout = await reorderHomepageLayoutSections(parsed, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'homepage_layout.reorder_sections',
      resourceType: 'HomepageLayout',
      resourceId: layout.id,
      summary: `Reordered ${parsed.order.length} homepage layout sections`,
    });
    sendSuccess(res, { layout });
  } catch (err) {
    next(err);
  }
}

export async function deleteHomepageLayoutSectionController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = req.user?._id ? String(req.user._id) : null;
    const layout = await deleteHomepageLayoutSection(req.params.sectionId, actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'homepage_layout.delete_section',
      resourceType: 'HomepageLayout',
      resourceId: layout.id,
      summary: `Removed section ${req.params.sectionId} from homepage draft`,
    });
    sendSuccess(res, { layout });
  } catch (err) {
    next(err);
  }
}

export async function publishHomepageLayoutController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = req.user?._id ? String(req.user._id) : null;
    const layout = await publishHomepageLayout(actorId);
    await recordAuditLog({
      actor: req.user,
      action: 'homepage_layout.publish',
      resourceType: 'HomepageLayout',
      resourceId: layout.id,
      summary: `Published homepage layout v${String((layout as { layoutVersion?: number }).layoutVersion || 1)}`,
    });
    sendSuccess(res, { layout });
  } catch (err) {
    next(err);
  }
}
