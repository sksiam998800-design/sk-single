import type { Response, NextFunction } from 'express';
import { recordAuditLog, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { integrations } from '../../config/env';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import {
  blogSchema,
  cmsPageSchema,
  faqSchema,
  homepageConfigPatchSchema,
  supportUpdateSchema,
} from './cmsSettings.validation';
import {
  createBlogAdmin,
  createCmsPageAdmin,
  createFaqAdmin,
  deleteBlogAdmin,
  deleteCmsPageAdmin,
  deleteFaqAdmin,
  ensureHomepageConfig,
  listBlogsAdmin,
  listCmsPagesAdmin,
  listFaqsAdmin,
  listSupportEnquiriesAdmin,
  updateBlogAdmin,
  updateCmsPageAdmin,
  updateFaqAdmin,
  updateHomepageConfigAdmin,
  updateSupportEnquiryAdmin,
} from './cmsSettings.service';

export async function getHomepageConfigController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const config = await ensureHomepageConfig();
    sendSuccess(res, { config });
  } catch (err) {
    next(err);
  }
}

export async function updateHomepageConfigController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = homepageConfigPatchSchema.parse(req.body);
    const config = await updateHomepageConfigAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'cms.homepage_update',
      resourceType: 'HomepageConfig',
      summary: 'Updated homepage CMS layout and website configuration',
    });
    sendSuccess(res, { config });
  } catch (err) {
    next(err);
  }
}

export async function getSettingsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const config = await ensureHomepageConfig();
    sendSuccess(res, { config, integrations });
  } catch (err) {
    next(err);
  }
}

export async function updateSettingsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = homepageConfigPatchSchema.parse(req.body);
    const config = await updateHomepageConfigAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'settings.update',
      resourceType: 'HomepageConfig',
      summary: 'Updated store configuration, shipping, payments, tax, or website settings',
    });
    sendSuccess(res, { config });
  } catch (err) {
    next(err);
  }
}

export async function listCmsPagesController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const pages = await listCmsPagesAdmin();
    sendSuccess(res, { pages });
  } catch (err) {
    next(err);
  }
}

export async function createCmsPageController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = cmsPageSchema.parse(req.body);
    const page = await createCmsPageAdmin(parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'cms.page_create',
      resourceType: 'CmsPage',
      resourceId: page.slug,
      summary: `Created CMS page /pages/${page.slug}`,
    });
    sendCreated(res, { page });
  } catch (err) {
    next(err);
  }
}

export async function updateCmsPageController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = cmsPageSchema.parse(req.body);
    const page = await updateCmsPageAdmin(req.params.id, parsed);
    await recordAuditLog({
      actor: req.user,
      action: 'cms.page_update',
      resourceType: 'CmsPage',
      resourceId: page.slug,
      summary: `Updated CMS page /pages/${page.slug}`,
    });
    sendSuccess(res, { page });
  } catch (err) {
    next(err);
  }
}

export async function deleteCmsPageController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteCmsPageAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function listFaqsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const faqs = await listFaqsAdmin();
    sendSuccess(res, { faqs });
  } catch (err) {
    next(err);
  }
}

export async function createFaqController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = faqSchema.parse(req.body);
    const faq = await createFaqAdmin(parsed);
    sendCreated(res, { faq });
  } catch (err) {
    next(err);
  }
}

export async function updateFaqController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = faqSchema.parse(req.body);
    const faq = await updateFaqAdmin(req.params.id, parsed);
    sendSuccess(res, { faq });
  } catch (err) {
    next(err);
  }
}

export async function deleteFaqController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteFaqAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function listBlogsController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const posts = await listBlogsAdmin();
    sendSuccess(res, { posts });
  } catch (err) {
    next(err);
  }
}

export async function createBlogController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = blogSchema.parse(req.body);
    const post = await createBlogAdmin(parsed);
    sendCreated(res, { post });
  } catch (err) {
    next(err);
  }
}

export async function updateBlogController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = blogSchema.parse(req.body);
    const post = await updateBlogAdmin(req.params.id, parsed);
    sendSuccess(res, { post });
  } catch (err) {
    next(err);
  }
}

export async function deleteBlogController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteBlogAdmin(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function listSupportController(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const enquiries = await listSupportEnquiriesAdmin();
    sendSuccess(res, { enquiries });
  } catch (err) {
    next(err);
  }
}

export async function updateSupportController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = supportUpdateSchema.parse(req.body);
    const enquiry = await updateSupportEnquiryAdmin({
      id: req.params.id,
      status: parsed.status,
      internalNote: parsed.internalNote,
      actorName: req.user!.name,
    });
    sendSuccess(res, { enquiry });
  } catch (err) {
    next(err);
  }
}
